import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_INFO, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getAttendanceTrendReport } from "../api";
import StatTile from "./StatTile";

export default function AttendanceTrendsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "attendance-trends"], queryFn: getAttendanceTrendReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatTile label="Student attendance (avg.)" value={`${data.studentAverage}%`} icon={CalendarCheck} />
        <StatTile label="Staff attendance (avg.)" value={`${data.staffAverage}%`} icon={UserCheck} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance trend</CardTitle>
          <CardDescription>Student vs. staff attendance percentage over the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={36} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => (value === null ? ["No data", ""] : [`${value}%`, ""])} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="studentPercent" name="Students" stroke={CHART_PRIMARY} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="staffPercent" name="Staff" stroke={CHART_INFO} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
