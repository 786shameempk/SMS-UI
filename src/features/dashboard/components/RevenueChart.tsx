import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import type { RevenueTrendPoint } from "../types";

export default function RevenueChart({ data, rangeLabel }: { data: RevenueTrendPoint[]; rangeLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee revenue</CardTitle>
        <CardDescription>{`Collected vs. expected fees · ${rangeLabel}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_TICK} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={CHART_TICK}
                width={52}
                tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }}
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
              <Bar dataKey="expected" name="Expected" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="collected" name="Collected" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
