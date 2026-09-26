import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceTrendPoint } from "../types";

export default function PerformanceChart({ data, rangeLabel }: { data: PerformanceTrendPoint[]; rangeLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic performance trend</CardTitle>
        <CardDescription>{`Average score and pass rate · ${rangeLabel}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={36} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(value, name) => [
                  name === "averageScore" ? `${value}` : `${value}%`,
                  name === "averageScore" ? "Avg. score" : "Pass rate",
                ]}
              />
              <Area type="monotone" dataKey="averageScore" stroke="var(--color-brand-500)" strokeWidth={2} fill="url(#scoreGradient)" />
              <Area type="monotone" dataKey="passRate" stroke="#22c55e" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
