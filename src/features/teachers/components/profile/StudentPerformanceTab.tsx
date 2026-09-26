import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaffMember } from "@/features/staff/types";
import { getTeacherPerformanceOverview } from "../../api";

function gradeVariant(grade: string): "success" | "info" | "warning" | "danger" {
  if (grade === "A+" || grade === "A") return "success";
  if (grade === "B") return "info";
  if (grade === "C") return "warning";
  return "danger";
}

export default function StudentPerformanceTab({ staff }: { staff: StaffMember }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["teachers", "performance", staff.id],
    queryFn: () => getTeacherPerformanceOverview(staff.id),
  });

  const chartData = useMemo(
    () => rows.map((r) => ({ label: `${r.subject.name} · ${r.schoolClass.name}`, classAverage: r.classAverage })),
    [rows],
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading student performance…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No subject or class assignments yet, so there is no student performance to show. Assign subjects first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Class average by subject
          </CardTitle>
          <CardDescription>
            Placeholder scores until the Examinations module ships — for illustration only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={36} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value) => [`${value}`, "Class average"]}
                />
                <Bar dataKey="classAverage" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {rows.map((row) => (
        <Card key={row.assignmentId}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              {row.subject.name} &middot; {row.schoolClass.name}
            </CardTitle>
            <Badge variant="info">Class average {row.classAverage}</Badge>
          </CardHeader>
          <CardContent>
            {row.students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students found for this class.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Student
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Roll no.
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Avg. score
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.students.map(({ student, averageScore, grade }) => (
                      <tr key={student.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-3 py-2 text-secondary-foreground">{student.rollNumber ?? "—"}</td>
                        <td className="px-3 py-2 text-secondary-foreground">{averageScore}</td>
                        <td className="px-3 py-2">
                          <Badge variant={gradeVariant(grade)}>{grade}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
