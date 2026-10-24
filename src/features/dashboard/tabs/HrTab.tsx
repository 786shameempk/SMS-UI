import { CalendarOff, FileWarning, UserCheck, UserMinus, Users } from "lucide-react";
import { Bar as ReBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { formatDate } from "@/utils/format";
import { resolveDateRange } from "../dateRange";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import { getHrSummary } from "./api";
import { humanize, monthLabel, percent } from "./format";
import { MOCK_HR } from "./mock";
import { BarList, Panel, Row, TabBody, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";

export default function HrTab({ source, dateRange, rangeLabel }: TabProps) {
  const { t } = useTranslation("dashboard");
  const query = useTabQuery(source, "hr", dateRange, () => getHrSummary(resolveDateRange(dateRange)), () => MOCK_HR);
  return (
    <TabBody query={query}>
      {(d) => {
        const a = d.attendanceToday;
        const chart = d.months.map((m) => ({ ...m, label: monthLabel(m.month, t) }));
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard label={t("Active staff")} icon={Users} tone="brand" value={d.activeStaff.toLocaleString()} hint={t("{{joined}} joined · {{left}} left · {{range}}", { joined: d.joinedInRange, left: d.leftInRange, range: rangeLabel })} />
              <StatCard
                label={t("Present today")}
                icon={UserCheck}
                tone={a.marked === 0 ? "neutral" : (a.percent ?? 0) >= 90 ? "success" : "warning"}
                value={a.marked === 0 ? "—" : percent(a.percent)}
                hint={a.marked === 0 ? t("Staff attendance not marked yet") : t("{{present}} of {{marked}} marked · {{absent}} absent", { present: a.present + a.late, marked: a.marked, absent: a.absent })}
              />
              <StatCard label={t("On leave today")} icon={CalendarOff} tone="info" value={d.onLeaveToday.toLocaleString()} hint={
                  d.pendingLeaveRequests === 1
                    ? t("{{count}} request waiting for a decision", { count: d.pendingLeaveRequests })
                    : t("{{count}} requests waiting for a decision", { count: d.pendingLeaveRequests })
                } />
              <StatCard
                label={t("Records to complete")}
                icon={FileWarning}
                tone={d.staffWithoutDocuments > 0 ? "warning" : "success"}
                value={d.staffWithoutDocuments.toLocaleString()}
                hint={t("Staff with no documents on file")}
              />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title={t("Staff by department")} description={t("Active and on-leave staff")} href="/staff" hrefLabel={t("Staff")} className="xl:col-span-1">
                <BarList items={d.byDepartment.map((x) => ({ key: x.name, label: x.name, value: x.count, tone: "brand" }))} empty={t("No staff yet.")} />
              </Panel>

              <Panel title={t("Joiners and leavers")} description={t("By month")} className="xl:col-span-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                      <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={28} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                      <ReBar dataKey="joined" name={t("Joined")} fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <ReBar dataKey="left" name={t("Left")} fill="var(--color-destructive)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Panel title={t("Away in the next 14 days")} description={t("Approved leave, soonest first")} href="/staff" hrefLabel={t("Leave requests")} className="xl:col-span-2">
                {d.outNext14Days.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t("Nobody is booked off in the next two weeks.")}</p>
                ) : (
                  d.outNext14Days.map((l) => (
                    <Row
                      key={`${l.staffId}-${l.fromDate}`}
                      title={l.name}
                      sub={t("{{department}} · {{leaveType}} leave", { department: l.department, leaveType: t(humanize(l.leaveType)) })}
                      right={l.fromDate === l.toDate ? formatDate(l.fromDate) : `${formatDate(l.fromDate)} – ${formatDate(l.toDate)}`}
                      href={`/staff/${l.staffId}`}
                    />
                  ))
                )}
              </Panel>

              <Panel title={t("Roles and leave types")} description={t("Who we employ, and what leave is booked")}>
                <div className="space-y-5">
                  <BarList items={d.byDesignation.slice(0, 5).map((x) => ({ key: x.name, label: t(humanize(x.name)), value: x.count, tone: "info" }))} empty={t("No staff yet.")} />
                  {d.leaveByType.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <UserMinus className="h-3.5 w-3.5" aria-hidden="true" /> {t("Approved leave still to come or under way")}
                      </p>
                      <BarList items={d.leaveByType.map((x) => ({ key: x.name, label: t(humanize(x.name)), value: x.count, tone: "warning" }))} />
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        );
      }}
    </TabBody>
  );
}
