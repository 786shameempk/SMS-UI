import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Percent, UserRoundX, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL_COLORS, CHART_AXIS_TICK, CHART_DANGER, CHART_GRID_COLOR, CHART_TOOLTIP_STYLE } from "../constants";
import { getDropoutReport } from "../api";
import StatTile from "./StatTile";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive (dropout)",
  transferred: "Transferred",
  graduated: "Graduated",
  alumni: "Alumni",
};

export default function DropoutAnalysisTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "dropout"], queryFn: getDropoutReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  const inactiveCount = data.statusBreakdown.find((s) => s.status === "inactive")?.count ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Total students" value={String(data.totalStudents)} icon={Users} />
        <StatTile label="Inactive (dropout)" value={String(inactiveCount)} icon={UserRoundX} />
        <StatTile label="Dropout rate" value={`${data.dropoutRate}%`} icon={Percent} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Students by status</CardTitle>
            <CardDescription>Current enrollment status across the whole school.</CardDescription>
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
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => STATUS_LABEL[value] ?? value} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inactive students by class</CardTitle>
            <CardDescription>Where dropouts are concentrated.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {data.inactiveByClass.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">No inactive students on record.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.inactiveByClass} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                    <XAxis dataKey="className" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                    <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={30} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, "Inactive students"]} />
                    <Bar dataKey="count" fill={CHART_DANGER} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
