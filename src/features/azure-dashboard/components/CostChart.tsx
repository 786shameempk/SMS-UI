import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/states";
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import type { DailyCost } from "../types";
import { money } from "../utils";

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Daily Azure cost as Cost Management reports it. Responsive, with currency-formatted tooltip and an empty state. */
export default function CostChart({ data, currency, height = 260 }: { data: DailyCost[]; currency: string; height?: number }) {
  if (data.length === 0) {
    return <EmptyState size="sm" bare title="No cost data for this period" description="Azure reports costs with a delay of several hours." />;
  }

  return (
    <div style={{ height }} role="img" aria-label={`Daily cost chart, ${data.length} days`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="azure-cost-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={CHART_TICK} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => money(v, currency, 0)} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelFormatter={(label) => shortDate(String(label))}
            formatter={(value) => [money(Number(value), currency), "Cost"]}
          />
          <Area type="monotone" dataKey="cost" stroke="var(--color-primary)" strokeWidth={2} fill="url(#azure-cost-fill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
