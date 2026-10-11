import { Headset, MailCheck, MessageSquareReply, Smile, Timer } from "lucide-react";
import { Bar as ReBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getApiErrorStatus } from "@/lib/httpClient";
import { formatDate } from "@/utils/format";
import { resolveDateRange } from "../dateRange";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import { getEngagementSummary, getHelpdeskSummary } from "./api";
import { dayLabel, humanize, percent } from "./format";
import { MOCK_ENGAGEMENT, MOCK_HELPDESK } from "./mock";
import { BarList, Note, Panel, Row, type BarTone, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";

const PRIORITY_TONE: Record<string, BarTone> = { Urgent: "danger", High: "warning", Medium: "info", Low: "neutral" };

function isDenied(error: unknown): boolean {
  return [401, 403].includes(getApiErrorStatus(error) ?? 0);
}

export default function EngagementTab({ source, dateRange, rangeLabel }: TabProps) {
  const helpdesk = useTabQuery(source, "helpdesk", dateRange, () => getHelpdeskSummary(resolveDateRange(dateRange)), () => MOCK_HELPDESK);
  const engagement = useTabQuery(source, "engagement", dateRange, () => getEngagementSummary(resolveDateRange(dateRange)), () => MOCK_ENGAGEMENT);

  if (helpdesk.isLoading || engagement.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const hd = helpdesk.data;
  const eng = engagement.data;
  if (!hd && !eng) {
    return helpdesk.isError && !isDenied(helpdesk.error) ? (
      <ErrorState onRetry={() => { void helpdesk.refetch(); void engagement.refetch(); }} retrying={helpdesk.isRefetching || engagement.isRefetching} />
    ) : (
      <EmptyState title="You don't have access to this view" description="Ask your school administrator to open Help Desk, Surveys or Communication for your role." />
    );
  }
  const surveys = eng?.surveys ?? null;
  const messaging = eng?.messaging ?? null;
  const days = hd?.last14Days.map((d) => ({ ...d, label: dayLabel(d.day) })) ?? [];

  return (
    <div className="space-y-5">
      <StatGrid columns={4}>
        {hd && (
          <>
            <StatCard label="Open tickets" icon={Headset} tone={hd.open > 0 ? "info" : "success"} value={hd.open.toLocaleString()} hint={`${hd.unassigned} not assigned yet`} />
            <StatCard
              label="Past their target"
              icon={Timer}
              tone={hd.breached > 0 ? "danger" : "success"}
              value={hd.breached.toLocaleString()}
              hint={hd.averageResolutionHours === null ? "No tickets resolved in this period" : `Average fix: ${hd.averageResolutionHours} h`}
            />
          </>
        )}
        {surveys && (
          <StatCard
            label="Satisfaction"
            icon={Smile}
            tone={(surveys.satisfactionScore ?? 0) >= 4 ? "success" : surveys.satisfactionScore === null ? "neutral" : "warning"}
            value={surveys.satisfactionScore === null ? "—" : `${surveys.satisfactionScore.toFixed(1)} / 5`}
            hint={`${surveys.responsesInRange.toLocaleString()} response${surveys.responsesInRange === 1 ? "" : "s"} · ${rangeLabel}`}
          />
        )}
        {messaging && (
          <StatCard
            label="Messages delivered"
            icon={MailCheck}
            tone={(messaging.deliveryRatePercent ?? 100) >= 95 ? "success" : "warning"}
            value={percent(messaging.deliveryRatePercent, 1)}
            hint={`${messaging.sentInRange} message${messaging.sentInRange === 1 ? "" : "s"} sent · ${messaging.failedInRange} failed`}
          />
        )}
      </StatGrid>

      {hd && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Tickets raised and resolved" description="Last 14 days" href="/helpdesk" hrefLabel="Help Desk" className="xl:col-span-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={2}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} interval={1} />
                  <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={28} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                  <ReBar dataKey="raised" name="Raised" fill="var(--color-secondary)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <ReBar dataKey="resolved" name="Resolved" fill="var(--color-brand-500)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Response targets" description="Open tickets against the time allowed for their priority" href="/helpdesk" hrefLabel="Tickets">
            <BarList
              max={Math.max(...hd.sla.map((s) => s.open), 1)}
              items={hd.sla.map((s) => ({
                key: s.priority,
                label: `${s.priority} · within ${s.targetHours} h`,
                value: s.open,
                display: s.breached > 0 ? `${s.open} open · ${s.breached} late` : `${s.open} open`,
                tone: s.breached > 0 ? "danger" : (PRIORITY_TONE[s.priority] ?? "neutral"),
                sub: s.averageResolutionHours === null ? undefined : `Resolved in ${s.averageResolutionHours} h on average`,
              }))}
            />
            <p className="mt-3 text-xs text-muted-foreground">Targets are fixed by priority for every school.</p>
          </Panel>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {hd && (
          <Panel title="Open tickets by category" description="What people are asking for" href="/helpdesk" hrefLabel="Help Desk">
            <BarList items={hd.byCategory.map((c) => ({ key: c.name, label: humanize(c.name), value: c.count, tone: "info" }))} empty="No open tickets." />
          </Panel>
        )}

        {surveys && (
          <Panel title="Surveys" description={`${surveys.published} running · ${surveys.draft} draft · ${surveys.closed} closed`} href="/surveys" hrefLabel="Surveys">
            {surveys.active.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No survey is running.</p>
            ) : (
              surveys.active.map((s) => <Row key={s.id} title={s.title} sub={`${humanize(s.audience)}${s.closesAt ? ` · closes ${formatDate(s.closesAt)}` : ""}`} right={`${s.responses.toLocaleString()} replies`} />)
            )}
          </Panel>
        )}

        {messaging && (
          <Panel title="Message delivery" description={`Sent in ${rangeLabel.toLowerCase()}`} href="/communication" hrefLabel="Communication">
            <BarList
              max={Math.max(...messaging.byChannel.map((c) => c.delivered + c.failed), 1)}
              items={messaging.byChannel.map((c) => ({
                key: c.channel,
                label: humanize(c.channel),
                value: c.delivered + c.failed,
                display: c.failed > 0 ? `${c.delivered.toLocaleString()} delivered · ${c.failed.toLocaleString()} failed` : `${c.delivered.toLocaleString()} delivered`,
                tone: c.failed > 0 && c.failed / (c.delivered + c.failed) > 0.05 ? "warning" : "success",
              }))}
              empty="No messages sent in this period."
            />
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquareReply className="h-3.5 w-3.5" aria-hidden="true" />
              {messaging.awaitingTeacherReply} parent message{messaging.awaitingTeacherReply === 1 ? " is" : "s are"} waiting for a teacher&apos;s reply · {messaging.scheduled} scheduled
            </p>
          </Panel>
        )}
      </div>

      {(!hd || !eng || !surveys || !messaging) && <Note>Only the parts of Engagement open to your role are shown.</Note>}
    </div>
  );
}
