import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarCheck, CircleCheck, Headset, Percent, UserPlus, Users, Wallet } from "lucide-react";
import { Bar as ReBar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/authStore";
import { resolveDateRange } from "../dateRange";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import { canSwitchScopeView } from "../scopeApi";
import { getExecutiveData } from "./api";
import { attentionItems, feeCollectionPercent } from "./executive";
import { compactInr, monthLabel, percent } from "./format";
import { MOCK_EXECUTIVE } from "./mock";
import FeeDefaultersPanel from "./FeeDefaultersPanel";
import { BarList, Note, Panel, Row, TabBody, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";

export default function ExecutiveTab({ source, dateRange, rangeLabel }: TabProps) {
  const { t } = useTranslation("dashboard");
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const allBranches = canSwitchScopeView(user);
  const query = useTabQuery(
    source,
    "executive",
    dateRange,
    () => getExecutiveData(resolveDateRange(dateRange), tenantId, allBranches),
    () => MOCK_EXECUTIVE,
  );
  return (
    <TabBody query={query} skeletonCards={6}>
      {(d) => {
        const attention = attentionItems(d, t);
        const feePct = feeCollectionPercent(d.fees);
        const today = d.academic?.today;
        const previous = d.academic?.previousSchoolDay;
        const attendanceDelta = today?.percent != null && previous?.percent != null ? Math.round((today.percent - previous.percent) * 10) / 10 : null;
        const feeChart = (d.fees?.months ?? []).map((m) => ({ ...m, label: monthLabel(m.month, t) }));
        const resultsChart = (d.academic?.performance ?? []).map((m) => ({ ...m, label: monthLabel(m.month, t) }));
        const branches = d.branches ?? [];
        const maxStudents = Math.max(...branches.map((b) => b.students), 1);
        const maxFees = Math.max(...branches.map((b) => b.feesCollected), 1);
        return (
          <div className="space-y-5">
            <StatGrid columns={3}>
              {today && (
                <StatCard
                  label={t("Attendance today")}
                  icon={CalendarCheck}
                  tone={today.marked === 0 ? "neutral" : (today.percent ?? 0) >= 90 ? "success" : (today.percent ?? 0) >= 85 ? "warning" : "danger"}
                  value={today.marked === 0 ? "—" : percent(today.percent, 1)}
                  hint={today.marked === 0 ? t("Not marked yet") : t("{{attended}} of {{marked}} in school", { attended: today.attended, marked: today.marked })}
                  trend={
                    attendanceDelta === null || attendanceDelta === 0
                      ? undefined
                      : { value: t("{{value}} pt", { value: Math.abs(attendanceDelta) }), direction: attendanceDelta > 0 ? "up" : "down", label: t("vs the last school day") }
                  }
                />
              )}
              {d.fees && (
                <StatCard
                  label={t("Fees collected")}
                  icon={Wallet}
                  tone={feePct === null ? "neutral" : feePct >= 80 ? "success" : feePct >= 60 ? "warning" : "danger"}
                  value={compactInr(d.fees.collectedInRange)}
                  hint={feePct === null ? rangeLabel : t("{{percent}}% of what fell due · {{pending}} pending", { percent: feePct, pending: compactInr(d.fees.pending) })}
                />
              )}
              {d.academics && (
                <StatCard
                  label={t("Pass rate")}
                  icon={Percent}
                  tone={d.academics.results === 0 ? "neutral" : d.academics.passRate >= 90 ? "success" : d.academics.passRate >= 75 ? "warning" : "danger"}
                  value={d.academics.results === 0 ? "—" : `${d.academics.passRate}%`}
                  hint={d.academics.results === 0 ? t("No results in this period") : t("Average score {{score}}%", { score: d.academics.averageScore })}
                />
              )}
              {d.admissions && (
                <StatCard
                  label={t("Enrolled")}
                  icon={UserPlus}
                  tone="info"
                  value={d.admissions.enrolledInRange.toLocaleString()}
                  hint={t("{{applications}} applications · {{percent}} converted", { applications: d.admissions.applicationsInRange.toLocaleString(), percent: percent(d.admissions.conversionPercent) })}
                />
              )}
              {d.hr && (
                <StatCard
                  label={t("Staff on leave")}
                  icon={Users}
                  tone={d.hr.onLeaveToday > 0 ? "warning" : "success"}
                  value={`${d.hr.onLeaveToday} / ${d.hr.activeStaff}`}
                  hint={d.hr.attendanceToday.marked === 0 ? t("Staff attendance not marked yet") : t("{{percent}} staff present", { percent: percent(d.hr.attendanceToday.percent) })}
                />
              )}
              {d.helpdesk && (
                <StatCard
                  label={t("Open complaints")}
                  icon={Headset}
                  tone={d.helpdesk.breached > 0 ? "danger" : d.helpdesk.open > 0 ? "info" : "success"}
                  value={d.helpdesk.open.toLocaleString()}
                  hint={d.helpdesk.breached > 0 ? t("{{count}} past the response target", { count: d.helpdesk.breached }) : t("All within target")}
                />
              )}
            </StatGrid>

            <Panel title={t("Needs your attention")} description={attention.length ? t("Worst first") : undefined}>
              {attention.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                  <CircleCheck className="h-4 w-4 text-success" aria-hidden="true" /> {t("Nothing needs your attention right now.")}
                </p>
              ) : (
                <ul className="grid gap-2 md:grid-cols-2">
                  {attention.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={a.to}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          a.tone === "danger" ? "bg-destructive-soft text-destructive-strong" : "bg-warning-soft text-warning-strong",
                        )}
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {a.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              {d.fees && (
                <Panel title={t("Fees collected vs falling due")} description={t("Per month · {{range}}", { range: rangeLabel })} href="/fees" hrefLabel={t("Fees")}>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={feeChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
                        <CartesianGrid {...CHART_GRID} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                        <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={56} tickFormatter={(v: number) => compactInr(v)} />
                        <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => compactInr(Number(v))} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                        <ReBar dataKey="expected" name={t("Falling due")} fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                        <ReBar dataKey="collected" name={t("Collected")} fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              )}
              {d.academic && (
                <Panel title={t("Results trend")} description={t("Average score and pass rate · {{range}}", { range: rangeLabel })} href="/examinations" hrefLabel={t("Examinations")}>
                  {resultsChart.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">{t("No results in this period.")}</p>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={resultsChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                          <CartesianGrid {...CHART_GRID} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                          <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={36} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                          <Line dataKey="averageScore" name={t("Average score")} type="monotone" stroke="var(--color-brand-500)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line dataKey="passRate" name={t("Pass rate")} type="monotone" stroke="var(--color-success)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Panel>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {branches.length > 1 && (
                <Panel title={t("Branch comparison")} description={t("Students and fees collected, per branch")} href="/admin/branches" hrefLabel={t("Branches")}>
                  <div className="space-y-5">
                    <BarList
                      max={maxStudents}
                      items={branches.map((b) => ({
                        key: `s-${b.id}`,
                        label: b.name,
                        value: b.students,
                        display: t("{{count}} students", { count: b.students.toLocaleString() }),
                        tone: b.failed ? "neutral" : "brand",
                        sub: t("{{count}} staff", { count: b.staff }),
                      }))}
                    />
                    <BarList
                      max={maxFees}
                      items={branches.map((b) => ({
                        key: `f-${b.id}`,
                        label: t("{{branch}} · fees", { branch: b.name }),
                        value: b.feesCollected,
                        display: compactInr(b.feesCollected),
                        tone: b.overdueInvoices > 0 ? "warning" : "success",
                        sub: t("{{pending}} pending · {{overdue}} overdue", { pending: compactInr(b.feesPending), overdue: b.overdueInvoices }),
                      }))}
                    />
                  </div>
                </Panel>
              )}

              {d.academics && (
                <Panel title={t("Students at risk")} description={t("Low scores or poor attendance")} href="/students" hrefLabel={t("Students")}>
                  {d.academics.needingSupport.length === 0 && d.academics.chronicAbsentees.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("No student is flagged right now.")}</p>
                  ) : (
                    <>
                      {d.academics.needingSupport.slice(0, 3).map((s) => (
                        <Row
                          key={`s-${s.studentId}`}
                          title={s.name}
                          sub={t("{{class}} · low scores", { class: s.classLabel })}
                          right={t("{{score}}% avg", { score: s.averageScore })}
                          href={`/students/${s.studentId}`}
                        />
                      ))}
                      {d.academics.chronicAbsentees.slice(0, 3).map((s) => (
                        <Row
                          key={`a-${s.studentId}`}
                          title={s.name}
                          sub={t("{{class}} · {{days}} days absent", { class: s.classLabel, days: s.daysAbsent })}
                          right={t("{{percent}}% attended", { percent: s.attendancePercent })}
                          href={`/students/${s.studentId}`}
                        />
                      ))}
                    </>
                  )}
                </Panel>
              )}

              {d.fees && <FeeDefaultersPanel source={source} dateRange={dateRange} />}
            </div>

            {d.failed.length > 0 && <Note>{t("Some figures couldn't be loaded ({{parts}}). Refresh to try again.", { parts: d.failed.map((f) => t(f)).join(", ") })}</Note>}
          </div>
        );
      }}
    </TabBody>
  );
}
