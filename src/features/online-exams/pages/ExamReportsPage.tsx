import { useEffect, useMemo, type ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BarChart3, Layers, Target, Users } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "@/features/ai/capabilities";
import ExamInsightsCard from "@/features/ai/components/analysis/ExamInsightsCard";
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import { getExamAnalysis, listOnlineExams } from "../api";
import { formatExamTime, formatMarks, formatPercent, isExamStaff, QUESTION_TYPE_LABEL } from "../constants";
import type { QuestionAnalysis } from "../types";

function ChartCard({ title, description, empty, children }: { title: string; description: string; empty: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? <EmptyState bare size="sm" icon={Layers} title="Nothing to show yet" className="h-56" /> : <div className="h-56 w-full">{children}</div>}
      </CardContent>
    </Card>
  );
}

function CorrectBar({ q }: { q: QuestionAnalysis }) {
  return (
    <div className="flex h-2 w-28 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${formatPercent(q.correctPercentage)} correct, ${formatPercent(q.incorrectPercentage)} incorrect, ${formatPercent(q.unansweredPercentage)} unanswered`}>
      <span className="bg-success" style={{ width: `${q.correctPercentage}%` }} />
      <span className="bg-destructive" style={{ width: `${q.incorrectPercentage}%` }} />
    </div>
  );
}

export default function ExamReportsPage() {
  const role = useAuthStore((s) => s.user?.role);
  // The school and role include AI Features (same rule as the nav), and the AI service can run this feature.
  const aiModule = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.aiFeatures);
  const { can: canAi } = useAiCapabilities();
  const canUseAi = aiModule && canAi("analyze-exam");
  const [params, setParams] = useSearchParams();
  const examId = params.get("exam") ?? "";

  const exams = useQuery({ queryKey: ["online-exams", "list", {}], queryFn: () => listOnlineExams(), enabled: isExamStaff(role) });
  const reportable = useMemo(
    () => (exams.data ?? []).filter((e) => e.submittedCount > 0).sort((a, b) => Date.parse(b.endUtc) - Date.parse(a.endUtc)),
    [exams.data],
  );
  const analysis = useQuery({ queryKey: ["online-exams", "analysis", examId], queryFn: () => getExamAnalysis(examId), enabled: !!examId });

  // Default to the most recent exam with submissions.
  useEffect(() => {
    if (!examId && reportable.length) setParams({ exam: reportable[0].id }, { replace: true });
  }, [examId, reportable, setParams]);

  const columns = useMemo<ColumnDef<QuestionAnalysis, unknown>[]>(
    () => [
      { accessorKey: "number", header: "#", cell: ({ row }) => <span className="tabular-nums">{row.original.number}</span> },
      {
        accessorKey: "text",
        header: "Question",
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="line-clamp-2 text-foreground">{row.original.text}</p>
            <p className="text-xs text-muted-foreground">
              {QUESTION_TYPE_LABEL[row.original.type]} · {formatMarks(row.original.marks)} marks
              {row.original.topic ? ` · ${row.original.topic}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "correctPercentage",
        header: "Correct",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <CorrectBar q={row.original} />
            <span className="tabular-nums">{formatPercent(row.original.correctPercentage)}</span>
          </div>
        ),
      },
      { accessorKey: "incorrectPercentage", header: "Incorrect", cell: ({ row }) => <span className="tabular-nums">{formatPercent(row.original.incorrectPercentage)}</span> },
      { accessorKey: "unanswered", header: "Skipped", cell: ({ row }) => <span className="tabular-nums">{row.original.unanswered}</span> },
      {
        accessorKey: "averageMarks",
        header: "Avg marks",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMarks(row.original.averageMarks)}
            <span className="text-muted-foreground"> / {formatMarks(row.original.marks)}</span>
          </span>
        ),
      },
    ],
    [],
  );

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my/results" replace />;

  const a = analysis.data;
  const hardest = a ? [...a.questions].filter((q) => q.answered > 0).sort((x, y) => x.correctPercentage - y.correctPercentage).slice(0, 3) : [];

  return (
    <PageContainer>
      <PageHeader
        icon={BarChart3}
        title="Reports"
        description="How each exam went, question by question - find the topics students struggled with."
        actions={
          <Select value={examId || undefined} onValueChange={(v) => setParams({ exam: v }, { replace: true })} disabled={!reportable.length}>
            <SelectTrigger className="w-full sm:w-[18rem]" aria-label="Exam">
              <SelectValue placeholder={exams.isLoading ? "Loading exams…" : "Choose an exam"} />
            </SelectTrigger>
            <SelectContent>
              {reportable.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} · {e.className ?? ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {exams.isError ? (
        <ErrorState title="Couldn't load exams" onRetry={() => exams.refetch()} />
      ) : !exams.isLoading && reportable.length === 0 ? (
        <EmptyState icon={BarChart3} title="No reports yet" description="Reports appear once students have submitted an exam." />
      ) : !examId || analysis.isLoading ? (
        <LoadingState label="Loading report…" />
      ) : analysis.isError || !a ? (
        <ErrorState title="Couldn't load this report" description={analysis.error instanceof Error ? analysis.error.message : undefined} onRetry={() => analysis.refetch()} />
      ) : (
        <>
          <StatGrid columns={4}>
            <StatCard label="Class average" value={formatPercent(a.classAverage)} icon={Target} tone="brand" />
            <StatCard label="Questions" value={a.questions.length} icon={Layers} tone="info" hint={`${formatMarks(a.exam.totalMarks)} marks`} />
            <StatCard label="Students appeared" value={a.exam.submittedCount} icon={Users} tone="success" hint={`of ${a.exam.assignedCount} assigned`} />
            <StatCard label="Exam closed" value={formatExamTime(a.exam.endUtc, a.exam.timeZoneId).split(",")[0]} icon={BarChart3} tone="neutral" />
          </StatGrid>

          {/* Keyed by exam so switching exams never shows the previous exam's insights. */}
          {canUseAi && <ExamInsightsCard key={examId} examId={examId} />}

          {hardest.length > 0 && hardest[0].correctPercentage < 50 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning-strong" />
                  Worth revisiting
                </CardTitle>
                <CardDescription>The questions fewest students got right.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {hardest.map((q) => (
                    <li key={q.questionId} className="flex items-start justify-between gap-3 rounded-lg border border-border/80 px-3 py-2">
                      <span className="text-sm">
                        <span className="font-semibold tabular-nums">Q{q.number}. </span>
                        {q.text}
                      </span>
                      <Badge variant={q.correctPercentage < 40 ? "danger" : "warning"}>{formatPercent(q.correctPercentage)} correct</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Score distribution" description="Number of students in each percentage band." empty={a.scoreDistribution.every((d) => d.value === 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.scoreDistribution}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="label" tick={CHART_TICK} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={CHART_TICK} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--color-secondary)" }} formatter={(v) => [v, "Students"]} />
                  <Bar dataKey="value" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Average by section" description="Mean percentage for each section that sat the exam." empty={a.sectionAverages.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.sectionAverages}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="label" tick={CHART_TICK} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={CHART_TICK} tickLine={false} axisLine={false} width={32} unit="%" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--color-secondary)" }} formatter={(v) => [`${Math.round(Number(v) * 10) / 10}%`, "Average"]} />
                  <Bar dataKey="averagePercentage" fill="var(--color-info)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Question analysis</CardTitle>
              <CardDescription>Correct, incorrect and skipped answers for every question.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={a.questions} pageSize={50} empty={{ icon: Layers, title: "No questions" }} />
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
