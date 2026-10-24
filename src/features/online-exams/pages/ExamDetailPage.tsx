import type { ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, CalendarCheck2, CheckCircle2, ClipboardPenLine, Pencil, Send, ShieldCheck, Users } from "lucide-react";
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
import { useTranslation } from "react-i18next";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium text-foreground">{children}</dd>
    </div>
  );
}

function QuestionCard({ q, index }: { q: ExamQuestion; index: number }) {
  const { t } = useTranslation("online-exams");
  return (
    <li className="rounded-xl border border-border/80 bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums">{index + 1}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="whitespace-pre-wrap text-sm text-foreground">{q.text}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{t(QUESTION_TYPE_LABEL[q.type])}</Badge>
            <span className="text-xs text-muted-foreground">{q.marks === 1 ? t("{{marks}} mark", { marks: formatMarks(q.marks) }) : t("{{marks}} marks", { marks: formatMarks(q.marks) })}</span>
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
                    {o.isCorrect && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-label={t("Correct answer")} />}
                    {o.text}
                  </li>
                ))}
            </ul>
          ) : q.type === "FillInBlank" ? (
            <p className="text-sm text-secondary-foreground">
              <span className="text-muted-foreground">{t("Accepted answers:")} </span>
              {q.acceptedAnswers.join(", ") || "—"}
              {q.caseSensitive && <span className="text-xs text-muted-foreground"> {t("(case-sensitive)")}</span>}
            </p>
          ) : (
            q.modelAnswer && (
              <p className="whitespace-pre-wrap rounded-lg bg-secondary/60 px-3 py-2 text-sm text-secondary-foreground">
                <span className="block text-xs font-medium text-muted-foreground">{t("Model answer")}</span>
                {q.modelAnswer}
              </p>
            )
          )}
          {q.explanation && <p className="text-xs text-muted-foreground">{t("Explanation: {{text}}", { text: q.explanation })}</p>}
        </div>
      </div>
    </li>
  );
}

