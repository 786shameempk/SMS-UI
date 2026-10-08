import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed, Save, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { getAttemptReview, saveEvaluations } from "../api";
import { formatExamTime, formatMarks, formatPercent, isChoiceType, isExamStaff, QUESTION_TYPE_LABEL } from "../constants";
import type { EvaluationInput, ReviewQuestion } from "../types";

interface Draft {
  marks: string;
  comment: string;
  touched: boolean;
}

function initialDraft(q: ReviewQuestion): Draft {
  const marks = q.awardedMarks ?? (q.needsEvaluation ? null : q.autoMarks);
  return { marks: marks == null ? "" : String(marks), comment: q.comment ?? "", touched: false };
}

function Verdict({ q }: { q: ReviewQuestion }) {
  if (!q.answered) return <Badge variant="neutral">Not answered</Badge>;
  if (q.needsEvaluation) return <Badge variant="warning" dot>Needs marking</Badge>;
  if (q.isCorrect === true) return <Badge variant="success">Correct</Badge>;
  if (q.isCorrect === false) return <Badge variant="danger">Incorrect</Badge>;
  return <Badge variant="info">Marked</Badge>;
}

function StudentAnswer({ q }: { q: ReviewQuestion }) {
  if (isChoiceType(q.type)) {
    return (
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {q.options.map((o) => (
          <li
            key={o.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              o.selected && o.isCorrect && "border-success/50 bg-success-soft text-success-strong",
              o.selected && !o.isCorrect && "border-destructive/40 bg-destructive-soft text-destructive-strong",
              !o.selected && o.isCorrect && "border-success/40 border-dashed text-success-strong",
              !o.selected && !o.isCorrect && "border-border/80 text-secondary-foreground",
            )}
          >
            {o.selected ? (o.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />) : <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-40" />}
            <span className="flex-1">{o.text}</span>
            {o.selected && <span className="text-[11px] font-medium">Chosen</span>}
            {!o.selected && o.isCorrect && <span className="text-[11px] font-medium">Correct</span>}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border/80 bg-card px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">Student's answer</p>
        <p className="whitespace-pre-wrap text-sm text-foreground">{q.textAnswer?.trim() || <em className="text-muted-foreground">No answer</em>}</p>
      </div>
      {q.expectedAnswer && (
        <div className="rounded-lg bg-secondary/60 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">{q.type === "FillInBlank" ? "Accepted answers" : "Model answer"}</p>
          <p className="whitespace-pre-wrap text-sm text-secondary-foreground">{q.expectedAnswer}</p>
        </div>
      )}
    </div>
  );
}

export default function AttemptReviewPage() {
  const { id, attemptId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const review = useQuery({ queryKey: ["online-exams", "attempt", id, attemptId], queryFn: () => getAttemptReview(id!, attemptId!), enabled: !!id && !!attemptId && isExamStaff(role) });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (review.data) setDrafts(Object.fromEntries(review.data.questions.map((q) => [q.questionId, initialDraft(q)])));
  }, [review.data]);

  const save = useMutation({
    mutationFn: (evaluations: EvaluationInput[]) => saveEvaluations(id!, attemptId!, evaluations),
    onSuccess: (updated) => {
      queryClient.setQueryData(["online-exams", "attempt", id, attemptId], updated);
      void queryClient.invalidateQueries({ queryKey: ["online-exams"], predicate: (q) => q.queryKey[1] !== "attempt" });
    },
  });

  const questions = review.data?.questions ?? [];
  const toSend = useMemo(
    () => questions.filter((q) => q.needsEvaluation || drafts[q.questionId]?.touched),
    [questions, drafts],
  );
  const problems = useMemo(() => {
    const list: Record<string, string> = {};
    for (const q of toSend) {
      const d = drafts[q.questionId];
      const raw = d?.marks.trim() ?? "";
      if (raw === "") {
        if (q.needsEvaluation && d?.touched) list[q.questionId] = "Enter marks.";
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > q.marks) list[q.questionId] = `Between 0 and ${formatMarks(q.marks)}.`;
    }
    return list;
  }, [toSend, drafts]);

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my" replace />;
  if (review.isLoading) return <PageSkeleton />;
  if (review.isError || !review.data) {
    return (
      <PageContainer>
        <ErrorState title="This submission couldn't load" description={review.error instanceof Error ? review.error.message : undefined} onRetry={() => review.refetch()} retrying={review.isRefetching} />
      </PageContainer>
    );
  }

  const r = review.data;
  const setDraft = (qid: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [qid]: { ...d[qid], ...patch, touched: true } }));
  const unmarked = questions.filter((q) => q.needsEvaluation && (drafts[q.questionId]?.marks.trim() ?? "") === "").length;

  const submit = async (goNext: boolean) => {
    if (Object.keys(problems).length) {
      toast.error(Object.values(problems)[0]);
      return;
    }
    const evaluations = toSend
      .filter((q) => (drafts[q.questionId]?.marks.trim() ?? "") !== "")
      .map((q) => ({ questionId: q.questionId, awardedMarks: Number(drafts[q.questionId].marks), comment: drafts[q.questionId].comment.trim() || null }));
    try {
      const updated = evaluations.length ? await save.mutateAsync(evaluations) : r;
      if (goNext) {
        if (updated.pendingEvaluationCount > 0) {
          toast.error("Some answers still need marks.");
          return;
        }
        toast.success(`Saved ${r.studentName}'s marks`);
        if (updated.nextPendingAttemptId) navigate(`/online-exams/exams/${r.examId}/attempts/${updated.nextPendingAttemptId}`);
        else {
          toast.success("All submissions are marked - you can publish the results now.");
          navigate(`/online-exams/exams/${r.examId}/results`);
        }
      } else toast.success("Marks saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the marks");
    }
  };

  return (
    <PageContainer>
      <Link to={`/online-exams/exams/${r.examId}/results`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {r.examName} results
      </Link>
      <PageHeader
        title={r.studentName}
        description={[r.rollNumber && `Roll ${r.rollNumber}`, r.classLabel, r.submittedAt && `Submitted ${formatExamTime(r.submittedAt)}`, r.status === "TimedOut" && "Closed at time-up"].filter(Boolean).join(" · ")}
      />

      <Card className="sticky top-14 z-10">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm" aria-live="polite">
            <span>
              <span className="text-muted-foreground">Score </span>
              <strong className="tabular-nums">{formatMarks(r.obtainedMarks)} / {formatMarks(r.totalMarks)}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Percentage </span>
              <strong className="tabular-nums">{formatPercent(r.percentage)}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Grade </span>
              <strong>{r.grade}</strong>
            </span>
            {r.pendingEvaluationCount > 0 ? <Badge variant="warning" dot>{r.pendingEvaluationCount} to mark</Badge> : <Badge variant={r.passed ? "success" : "danger"}>{r.passed ? "Passed" : "Failed"}</Badge>}
          </div>
          {r.canEvaluate && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void submit(false)} loading={save.isPending} disabled={toSend.length === 0}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button size="sm" onClick={() => void submit(true)} loading={save.isPending} disabled={unmarked > 0} title={unmarked ? `${unmarked} answer(s) still need marks` : undefined}>
                {r.nextPendingAttemptId ? "Save & next student" : "Complete evaluation"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ol className="space-y-3">
        {questions.map((q) => {
          const d = drafts[q.questionId] ?? initialDraft(q);
          const err = problems[q.questionId];
          const editable = r.canEvaluate;
          return (
            <li key={q.questionId}>
              <Card className={cn(q.needsEvaluation && "border-warning/50")}>
                <CardContent className="space-y-3 pt-[var(--space-card-padding)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums">{q.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-sm text-foreground">{q.text}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                        <Verdict q={q} />
                        {q.autoMarks != null && !q.needsEvaluation && <span className="text-xs text-muted-foreground">Auto-marked {formatMarks(q.autoMarks)}</span>}
                      </div>
                    </div>
                  </div>
                  <StudentAnswer q={q} />
                  {q.explanation && <p className="text-xs text-muted-foreground">Explanation: {q.explanation}</p>}
                  {editable ? (
                    <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[9rem_1fr]">
                      <label className="space-y-1 text-sm">
                        <span className="block font-medium text-foreground">
                          Marks <span className="font-normal text-muted-foreground">/ {formatMarks(q.marks)}</span>
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={q.marks}
                          step={0.5}
                          value={d.marks}
                          onChange={(e) => setDraft(q.questionId, { marks: e.target.value })}
                          aria-invalid={err ? true : undefined}
                          aria-label={`Marks for question ${q.number}`}
                          className="tabular-nums"
                        />
                        {err && <span className="block text-xs font-medium text-destructive-strong">{err}</span>}
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="block font-medium text-foreground">
                          Comment <span className="font-normal text-muted-foreground">(optional, shown to the student)</span>
                        </span>
                        <Textarea rows={2} value={d.comment} maxLength={2000} onChange={(e) => setDraft(q.questionId, { comment: e.target.value })} aria-label={`Comment for question ${q.number}`} />
                      </label>
                    </div>
                  ) : (
                    <p className="border-t border-border pt-3 text-sm">
                      <span className="text-muted-foreground">Marks </span>
                      <strong className="tabular-nums">{formatMarks(q.awardedMarks ?? q.autoMarks)} / {formatMarks(q.marks)}</strong>
                      {q.comment && <span className="block text-muted-foreground">“{q.comment}”</span>}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </PageContainer>
  );
}
