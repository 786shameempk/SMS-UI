import { Headset, MailCheck, MessageSquareReply, Smile, Timer } from "lucide-react";
import { Bar as ReBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("dashboard");
  const helpdesk = useTabQuery(source, "helpdesk", dateRange, () => getHelpdeskSummary(resolveDateRange(dateRange)), () => MOCK_HELPDESK);
  const engagement = useTabQuery(source, "engagement", dateRange, () => getEngagementSummary(resolveDateRange(dateRange)), () => MOCK_ENGAGEMENT);

  if (helpdesk.isLoading || engagement.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t("Loading")}>
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
      <EmptyState title={t("You don't have access to this view")} description={t("Ask your school administrator to open Help Desk, Surveys or Communication for your role.")} />
    );
  }
  const surveys = eng?.surveys ?? null;
  const messaging = eng?.messaging ?? null;
  const days = hd?.last14Days.map((d) => ({ ...d, label: dayLabel(d.day, t) })) ?? [];

  return (
    <div className="space-y-5">
      <StatGrid columns={4}>
        {hd && (
          <>
            <StatCard label={t("Open tickets")} icon={Headset} tone={hd.open > 0 ? "info" : "success"} value={hd.open.toLocaleString()} hint={t("{{count}} not assigned yet", { count: hd.unassigned })} />
            <StatCard
              label={t("Past their target")}
              icon={Timer}
              tone={hd.breached > 0 ? "danger" : "success"}
              value={hd.breached.toLocaleString()}
              hint={hd.averageResolutionHours === null ? t("No tickets resolved in this period") : t("Average fix: {{hours}} h", { hours: hd.averageResolutionHours })}
            />
          </>
        )}
        {surveys && (
          <StatCard
            label={t("Satisfaction")}
            icon={Smile}
            tone={(surveys.satisfactionScore ?? 0) >= 4 ? "success" : surveys.satisfactionScore === null ? "neutral" : "warning"}
            value={surveys.satisfactionScore === null ? "—" : `${surveys.satisfactionScore.toFixed(1)} / 5`}
            hint={
              surveys.responsesInRange === 1
                ? t("{{count}} response · {{range}}", { count: surveys.responsesInRange.toLocaleString(), range: rangeLabel })
                : t("{{count}} responses · {{range}}", { count: surveys.responsesInRange.toLocaleString(), range: rangeLabel })
            }
          />
        )}
        {messaging && (
          <StatCard
            label={t("Messages delivered")}
            icon={MailCheck}
            tone={(messaging.deliveryRatePercent ?? 100) >= 95 ? "success" : "warning"}
            value={percent(messaging.deliveryRatePercent, 1)}
            hint={
              messaging.sentInRange === 1
                ? t("{{count}} message sent · {{failed}} failed", { count: messaging.sentInRange, failed: messaging.failedInRange })
                : t("{{count}} messages sent · {{failed}} failed", { count: messaging.sentInRange, failed: messaging.failedInRange })
            }
          />
        )}
      </StatGrid>

      {hd && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title={t("Tickets raised and resolved")} description={t("Last 14 days")} href="/helpdesk" hrefLabel={t("Help Desk")} className="xl:col-span-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={2}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} interval={1} />
                  <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={28} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                  <ReBar dataKey="raised" name={t("Raised")} fill="var(--color-secondary)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <ReBar dataKey="resolved" name={t("Resolved")} fill="var(--color-brand-500)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={t("Response targets")} description={t("Open tickets against the time allowed for their priority")} href="/helpdesk" hrefLabel={t("Tickets")}>
            <BarList
              max={Math.max(...hd.sla.map((s) => s.open), 1)}
              items={hd.sla.map((s) => ({
                key: s.priority,
                label: t("{{priority}} · within {{hours}} h", { priority: t(s.priority), hours: s.targetHours }),
                value: s.open,
                display: s.breached > 0 ? t("{{open}} open · {{late}} late", { open: s.open, late: s.breached }) : t("{{open}} open", { open: s.open }),
                tone: s.breached > 0 ? "danger" : (PRIORITY_TONE[s.priority] ?? "neutral"),
                sub: s.averageResolutionHours === null ? undefined : t("Resolved in {{hours}} h on average", { hours: s.averageResolutionHours }),
              }))}
            />
            <p className="mt-3 text-xs text-muted-foreground">{t("Targets are fixed by priority for every school.")}</p>
          </Panel>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {hd && (
          <Panel title={t("Open tickets by category")} description={t("What people are asking for")} href="/helpdesk" hrefLabel={t("Help Desk")}>
            <BarList items={hd.byCategory.map((c) => ({ key: c.name, label: t(humanize(c.name)), value: c.count, tone: "info" }))} empty={t("No open tickets.")} />
          </Panel>
        )}

        {surveys && (
          <Panel title={t("Surveys")} description={t("{{running}} running · {{draft}} draft · {{closed}} closed", { running: surveys.published, draft: surveys.draft, closed: surveys.closed })} href="/surveys" hrefLabel={t("Surveys")}>
            {surveys.active.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No survey is running.")}</p>
            ) : (
              surveys.active.map((s) => <Row key={s.id} title={s.title} sub={s.closesAt ? t("{{audience}} · closes {{date}}", { audience: t(humanize(s.audience)), date: formatDate(s.closesAt) }) : t(humanize(s.audience))}
                  right={t("{{count}} replies", { count: s.responses.toLocaleString() })} />)
            )}
          </Panel>
        )}

        {messaging && (
          <Panel title={t("Message delivery")} description={t("Sent in {{range}}", { range: rangeLabel.toLowerCase() })} href="/communication" hrefLabel={t("Communication")}>
            <BarList
              max={Math.max(...messaging.byChannel.map((c) => c.delivered + c.failed), 1)}
              items={messaging.byChannel.map((c) => ({
                key: c.channel,
                label: t(humanize(c.channel)),
                value: c.delivered + c.failed,
                display:
                  c.failed > 0
                    ? t("{{delivered}} delivered · {{failed}} failed", { delivered: c.delivered.toLocaleString(), failed: c.failed.toLocaleString() })
                    : t("{{delivered}} delivered", { delivered: c.delivered.toLocaleString() }),
                tone: c.failed > 0 && c.failed / (c.delivered + c.failed) > 0.05 ? "warning" : "success",
              }))}
              empty={t("No messages sent in this period.")}
            />
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquareReply className="h-3.5 w-3.5" aria-hidden="true" />
              {messaging.awaitingTeacherReply === 1
                ? t("{{count}} parent message is waiting for a teacher's reply · {{scheduled}} scheduled", { count: messaging.awaitingTeacherReply, scheduled: messaging.scheduled })
                : t("{{count}} parent messages are waiting for a teacher's reply · {{scheduled}} scheduled", { count: messaging.awaitingTeacherReply, scheduled: messaging.scheduled })}
            </p>
          </Panel>
        )}
      </div>

      {(!hd || !eng || !surveys || !messaging) && <Note>{t("Only the parts of Engagement open to your role are shown.")}</Note>}
    </div>
  );
}