export default function ExamDetailPage() {
  const { t } = useTranslation("online-exams");
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
        <ErrorState title={t("This exam couldn't load")} description={exam.error instanceof Error ? exam.error.message : undefined} onRetry={() => exam.refetch()} retrying={exam.isRefetching} />
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
        {t("All exams")}
      </Link>
      <PageHeader
        title={e.name}
        description={`${t(EXAM_TYPE_LABEL[e.examType])} · ${e.subjectName ?? "—"} · ${e.className ?? "—"}${e.sectionName ? ` · ${t("Section {{name}}", { name: e.sectionName })}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExamStatusBadge status={e.status} />
            {e.status !== "Draft" && (
              <Button variant="outline" onClick={() => navigate(`/online-exams/exams/${e.id}/monitor`)}>
                <ShieldCheck className="h-4 w-4" />
                {t("Monitor")}
              </Button>
            )}
            {can.edit && !e.hasAttempts && (
              <Button variant="outline" onClick={() => navigate(`/online-exams/exams/${e.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                {t("Edit")}
              </Button>
            )}
            {can.schedule && (
              <Button onClick={() => actions.openSchedule(e)}>
                <CalendarCheck2 className="h-4 w-4" />
                {t("Schedule")}
              </Button>
            )}
            {can.publish && (
              <Button onClick={() => actions.openPublish(e)}>
                <Send className="h-4 w-4" />
                {t("Publish results")}
              </Button>
            )}
            {can.results && (
              <Button variant={can.publish ? "outline" : "default"} onClick={() => navigate(`/online-exams/exams/${e.id}/results`)}>
                <Award className="h-4 w-4" />
                {t("Results")}
              </Button>
            )}
            <RowActions label={t("More exam actions")}>{actions.menuItems(e, { includeView: false })}</RowActions>
          </div>
        }
      />

      {e.status === "Cancelled" && (
        <div role="status" className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-secondary-foreground">
          {e.cancelReason ? t("This exam was cancelled: {{reason}}", { reason: e.cancelReason }) : t("This exam was cancelled.")}
        </div>
      )}

      <StatGrid columns={4}>
        <StatCard label={t("Students assigned")} value={e.assignedCount} icon={Users} tone="brand" />
        <StatCard label={t("Submitted")} value={e.submittedCount} icon={CheckCircle2} tone="success" hint={e.assignedCount ? t("{{percent}}% of assigned", { percent: Math.round((e.submittedCount / e.assignedCount) * 100) }) : undefined} />
        <StatCard
          label={t("Awaiting evaluation")}
          value={e.pendingEvaluationCount}
          icon={ClipboardPenLine}
          tone={e.pendingEvaluationCount ? "warning" : "neutral"}
          hint={e.pendingEvaluationCount ? t("Short/long answers to mark") : t("Nothing to mark")}
        />
        <StatCard label={t("Total marks")} value={formatMarks(e.totalMarks)} icon={Award} tone="info" hint={t("Pass at {{marks}}", { marks: formatMarks(e.passingMarks) })} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("Questions")}</CardTitle>
              <CardDescription>
                {e.questions.length === 1 ? t("{{n}} question, {{marks}} marks. Correct answers are shown to staff only.", { n: e.questions.length, marks: formatMarks(e.totalMarks) }) : t("{{n}} questions, {{marks}} marks. Correct answers are shown to staff only.", { n: e.questions.length, marks: formatMarks(e.totalMarks) })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {e.questions.length === 0 ? (
                <EmptyState
                  size="sm"
                  title={t("No questions yet")}
                  description={t("Add questions before scheduling this exam.")}
                  action={can.edit ? <Button size="sm" onClick={() => navigate(`/online-exams/exams/${e.id}/edit`)}>{t("Add questions")}</Button> : undefined}
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
              <CardTitle>{t("Schedule")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <Row label={t("Opens")}>{formatExamTime(e.startUtc, e.timeZoneId)}</Row>
                <Row label={t("Closes")}>{formatExamTime(e.endUtc, e.timeZoneId)}</Row>
                <Row label={t("Duration")}>{formatDuration(e.durationMinutes)}</Row>
                <Row label={t("Time zone")}>{e.timeZoneId}</Row>
                {e.resultsPublishedAt && <Row label={t("Results published")}>{formatExamTime(e.resultsPublishedAt, e.timeZoneId)}</Row>}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("Settings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <Row label={t("Attempts allowed")}>{s.maxAttempts}</Row>
                <Row label={t("Negative marking")}>{s.negativeMarkPerWrong > 0 ? t("−{{marks}} per wrong", { marks: formatMarks(s.negativeMarkPerWrong) }) : t("Off")}</Row>
                <Row label={t("Shuffle questions / options")}>{`${s.shuffleQuestions ? t("Yes") : t("No")} / ${s.shuffleOptions ? t("Yes") : t("No")}`}</Row>
                <Row label={t("Back navigation")}>{s.allowBackNavigation ? t("Allowed") : t("Forward only")}</Row>
                <Row label={t("Question pool")}>{s.questionsPerAttempt > 0 ? t("{{n}} drawn per student", { n: s.questionsPerAttempt }) : t("All questions")}</Row>
                <Row label={t("Proctoring")}>{s.proctoring === "Off" ? t("Off") : `${s.proctoring === "Webcam" ? t("Browser and camera") : t("Browser events")}${s.requireFullscreen ? t(", fullscreen") : ""}`}</Row>
                <Row label={t("Auto-submit at time-up")}>{s.autoSubmitOnTimeout ? t("Yes") : t("No")}</Row>
                <Row label={t("Result shown")}>{s.showResultImmediately ? t("Right after submitting") : t("When published")}</Row>
                <Row label={t("Answers in result")}>{s.showAnswersInResult ? t("Shown") : t("Hidden")}</Row>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("Assigned to")}</CardTitle>
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
                <Row label={t("Created by")}>{e.ownerName ?? "—"}</Row>
                {e.teacherName && <Row label={t("Teacher")}>{e.teacherName}</Row>}
                {e.description && <Row label={t("Instructions")}>{e.description}</Row>}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
      {actions.dialogs}
    </PageContainer>
  );
}
