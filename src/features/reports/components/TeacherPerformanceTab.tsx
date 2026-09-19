import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getTeacherPerformanceReport } from "../api";
import StatTile from "./StatTile";

export default function TeacherPerformanceTab() {
  const { data = [], isLoading } = useQuery({ queryKey: ["reports", "teacher-performance"], queryFn: getTeacherPerformanceReport });

  const overallAverage = data.length ? Math.round(data.reduce((sum, t) => sum + t.averageScore, 0) / data.length) : 0;
  const top10 = data.slice(0, 10);

  if (isLoading) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatTile label="Teachers with classes" value={String(data.length)} icon={Users} />
        <StatTile label="School-wide average" value={`${overallAverage}%`} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average class performance by teacher</CardTitle>
          <CardDescription>Each teacher's average across the classes/subjects they teach (top 10).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 12, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_COLOR} />
                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis type="category" dataKey="teacherName" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={110} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value}%`, "Avg. score"]} />
                <Bar dataKey="averageScore" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
