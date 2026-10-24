import { Link, useParams } from "react-router-dom";
import MyProctoringReview from "../proctoring/MyProctoringReview";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CircleDashed, CircleHelp, MessageSquare, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { cn } from "@/utils/cn";
import { getMyResult } from "../api";
import { formatExamTime, formatMarks, formatPercent, isChoiceType, QUESTION_TYPE_LABEL } from "../constants";
import type { MyResultQuestion } from "../types";
import { useTranslation } from "react-i18next";

function QuestionResult({ q, showAnswers }: { q: MyResultQuestion; showAnswers: boolean }) {
  const { t } = useTranslation("online-exams");
  const icon =
    q.isCorrect === true ? <CheckCircle2 className="h-4 w-4 text-success" aria-label={t("Correct")} /> : q.isCorrect === false ? <XCircle className="h-4 w-4 text-destructive" aria-label={t("Incorrect")} /> : <CircleHelp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  return (
    <li>
      <Card>
        <CardContent className="space-y-3 pt-[var(--space-card-padding)]">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums">{q.number}</span>
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-sm text-foreground">{q.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(QUESTION_TYPE_LABEL[q.type])}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums">
              {icon}
              {q.awardedMarks == null ? "—" : formatMarks(q.awardedMarks)}/{formatMarks(q.marks)}
            </span>
          </div>
          {isChoiceType(q.type) ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {q.options.map((o) => (
                <li
                  key={o.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    o.selected && (!showAnswers || o.isCorrect) && "border-primary/40 bg-accent/60",
                    showAnswers && o.selected && o.isCorrect && "border-success/50 bg-success-soft text-success-strong",
                    showAnswers && o.selected && !o.isCorrect && "border-destructive/40 bg-destructive-soft text-destructive-strong",
                    showAnswers && !o.selected && o.isCorrect && "border-dashed border-success/50 text-success-strong",
                    !o.selected && !(showAnswers && o.isCorrect) && "border-border/80 text-secondary-foreground",
                  )}
                >
                  {o.selected ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-40" />}
                  <span className="flex-1">{o.text}</span>
                  {o.selected && <span className="text-[11px] font-medium">{t("Your answer")}</span>}
                  {showAnswers && !o.selected && o.isCorrect && <span className="text-[11px] font-medium">{t("Correct")}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-border/80 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">{t("Your answer")}</p>
              <p className="whitespace-pre-wrap text-sm">{q.textAnswer?.trim() || <em className="text-muted-foreground">{t("Not answered")}</em>}</p>
            </div>
          )}
          {showAnswers && q.expectedAnswer && !isChoiceType(q.type) && (
            <div className="rounded-lg bg-secondary/60 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">{q.type === "FillInBlank" ? t("Correct answer") : t("Model answer")}</p>
              <p className="whitespace-pre-wrap text-sm text-secondary-foreground">{q.expectedAnswer}</p>
            </div>
          )}
          {showAnswers && q.explanation && <p className="text-sm text-muted-foreground">{t("Explanation: {{text}}", { text: q.explanation })}</p>}
          {q.teacherComment && (
            <p className="flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-sm text-info-strong">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {q.teacherComment}
            </p>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

export default function MyResultPage() {
  const { t } = useTranslation("online-exams");
  const { id } = useParams();
  const result = useQuery({ queryKey: ["online-exams", "my-result", id], queryFn: () => getMyResult(id!), enabled: !!id });

  if (result.isLoading) return <PageSkeleton stats={4} />;
  if (result.isError || !result.data) {
    return (
      <PageContainer>
        <ErrorState title={t("Result not available")} description={result.error instanceof Error ? result.error.message : undefined} onRetry={() => result.refetch()} retrying={result.isRefetching} />
      </PageContainer>
    );
  }

  const r = result.data;
  return (
    <PageContainer>
      <Link to="/online-exams/my/results" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("My results")}
      </Link>
      <PageHeader title={r.examName} description={[r.subjectName, r.submittedAt && t("Submitted {{time}}", { time: formatExamTime(r.submittedAt) })].filter(Boolean).join(" · ")} />

      <Card>
        <CardContent className="grid gap-6 pt-[var(--space-card-padding)] sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-secondary/60 px-8 py-5 text-center">
            <span className="text-4xl font-bold tabular-nums text-foreground">{formatPercent(r.percentage)}</span>
            <span className="mt-1 text-sm text-muted-foreground">
              {t("{{obtained}} / {{total}} marks", { obtained: formatMarks(r.obtainedMarks), total: formatMarks(r.totalMarks) })}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {r.pendingEvaluation ? (
                <Badge variant="warning" dot>
                  {t("Some answers are still being marked")}
                </Badge>
              ) : (
                <Badge variant={r.passed ? "success" : "danger"} dot>
                  {r.passed ? t("Passed") : t("Not passed")}
                </Badge>
              )}
              <Badge variant="brand">{t("Grade {{grade}}", { grade: r.grade })}</Badge>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-success-soft px-2 py-2 text-success-strong">
                <dt className="text-xs">{t("Correct")}</dt>
                <dd className="text-lg font-semibold tabular-nums">{r.correctCount}</dd>
              </div>
              <div className="rounded-lg bg-destructive-soft px-2 py-2 text-destructive-strong">
                <dt className="text-xs">{t("Incorrect")}</dt>
                <dd className="text-lg font-semibold tabular-nums">{r.incorrectCount}</dd>
              </div>
              <div className="rounded-lg bg-secondary px-2 py-2 text-secondary-foreground">
                <dt className="text-xs">{t("Unanswered")}</dt>
                <dd className="text-lg font-semibold tabular-nums">{r.unansweredCount}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <CardTitle>{t("Question by question")}</CardTitle>
          {!r.showAnswers && <p className="text-sm text-muted-foreground">{t("Your teacher chose not to show the correct answers for this exam.")}</p>}
        </CardHeader>
        <CardContent className="px-0">
          <ol className="space-y-3">
            {r.questions.map((q) => (
              <QuestionResult key={q.number} q={q} showAnswers={r.showAnswers} />
            ))}
          </ol>
        </CardContent>
      </Card>
      {id && <MyProctoringReview examId={id} />}
    </PageContainer>
  );
}
