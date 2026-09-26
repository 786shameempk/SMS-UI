import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listExamResults } from "../api";

export default function ExamResultsTab({ studentId }: { studentId: string }) {
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "exams", studentId],
    queryFn: () => listExamResults(studentId),
  });

  const chartData = results.map((r) => ({ subject: r.subject, percentage: Math.round((r.marksObtained / r.maxMarks) * 100) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam results</CardTitle>
        <CardDescription>Scores from recent exams and unit tests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading results…</p>}
        {!isLoading && results.length > 0 && (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={32} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value) => [`${value}%`, "Score"]}
                />
                <Bar dataKey="percentage" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{r.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {r.examName} &middot; {new Date(r.date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {r.marksObtained}/{r.maxMarks}
                </span>
                <Badge variant="info">{r.grade}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
