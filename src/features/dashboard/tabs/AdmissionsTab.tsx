import { ClipboardList, DoorOpen, GraduationCap, UserCheck, UserPlus } from "lucide-react";
import { Bar as ReBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { resolveDateRange } from "../dateRange";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import { getAdmissionsSummary } from "./api";
import { humanize, monthLabel, percent, share } from "./format";
import { MOCK_ADMISSIONS } from "./mock";
import { BarList, Facts, Panel, TabBody, type BarTone, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";

function seatTone(used: number, capacity: number): BarTone {
  if (capacity <= 0) return "neutral";
  const u = used / capacity;
  return u >= 1 ? "danger" : u >= 0.9 ? "warning" : "success";
}

export default function AdmissionsTab({ source, dateRange, rangeLabel }: TabProps) {
  const { t } = useTranslation("dashboard");
  const query = useTabQuery(source, "admissions", dateRange, () => getAdmissionsSummary(resolveDateRange(dateRange)), () => MOCK_ADMISSIONS);
  return (
    <TabBody query={query}>
      {(d) => {
        const first = d.funnel[0]?.count ?? 0;
        const free = Math.max(0, d.totalCapacity - d.activeStudents);
        const chart = d.months.map((m) => ({ ...m, label: monthLabel(m.month, t) }));
        const genderTotal = d.gender.reduce((s, g) => s + g.count, 0);
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard label={t("Applications")} icon={ClipboardList} tone="info" value={d.applicationsInRange.toLocaleString()} hint={rangeLabel} />
              <StatCard
                label={t("Enrolled")}
                icon={UserCheck}
                tone="success"
                value={d.enrolledInRange.toLocaleString()}
                hint={d.conversionPercent === null ? t("No applications yet") : t("{{percent}} of applications", { percent: percent(d.conversionPercent) })}
              />
              <StatCard
                label={t("Still in progress")}
                icon={UserPlus}
                tone="warning"
                value={d.openApplications.toLocaleString()}
                hint={t("{{exams}} · {{interviews}} to come", {
                  exams: d.examsScheduled === 1 ? t("{{count}} exam", { count: d.examsScheduled }) : t("{{count}} exams", { count: d.examsScheduled }),
                  interviews: d.interviewsScheduled === 1 ? t("{{count}} interview", { count: d.interviewsScheduled }) : t("{{count}} interviews", { count: d.interviewsScheduled }),
                })}
              />
              <StatCard
                label={t("Seats free")}
                icon={DoorOpen}
                tone={free === 0 ? "danger" : "brand"}
                value={free.toLocaleString()}
                hint={t("{{students}} students of {{seats}} seats", { students: d.activeStudents.toLocaleString(), seats: d.totalCapacity.toLocaleString() })}
              />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title={t("Admission funnel")} description={t("Applicants who reached each stage")} href="/students" hrefLabel={t("Admissions")} className="xl:col-span-1">
                <BarList
                  items={d.funnel.map((f, i) => ({
                    key: f.stage,
                    label: t(humanize(f.stage)),
                    value: f.count,
                    display: i === 0 ? f.count.toLocaleString() : `${f.count.toLocaleString()} · ${share(f.count, first)}%`,
                    tone: f.stage === "Enrolled" ? "success" : "brand",
                  }))}
                  empty={t("No applications yet.")}
                />
                {d.admissionFeesPending > 0 && (
                  <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-strong">
                    {d.admissionFeesPending === 1
                      ? t("{{count}} applicant is at fee collection and still to pay the admission fee.", { count: d.admissionFeesPending })
                      : t("{{count}} applicants are at fee collection and still to pay the admission fee.", { count: d.admissionFeesPending })}
                  </p>
                )}
              </Panel>

              <Panel title={t("Seats against capacity")} description={t("Students enrolled per class, and open applications waiting")} href="/academics" hrefLabel={t("Classes")} className="xl:col-span-2">
                <BarList
                  max={Math.max(...d.seats.map((s) => Math.max(s.capacity, s.students)), 1)}
                  items={d.seats.map((s) => ({
                    key: s.className,
                    label: s.className,
                    value: s.students,
                    display: s.capacity > 0 ? t("{{students}} / {{capacity}} seats", { students: s.students, capacity: s.capacity }) : t("{{count}} students", { count: s.students }),
                    tone: seatTone(s.students, s.capacity),
                    sub:
                      s.applications > 0
                        ? (s.applications === 1 ? t("{{count}} open application", { count: s.applications }) : t("{{count}} open applications", { count: s.applications })) +
                          (s.capacity > 0 && s.students >= s.capacity ? t(" · class is full") : "")
                        : undefined,
                  }))}
                  empty={t("Classes will appear here once sections have a capacity.")}
                />
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Panel title={t("Applications by month")} description={t("Received and enrolled")} className="xl:col-span-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                      <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={32} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                      <ReBar dataKey="applications" name={t("Applications")} fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      <ReBar dataKey="enrolled" name={t("Enrolled")} fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title={t("Who is in school")} description={t("Current students and those who have left")} href="/students" hrefLabel={t("Students")}>
                <div className="space-y-5">
                  <BarList
                    items={d.gender.map((g) => ({ key: g.name, label: t(humanize(g.name)), value: g.count, display: `${g.count.toLocaleString()} · ${share(g.count, genderTotal)}%`, tone: "info" }))}
                    empty={t("No active students.")}
                  />
                  <Facts
                    items={[
                      { label: t("Transferred out"), value: d.transfersInRange.toLocaleString() },
                      { label: t("Graduated (all time)"), value: d.graduatedTotal.toLocaleString() },
                      { label: t("Active"), value: d.activeStudents.toLocaleString(), tone: "success" },
                    ]}
                  />
                </div>
              </Panel>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Transfers are counted by the date recorded on the student's transfer record, within {{range}}.", { range: rangeLabel.toLowerCase() })}
            </p>
          </div>
        );
      }}
    </TabBody>
  );
}
