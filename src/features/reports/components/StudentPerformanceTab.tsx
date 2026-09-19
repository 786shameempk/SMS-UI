import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GraduationCap, ListChecks, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getStudentPerformanceReport } from "../api";
import StatTile from "./StatTile";

export default function StudentPerformanceTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "student-performance"], queryFn: getStudentPerformanceReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Overall average" value={`${data.overallAverage}%`} icon={TrendingUp} />
        <StatTile label="Exams tracked" value={String(data.examTrend.length)} icon={ListChecks} />
        <StatTile label="Latest exam" value={data.latestExamName ?? "—"} icon={GraduationCap} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average score by exam</CardTitle>
          <CardDescription>School-wide average percentage across every exam, in date order.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.examTrend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                <XAxis dataKey="examName" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={36} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value}%`, "Avg. score"]} />
                <Line type="monotone" dataKey="averagePercentage" stroke={CHART_PRIMARY} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average by class</CardTitle>
          <CardDescription>{data.latestExamName ? `Class averages for "${data.latestExamName}".` : "No exams recorded yet."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.classAverages} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                <XAxis dataKey="className" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={36} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value}%`, "Avg. score"]} />
                <Bar dataKey="averagePercentage" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
