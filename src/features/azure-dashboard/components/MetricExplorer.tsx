import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import { useAzureMetricDefinitions, useAzureMetrics } from "../hooks";
import type { MetricSeries } from "../types";
import { bytes } from "../utils";
import { QueryBoundary } from "./AzureUi";

const RANGES = [
  { value: "1", label: "1 hour" },
  { value: "6", label: "6 hours" },
  { value: "24", label: "24 hours" },
  { value: "168", label: "7 days" },
] as const;

/** Suggested first picks per resource type; only names Azure actually lists for the resource are ever used. */
const PREFERRED = ["Percentage CPU", "cpu_percent", "UsedCapacity", "StorageUsed", "Availability", "Transactions"];

function formatValue(unit: string | null, value: number | null): string {
  if (value === null) return "—";
  if (unit === "Bytes") return bytes(value);
  if (unit === "Percent") return `${value.toFixed(1)}%`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function ChartBody({ series, hours }: { series: MetricSeries; hours: number }) {
  const data = series.points.map((p) => ({ time: p.time, value: p.average ?? p.total }));
  const hasData = data.some((d) => d.value !== null);
  if (!hasData) return <EmptyState size="sm" bare title="No data in this period" description="Azure returned no samples for this metric." />;

  const average = data.filter((d) => d.value !== null).reduce((sum, d, _, all) => sum + (d.value as number) / all.length, 0);
  const max = Math.max(...data.map((d) => d.value ?? 0));
  const tick = (iso: string) =>
    new Date(iso).toLocaleString(undefined, hours > 24 ? { day: "numeric", month: "short" } : { hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Latest</dt><dd className="font-semibold tabular-nums">{formatValue(series.unit, series.latestAverage ?? series.points.at(-1)?.total ?? null)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Average</dt><dd className="font-semibold tabular-nums">{formatValue(series.unit, average)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Peak</dt><dd className="font-semibold tabular-nums">{formatValue(series.unit, max)}</dd></div>
      </dl>
      <div className="h-64" role="img" aria-label={`${series.name} over the last ${hours} hours`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="time" tickFormatter={tick} tick={CHART_TICK} tickLine={false} axisLine={false} minTickGap={32} />
            <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatValue(series.unit, v)} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(l) => new Date(String(l)).toLocaleString()} formatter={(v) => [formatValue(series.unit, Number(v)), series.name]} />
            <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Pick a metric Azure exposes for the resource and a time range, and chart it. Nothing is shown that Azure doesn't report. */
export default function MetricExplorer({ resourceId }: { resourceId: string }) {
  const definitions = useAzureMetricDefinitions(resourceId);
  const [chosen, setChosen] = useState("");
  const [hours, setHours] = useState("24");

  const names = useMemo(() => definitions.data ?? [], [definitions.data]);
  // The user's pick if Azure still lists it, otherwise a sensible default - derived, so no effect is needed.
  const metric = names.some((n) => n.name === chosen) ? chosen : (names.find((n) => PREFERRED.includes(n.name)) ?? names[0])?.name ?? "";

  const metrics = useAzureMetrics(resourceId, metric ? [metric] : [], Number(hours));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={metric} onValueChange={setChosen} disabled={names.length === 0}>
          <SelectTrigger className="w-full sm:w-72" aria-label="Metric">
            <SelectValue placeholder={definitions.isPending ? "Loading metrics…" : "No metrics available"} />
          </SelectTrigger>
          <SelectContent>
            {names.map((n) => (
              <SelectItem key={n.name} value={n.name}>{n.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SegmentedControl aria-label="Time range" size="sm" value={hours as (typeof RANGES)[number]["value"]} onValueChange={setHours} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
      </div>

      {definitions.isError || (definitions.isSuccess && names.length === 0) ? (
        <EmptyState size="sm" bare title="No metrics for this resource" description="Azure Monitor doesn't expose platform metrics for it." />
      ) : (
        <QueryBoundary query={metrics} title="Metrics" rows={4} isEmpty={(data) => data.length === 0} emptyTitle="Azure doesn't report this metric" emptyDescription="Try another metric.">
          {(data) => <ChartBody series={data[0]} hours={Number(hours)} />}
        </QueryBoundary>
      )}
    </div>
  );
}
