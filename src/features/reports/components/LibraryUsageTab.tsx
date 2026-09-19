import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BookOpen, Library } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL_COLORS, CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getLibraryUsageReport } from "../api";
import StatTile from "./StatTile";

export default function LibraryUsageTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "library-usage"], queryFn: getLibraryUsageReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Total loans" value={String(data.totalLoans)} icon={Library} />
        <StatTile label="Currently issued" value={String(data.currentlyIssued)} icon={BookOpen} />
        <StatTile label="Overdue" value={String(data.overdueCount)} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Loan volume</CardTitle>
            <CardDescription>Books issued per month over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyLoans} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                  <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, "Loans"]} />
                  <Bar dataKey="value" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Busiest categories</CardTitle>
            <CardDescription>Categories with the most loans, all-time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topCategories} layout="vertical" margin={{ left: 12, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_COLOR} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={90} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, "Loans"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.topCategories.map((entry, i) => (
                      <Cell key={entry.category} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
