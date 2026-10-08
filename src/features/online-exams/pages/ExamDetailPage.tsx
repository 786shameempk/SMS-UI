import type { ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, CalendarCheck2, CheckCircle2, ClipboardPenLine, Pencil, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/states";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { getOnlineExam } from "../api";
import { EXAM_TYPE_LABEL, formatDuration, formatExamTime, formatMarks, isChoiceType, isExamStaff, QUESTION_TYPE_LABEL } from "../constants";
import type { ExamQuestion } from "../types";
import { allowedActions, ExamStatusBadge, useExamActions } from "../components/useExamActions";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

function QuestionCard({ q, index }: { q: ExamQuestion; index: number }) {
  return (
    <li className="rounded-xl border border-border/80 bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums">{index + 1}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="whitespace-pre-wrap text-sm text-foreground">{q.text}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{QUESTION_TYPE_LABEL[q.type]}</Badge>
            <span className="text-xs text-muted-foreground">{formatMarks(q.marks)} mark{q.marks === 1 ? "" : "s"}</span>
          </div>
          {isChoiceType(q.type) ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {[...q.options]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((o) => (
                  <li
                    key={o.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      o.isCorrect ? "border-success/40 bg-success-soft text-success-strong" : "border-border/80 text-secondary-foreground",
                    )}
                  >
                    {o.isCorrect && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-label="Correct answer" />}
                    {o.text}
                  </li>
                ))}
            </ul>
          ) : q.type === "FillInBlank" ? (
            <p className="text-sm text-secondary-foreground">
              <span className="text-muted-foreground">Accepted answers: </span>
              {q.acceptedAnswers.join(", ") || "—"}
              {q.caseSensitive && <span className="text-xs text-muted-foreground"> (case-sensitive)</span>}
            </p>
          ) : (
            q.modelAnswer && (
              <p className="whitespace-pre-wrap rounded-lg bg-secondary/60 px-3 py-2 text-sm text-secondary-foreground">
                <span className="block text-xs font-medium text-muted-foreground">Model answer</span>
                {q.modelAnswer}
              </p>
            )
          )}
          {q.explanation && <p className="text-xs text-muted-foreground">Explanation: {q.explanation}</p>}
        </div>
      </div>
    </li>
  );
}

