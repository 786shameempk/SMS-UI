import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import type { PerformanceTrendPoint } from "../types";

export default function PerformanceChart({ data, rangeLabel }: { data: PerformanceTrendPoint[]; rangeLabel: string }) {
  const hasResults = data.some((d) => d.averageScore !== null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic performance</CardTitle>
        <CardDescription>{`Average score and pass rate · ${rangeLabel}`}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasResults ? (
          <EmptyState
            bare
            size="sm"
            icon={BarChart3}
            title="No exam results in this period"
            description="The trend appears once marks are entered for exams in the selected range."
            className="h-64"
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_TICK} />
                {/* Both series are 0–100, so a fixed domain keeps the lines honest instead of zooming into a narrow band. */}
                <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={32} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, _name, item) => [item.dataKey === "passRate" ? `${value}%` : `${value}`, item.name]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                {/* Months without exams are gaps (null): the line joins the months that have results instead of dipping to 0. */}
                <Area type="monotone" dataKey="averageScore" name="Average score" stroke="var(--color-brand-500)" strokeWidth={2} fill="url(#scoreGradient)" connectNulls dot={{ r: 3 }} />
                <Area type="monotone" dataKey="passRate" name="Pass rate" stroke="var(--color-success)" strokeWidth={2} fill="transparent" connectNulls dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
