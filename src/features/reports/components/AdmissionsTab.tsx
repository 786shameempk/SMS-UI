import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, FileText, Percent } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL_COLORS, CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getAdmissionsReport } from "../api";
import StatTile from "./StatTile";

const STATUS_LABEL: Record<string, string> = {
  inquiry: "Inquiry",
  registration: "Registration",
  entrance_exam: "Entrance Exam",
  interview: "Interview",
  fee_collection: "Fee Collection",
  enrolled: "Enrolled",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default function AdmissionsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "admissions"], queryFn: getAdmissionsReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Total applications" value={String(data.totalApplications)} icon={FileText} />
        <StatTile label="Enrollment rate" value={`${data.approvalRate}%`} icon={Percent} />
        <StatTile
          label="Enrolled"
          value={String(data.statusBreakdown.find((s) => s.status === "enrolled")?.count ?? 0)}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Applications by status</CardTitle>
            <CardDescription>Current breakdown of every admission application.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {data.statusBreakdown.map((entry, i) => (
                      <Cell key={entry.status} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, _name, entry) => [value, STATUS_LABEL[entry.payload.status] ?? entry.payload.status]} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value: string) => STATUS_LABEL[value] ?? value}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications received</CardTitle>
            <CardDescription>New admission applications over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyApplications} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                  <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, "Applications"]} />
                  <Bar dataKey="value" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