export default function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const exam = useQuery({ queryKey: ["online-exams", "detail", id], queryFn: () => getOnlineExam(id!), enabled: !!id && isExamStaff(role) });
  const actions = useExamActions({ onDeleted: () => navigate("/online-exams/exams") });

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my" replace />;
  if (exam.isLoading) return <PageSkeleton stats={4} />;
  if (exam.isError || !exam.data) {
    return (
      <PageContainer>
        <ErrorState title="This exam couldn't load" description={exam.error instanceof Error ? exam.error.message : undefined} onRetry={() => exam.refetch()} retrying={exam.isRefetching} />
      </PageContainer>
    );
  }

  const e = exam.data;
  const can = allowedActions(e);
  const s = e.settings;

  return (
    <PageContainer>
      <Link to="/online-exams/exams" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All exams
      </Link>
      <PageHeader
        title={e.name}
        description={`${EXAM_TYPE_LABEL[e.examType]} · ${e.subjectName ?? "—"} · ${e.className ?? "—"}${e.sectionName ? ` · Section ${e.sectionName}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExamStatusBadge status={e.status} />
            {can.edit && !e.hasAttempts && (
              <Button variant="outline" onClick={() => navigate(`/online-exams/exams/${e.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            {can.schedule && (
              <Button onClick={() => actions.openSchedule(e)}>
                <CalendarCheck2 className="h-4 w-4" />
                Schedule
              </Button>
            )}
            {can.publish && (
              <Button onClick={() => actions.openPublish(e)}>
                <Send className="h-4 w-4" />
                Publish results
              </Button>
            )}
            {can.results && (
              <Button variant={can.publish ? "outline" : "default"} onClick={() => navigate(`/online-exams/exams/${e.id}/results`)}>
                <Award className="h-4 w-4" />
                Results
              </Button>
            )}
            <RowActions label="More exam actions">{actions.menuItems(e, { includeView: false })}</RowActions>
          </div>
        }
      />

      {e.status === "Cancelled" && (
        <div role="status" className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-secondary-foreground">
          This exam was cancelled{e.cancelReason ? `: ${e.cancelReason}` : "."}
        </div>
      )}

      <StatGrid columns={4}>
        <StatCard label="Students assigned" value={e.assignedCount} icon={Users} tone="brand" />
        <StatCard label="Submitted" value={e.submittedCount} icon={CheckCircle2} tone="success" hint={e.assignedCount ? `${Math.round((e.submittedCount / e.assignedCount) * 100)}% of assigned` : undefined} />
        <StatCard
          label="Awaiting evaluation"
          value={e.pendingEvaluationCount}
          icon={ClipboardPenLine}
          tone={e.pendingEvaluationCount ? "warning" : "neutral"}
          hint={e.pendingEvaluationCount ? "Short/long answers to mark" : "Nothing to mark"}
        />
        <StatCard label="Total marks" value={formatMarks(e.totalMarks)} icon={Award} tone="info" hint={`Pass at ${formatMarks(e.passingMarks)}`} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Questions</CardTitle>
              <CardDescription>
                {e.questions.length} question{e.questions.length === 1 ? "" : "s"}, {formatMarks(e.totalMarks)} marks. Correct answers are shown to staff only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {e.questions.length === 0 ? (
                <EmptyState
                  size="sm"
                  title="No questions yet"
                  description="Add questions before scheduling this exam."
                  action={can.edit ? <Button size="sm" onClick={() => navigate(`/online-exams/exams/${e.id}/edit`)}>Add questions</Button> : undefined}
                />
              ) : (
                <ol className="space-y-2.5">
                  {[...e.questions]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((q, i) => (
                      <QuestionCard key={q.id} q={q} index={i} />
                    ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <Row label="Opens">{formatExamTime(e.startUtc, e.timeZoneId)}</Row>
                <Row label="Closes">{formatExamTime(e.endUtc, e.timeZoneId)}</Row>
                <Row label="Duration">{formatDuration(e.durationMinutes)}</Row>
                <Row label="Time zone">{e.timeZoneId}</Row>
                {e.resultsPublishedAt && <Row label="Results published">{formatExamTime(e.resultsPublishedAt, e.timeZoneId)}</Row>}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <Row label="Attempts allowed">{s.maxAttempts}</Row>
                <Row label="Negative marking">{s.negativeMarkPerWrong > 0 ? `−${formatMarks(s.negativeMarkPerWrong)} per wrong` : "Off"}</Row>
                <Row label="Shuffle questions / options">{`${s.shuffleQuestions ? "Yes" : "No"} / ${s.shuffleOptions ? "Yes" : "No"}`}</Row>
                <Row label="Back navigation">{s.allowBackNavigation ? "Allowed" : "Forward only"}</Row>
                <Row label="Auto-submit at time-up">{s.autoSubmitOnTimeout ? "Yes" : "No"}</Row>
                <Row label="Result shown">{s.showResultImmediately ? "Right after submitting" : "When published"}</Row>
                <Row label="Answers in result">{s.showAnswersInResult ? "Shown" : "Hidden"}</Row>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assigned to</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-1.5">
                {e.assignments.map((a) => (
                  <li key={`${a.kind}-${a.targetId}`}>
                    <Badge variant="neutral">{a.label}</Badge>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 divide-y divide-border">
                <Row label="Created by">{e.ownerName ?? "—"}</Row>
                {e.teacherName && <Row label="Teacher">{e.teacherName}</Row>}
                {e.description && <Row label="Instructions">{e.description}</Row>}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
      {actions.dialogs}
    </PageContainer>
  );
}
