import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, EyeOff, Save, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/form-field";
import { cn } from "@/utils/cn";
import { getReviewForm, saveDraft, submitReview } from "../api";
import { NS, answeredCount, formatDate, groupLabel, hasProblems, isTextQuestion, setAnswer, useApiMutation, validateReview, type FormProblems } from "../shared";
import type { Answer, FormQuestion, ReviewForm } from "../types";

import { useTranslation } from "react-i18next";

const NO_CRITERION = "";

/** The evaluation form: one section per criterion, draft saving, progress, and a final check before submitting. */
export default function ReviewFormPage() {
  const { assignmentId = "" } = useParams();
  const query = useQuery({ queryKey: ["appraisal", "review-form", assignmentId], queryFn: () => getReviewForm(assignmentId), enabled: Boolean(assignmentId) });
  const { t } = useTranslation(NS);

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} title={t("This review can't be opened")} description={t("It may not be assigned to you, or it is not open yet.")} />;
  return <ReviewFormBody form={query.data} />;
}

function ReviewFormBody({ form }: { form: ReviewForm }) {
  const { t } = useTranslation(NS);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Answer[]>(form.draft ?? []);
  const [step, setStep] = useState(0);
  const [problems, setProblems] = useState<FormProblems>({ questions: {} });
  const [dirty, setDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sections = useMemo(() => {
    const map = new Map<string, FormQuestion[]>();
    for (const q of form.questions) {
      const key = q.criterionName ?? q.criterion ?? NO_CRITERION;
      map.set(key, [...(map.get(key) ?? []), q]);
    }
    return [...map.entries()].map(([title, questions]) => ({ title, questions }));
  }, [form.questions]);

  // Warn before leaving with unsaved answers.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const draft = useApiMutation((a: Answer[]) => saveDraft(form.assignmentId, a), {
    success: t("Draft saved"),
    invalidate: [["appraisal", "my-reviews"]],
    onSuccess: () => setDirty(false),
  });
  const submit = useApiMutation((a: Answer[]) => submitReview(form.assignmentId, a), {
    success: t("Thank you - your review was submitted"),
    invalidate: [["appraisal", "my-reviews"]],
    onSuccess: () => {
      setDirty(false);
      setSubmitted(true);
      queryClient.removeQueries({ queryKey: ["appraisal", "review-form", form.assignmentId] });
    },
  });

  const change = (next: Answer) => {
    setAnswers((a) => setAnswer(a, next));
    setDirty(true);
    setProblems((p) => ({ ...p, questions: Object.fromEntries(Object.entries(p.questions).filter(([id]) => id !== next.questionId)) }));
  };

  const onSubmit = () => {
    const found = validateReview(form, answers);
    setProblems(found);
    if (hasProblems(found)) {
      // Take the reviewer to the first section that still needs something.
      const first = sections.findIndex((s) => s.questions.some((q) => found.questions[q.id]));
      if (first >= 0) setStep(first);
      return;
    }
    submit.mutate(answers);
  };

  const { answered, total } = answeredCount(form, answers);
  const percent = total === 0 ? 0 : Math.round((answered / total) * 100);
  const section = sections[Math.min(step, Math.max(0, sections.length - 1))];
  const isLast = step >= sections.length - 1;

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{t("Review submitted")}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t("Your feedback has been recorded. Thank you.")}</p>
          <Button onClick={() => navigate("/appraisal/pending")}>{t("Back to my reviews")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/appraisal/pending">
          <ArrowLeft className="h-4 w-4" /> {t("My reviews")}
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{form.appraisee}</h2>
              <p className="text-sm text-muted-foreground">
                {form.cycleName} · {t(groupLabel(form.reviewerGroup))}
                {form.context ? ` · ${form.context}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {form.deadline && <Badge variant="info">{t("Due {{date}}", { date: formatDate(form.deadline) })}</Badge>}
              {form.anonymous && (
                <Badge variant="neutral">
                  <EyeOff className="h-3 w-3" aria-hidden="true" /> {t("Anonymous")}
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("{{answered}} of {{total}} answered", { answered, total })}</span>
              <span>{percent}%</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("Progress")} className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
          {form.anonymous && <p className="text-xs text-muted-foreground">{t("Your name is not shown to the person you are reviewing. Results from small groups are hidden so nobody can be singled out.")}</p>}
          {!form.canEdit && <p className="rounded-md bg-muted px-3 py-2 text-sm">{t("This review can no longer be edited.")}</p>}
        </CardContent>
      </Card>

      {section && (
        <Card>
          <CardContent className="space-y-6 p-4 sm:p-6">
            {section.title && (
              <h3 className="text-base font-semibold">
                {section.title} <span className="text-xs font-normal text-muted-foreground">{t("Section {{n}} of {{total}}", { n: step + 1, total: sections.length })}</span>
              </h3>
            )}
            {section.questions.map((q) => (
              <QuestionField key={q.id} q={q} scale={form.scale} answer={answers.find((a) => a.questionId === q.id)} error={problems.questions[q.id]} disabled={!form.canEdit} onChange={change} />
            ))}
          </CardContent>
        </Card>
      )}

      {problems.form && <FieldError>{t(problems.form)}</FieldError>}
      {hasProblems(problems) && <p role="alert" className="text-sm text-destructive-strong">{t("Some questions still need an answer.")}</p>}

      {form.canEdit && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ArrowLeft className="h-4 w-4" /> {t("Back")}
            </Button>
            {!isLast && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.min(sections.length - 1, s + 1))}>
                {t("Next")} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" loading={draft.isPending} onClick={() => draft.mutate(answers)}>
              <Save className="h-4 w-4" /> {t("Save draft")}
            </Button>
            <Button size="sm" loading={submit.isPending} disabled={submit.isPending || submit.isSuccess} onClick={onSubmit}>
              <Send className="h-4 w-4" /> {t("Submit review")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionField({ q, scale, answer, error, disabled, onChange }: { q: FormQuestion; scale: ReviewForm["scale"]; answer?: Answer; error?: string; disabled: boolean; onChange: (a: Answer) => void }) {
  const { t } = useTranslation(NS);
  const base: Answer = { questionId: q.id, ...answer };
  const naId = `na-${q.id}`;
  return (
    <fieldset className="space-y-2" aria-describedby={error ? `err-${q.id}` : undefined} disabled={disabled}>
      <legend className="text-sm font-medium">
        {q.text} {q.required && <span aria-hidden="true" className="text-destructive">*</span>}
        {q.required && <span className="sr-only">{t("required")}</span>}
      </legend>
      {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}

      {q.type === "Rating" && (
        <div role="radiogroup" aria-label={q.text} className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
          {scale.map((s) => {
            const checked = answer?.rating === s.value && !answer?.notApplicable;
            return (
              <label
                key={s.value}
                title={s.description}
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors sm:flex-col sm:gap-0.5 sm:text-center",
                  checked ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted/60",
                )}
              >
                <input type="radio" name={q.id} className="sr-only" checked={checked} onChange={() => onChange({ questionId: q.id, rating: s.value, text: base.text })} />
                <span className="font-semibold tabular-nums">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === "MultipleChoice" && (
        <div role="radiogroup" aria-label={q.text} className="space-y-1.5">
          {(q.options ?? []).map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/60">
              <input type="radio" name={q.id} checked={answer?.choice === o.value && !answer?.notApplicable} onChange={() => onChange({ questionId: q.id, choice: o.value, text: base.text })} />
              {o.label}
            </label>
          ))}
        </div>
      )}

      {q.type === "YesNo" && (
        <div role="radiogroup" aria-label={q.text} className="flex gap-2">
          {([true, false] as const).map((v) => (
            <label key={String(v)} className={cn("relative flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm", answer?.yesNo === v && !answer?.notApplicable ? "border-primary bg-accent" : "border-border hover:bg-muted/60")}>
              <input type="radio" name={q.id} className="sr-only" checked={answer?.yesNo === v && !answer?.notApplicable} onChange={() => onChange({ questionId: q.id, yesNo: v, text: base.text })} />
              {v ? t("Yes") : t("No")}
            </label>
          ))}
        </div>
      )}

      {isTextQuestion(q) && (
        <Textarea aria-label={q.text} rows={3} maxLength={2000} value={answer?.text ?? ""} onChange={(e) => onChange({ ...base, notApplicable: false, text: e.target.value })} />
      )}

      {!isTextQuestion(q) && q.allowComment && (
        <Textarea aria-label={t("Optional comment")} placeholder={t("Optional comment")} rows={2} maxLength={2000} value={answer?.text ?? ""} onChange={(e) => onChange({ ...base, text: e.target.value })} />
      )}

      {q.allowNotApplicable && (
        <label htmlFor={naId} className="flex items-center gap-2 text-xs text-muted-foreground">
          <input id={naId} type="checkbox" checked={Boolean(answer?.notApplicable)} onChange={(e) => onChange(e.target.checked ? { questionId: q.id, notApplicable: true } : { questionId: q.id })} />
          {t("Not applicable")}
        </label>
      )}
      <FieldError id={`err-${q.id}`}>{error ? t(error) : undefined}</FieldError>
    </fieldset>
  );
}
