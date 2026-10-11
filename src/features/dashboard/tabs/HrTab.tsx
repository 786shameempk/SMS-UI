import { CalendarOff, FileWarning, UserCheck, UserMinus, Users } from "lucide-react";
import { Bar as ReBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const query = useTabQuery(source, "hr", dateRange, () => getHrSummary(resolveDateRange(dateRange)), () => MOCK_HR);
  return (
    <TabBody query={query}>
      {(d) => {
        const a = d.attendanceToday;
        const chart = d.months.map((m) => ({ ...m, label: monthLabel(m.month) }));
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard label="Active staff" icon={Users} tone="brand" value={d.activeStaff.toLocaleString()} hint={`${d.joinedInRange} joined · ${d.leftInRange} left · ${rangeLabel}`} />
              <StatCard
                label="Present today"
                icon={UserCheck}
                tone={a.marked === 0 ? "neutral" : (a.percent ?? 0) >= 90 ? "success" : "warning"}
                value={a.marked === 0 ? "—" : percent(a.percent)}
                hint={a.marked === 0 ? "Staff attendance not marked yet" : `${a.present + a.late} of ${a.marked} marked · ${a.absent} absent`}
              />
              <StatCard label="On leave today" icon={CalendarOff} tone="info" value={d.onLeaveToday.toLocaleString()} hint={`${d.pendingLeaveRequests} request${d.pendingLeaveRequests === 1 ? "" : "s"} waiting for a decision`} />
              <StatCard
                label="Records to complete"
                icon={FileWarning}
                tone={d.staffWithoutDocuments > 0 ? "warning" : "success"}
                value={d.staffWithoutDocuments.toLocaleString()}
                hint="Staff with no documents on file"
              />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Staff by department" description="Active and on-leave staff" href="/staff" hrefLabel="Staff" className="xl:col-span-1">
                <BarList items={d.byDepartment.map((x) => ({ key: x.name, label: x.name, value: x.count, tone: "brand" }))} empty="No staff yet." />
              </Panel>

              <Panel title="Joiners and leavers" description="By month" className="xl:col-span-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                      <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={28} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                      <ReBar dataKey="joined" name="Joined" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <ReBar dataKey="left" name="Left" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Panel title="Away in the next 14 days" description="Approved leave, soonest first" href="/staff" hrefLabel="Leave requests" className="xl:col-span-2">
                {d.outNext14Days.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nobody is booked off in the next two weeks.</p>
                ) : (
                  d.outNext14Days.map((l) => (
                    <Row
                      key={`${l.staffId}-${l.fromDate}`}
                      title={l.name}
                      sub={`${l.department} · ${humanize(l.leaveType)} leave`}
                      right={l.fromDate === l.toDate ? formatDate(l.fromDate) : `${formatDate(l.fromDate)} – ${formatDate(l.toDate)}`}
                      href={`/staff/${l.staffId}`}
                    />
                  ))
                )}
              </Panel>

              <Panel title="Roles and leave types" description="Who we employ, and what leave is booked">
                <div className="space-y-5">
                  <BarList items={d.byDesignation.slice(0, 5).map((x) => ({ key: x.name, label: humanize(x.name), value: x.count, tone: "info" }))} empty="No staff yet." />
                  {d.leaveByType.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <UserMinus className="h-3.5 w-3.5" aria-hidden="true" /> Approved leave still to come or under way
                      </p>
                      <BarList items={d.leaveByType.map((x) => ({ key: x.name, label: humanize(x.name), value: x.count, tone: "warning" }))} />
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
