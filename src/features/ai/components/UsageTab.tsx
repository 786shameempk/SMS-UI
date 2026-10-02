import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Coins, Gauge, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { listUsers } from "@/features/administration/users/api";
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import { getAiUsage } from "../usage/api";
import { featureLabel } from "../usage/constants";
import type { UsageBucket } from "../usage/types";

type Range = "7" | "30" | "month";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function rangeDates(range: Range) {
  const to = new Date();
  const from = new Date(to);
  if (range === "month") from.setUTCDate(1);
  else from.setUTCDate(to.getUTCDate() - Number(range) + 1);
  return { from: iso(from), to: iso(to) };
}

const number = (n: number) => n.toLocaleString();
const money = (n: number) => (n > 0 && n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`);

/** Every day in the range, so quiet days show as zero instead of disappearing from the chart. */
function fillDays(from: string, to: string, days: UsageBucket[]) {
  const byKey = new Map(days.map((d) => [d.key, d]));
  const out: { day: string; requests: number }[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); iso(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = iso(d);
    out.push({ day: key.slice(5), requests: byKey.get(key)?.requests ?? 0 });
  }
  return out;
}

function BucketTable({ caption, rows, label }: { caption: string; rows: UsageBucket[]; label: (key: string) => string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No requests in this period.</p>;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-1 font-medium">{caption}</th>
          <th className="py-1 text-right font-medium">Requests</th>
          <th className="py-1 text-right font-medium">Tokens</th>
          <th className="py-1 text-right font-medium">Est. cost</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-border/70">
            <td className="max-w-[14rem] truncate py-1.5">{label(r.key)}</td>
            <td className="py-1.5 text-right tabular-nums">{number(r.requests)}</td>
            <td className="py-1.5 text-right tabular-nums">{number(r.tokens)}</td>
            <td className="py-1.5 text-right tabular-nums">{money(r.cost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** School AI usage for admins: volume, tokens, estimated cost, the monthly allowance, and who uses which feature. */
export default function UsageTab() {
  const [range, setRange] = useState<Range>("30");
  const { from, to } = useMemo(() => rangeDates(range), [range]);

  const usage = useQuery({ queryKey: ["ai", "usage", from, to], queryFn: () => getAiUsage(from, to) });
  // Names for the per-user table; if the user list is not available the id is shown instead.
  const users = useQuery({ queryKey: ["administration", "users"], queryFn: listUsers, retry: false });
  const userLabel = (id: string) => {
    const u = users.data?.find((x) => x.id === id);
    return u ? `${u.name} (${u.email})` : `User ${id.slice(0, 8)}`;
  };

  const u = usage.data;
  const limits = u?.limits;
  const monthPct = limits && limits.monthlyTokenLimitPerSchool > 0 ? Math.min(100, (limits.monthTokensUsed / limits.monthlyTokenLimitPerSchool) * 100) : 0;
  const days = useMemo(() => (u ? fillDays(from, to, u.byDay) : []), [u, from, to]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-48" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {usage.isLoading ? (
        <LoadingState label="Loading AI usage…" />
      ) : usage.isError || !u ? (
        <ErrorState title="Couldn't load AI usage" description={usage.error instanceof Error ? usage.error.message : undefined} onRetry={() => usage.refetch()} />
      ) : (
        <>
          <StatGrid columns={4}>
            <StatCard label="AI requests" value={number(u.requests)} icon={Activity} tone="brand" hint={u.failed ? `${number(u.failed)} failed` : "none failed"} />
            <StatCard label="Tokens" value={number(u.totalTokens)} icon={Gauge} tone="info" hint={`${number(u.inputTokens)} in · ${number(u.outputTokens)} out`} />
            <StatCard label="Estimated cost (USD)" value={money(u.estimatedCost)} icon={Coins} tone="warning" hint="From the configured model prices" />
            <StatCard label="Average response" value={`${(u.averageDurationMs / 1000).toFixed(1)} s`} icon={Timer} tone="neutral" />
          </StatGrid>

          {limits && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly allowance</CardTitle>
                <CardDescription>
                  School tokens used this month. Each user may also make up to {number(limits.dailyRequestsPerUser)} AI requests a day and {number(limits.requestsPerMinutePerUser)} a minute.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Monthly tokens used"
                  aria-valuenow={Math.round(monthPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className={monthPct >= 90 ? "h-full bg-destructive" : monthPct >= 75 ? "h-full bg-warning" : "h-full bg-primary"} style={{ width: `${monthPct}%` }} />
                </div>
                <p className="text-sm tabular-nums">
                  {number(limits.monthTokensUsed)} of {number(limits.monthlyTokenLimitPerSchool)} tokens ({Math.round(monthPct)}%)
                  {monthPct >= 90 && <span className="ml-2 text-destructive">AI requests stop at 100% until next month.</span>}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Requests per day</CardTitle>
              <CardDescription>
                {from} to {to}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {u.requests === 0 ? (
                <EmptyState bare size="sm" icon={Activity} title="No AI requests in this period" className="h-56" />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={days}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="day" tick={CHART_TICK} tickLine={false} axisLine={false} minTickGap={12} />
                      <YAxis allowDecimals={false} tick={CHART_TICK} tickLine={false} axisLine={false} width={32} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--color-secondary)" }} formatter={(v) => [v, "Requests"]} />
                      <Bar dataKey="requests" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By feature</CardTitle>
              </CardHeader>
              <CardContent>
                <BucketTable caption="Feature" rows={u.byFeature} label={featureLabel} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top users</CardTitle>
                <CardDescription>The 20 users with the most tokens in this period.</CardDescription>
              </CardHeader>
              <CardContent>
                <BucketTable caption="User" rows={u.byUser} label={userLabel} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
