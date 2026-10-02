import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listClasses, listSubjects } from "@/features/academics/api";
import { DIFFICULTY_TONE } from "@/features/online-exams/constants";
import { KIND_LABEL } from "../../generation/mapping";
import type { GeneratedQuestion } from "../../generation/types";

export function ClassSubjectFields({
  classId,
  subjectId,
  onChange,
  idPrefix,
}: {
  classId: string;
  subjectId: string;
  onChange: (next: { classId: string; subjectId: string }) => void;
  idPrefix: string;
}) {
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const forClass = subjects.filter((s) => !classId || s.classIds.length === 0 || s.classIds.includes(classId));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField label="Class" htmlFor={`${idPrefix}-class`}>
        <Select value={classId} onValueChange={(v) => onChange({ classId: v, subjectId: "" })}>
          <SelectTrigger id={`${idPrefix}-class`}>
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Subject" htmlFor={`${idPrefix}-subject`}>
        <Select value={subjectId} onValueChange={(v) => onChange({ classId, subjectId: v })}>
          <SelectTrigger id={`${idPrefix}-subject`}>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {forClass.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}

/** Marks content as AI-made and unreviewed, with the review actions every generator needs. */
export function DraftBar({
  published,
  publishedLabel,
  busy,
  onRegenerate,
  onReject,
  onApprove,
  approveLabel,
  canApprove = true,
  children,
}: {
  published?: boolean;
  publishedLabel?: string;
  busy?: boolean;
  onRegenerate: () => void;
  onReject: () => void;
  onApprove?: () => void;
  approveLabel?: string;
  canApprove?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info" dot>
          <Sparkles className="mr-1 h-3 w-3" />
          AI generated
        </Badge>
        <Badge variant={published ? "success" : "warning"} dot>
          {published ? (publishedLabel ?? "Approved") : "Draft — review before use"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {onApprove && (
          <Button onClick={onApprove} disabled={!canApprove || busy || published}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {approveLabel ?? "Approve"}
          </Button>
        )}
        <Button variant="outline" onClick={onRegenerate} disabled={busy || published}>
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </Button>
        <Button variant="ghost" onClick={onReject} disabled={busy}>
          <X className="h-4 w-4" />
          {published ? "Close" : "Reject"}
        </Button>
        {children}
      </div>
    </div>
  );
}

/** Editable list of generated questions: the teacher can fix wording, marks, options and answers or drop a question. */
export function QuestionReviewList({
  questions,
  onChange,
  disabled,
  labelPrefix = "Question",
}: {
  questions: GeneratedQuestion[];
  onChange: (next: GeneratedQuestion[]) => void;
  disabled?: boolean;
  labelPrefix?: string;
}) {
  const update = (index: number, patch: Partial<GeneratedQuestion>) => onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {labelPrefix} {i + 1}
            </span>
            <Badge variant="neutral">{KIND_LABEL[q.type] ?? q.type}</Badge>
            <Badge variant={DIFFICULTY_TONE[q.difficulty] ?? "neutral"}>{q.difficulty}</Badge>
            <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              Marks
              <Input
                aria-label={`${labelPrefix} ${i + 1} marks`}
                type="number"
                min={0.5}
                step={0.5}
                className="h-7 w-16"
                value={q.marks}
                disabled={disabled}
                onChange={(e) => update(i, { marks: Number(e.target.value) })}
              />
            </label>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${labelPrefix.toLowerCase()} ${i + 1}`} disabled={disabled} onClick={() => onChange(questions.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea aria-label={`${labelPrefix} ${i + 1} text`} rows={2} value={q.question} disabled={disabled} onChange={(e) => update(i, { question: e.target.value })} />
          {q.type === "MCQ" && (
            <ul className="space-y-1">
              {q.options.map((o, j) => (
                <li key={j} className="flex items-center gap-2">
                  <input
                    type="radio"
                    aria-label={`${labelPrefix} ${i + 1} correct option ${j + 1}`}
                    checked={o.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()}
                    disabled={disabled}
                    onChange={() => update(i, { correctAnswer: o })}
                  />
                  <Input
                    aria-label={`${labelPrefix} ${i + 1} option ${j + 1}`}
                    value={o}
                    disabled={disabled}
                    onChange={(e) => {
                      const wasCorrect = o === q.correctAnswer;
                      const options = q.options.map((x, k) => (k === j ? e.target.value : x));
                      update(i, { options, correctAnswer: wasCorrect ? e.target.value : q.correctAnswer });
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
          {q.type !== "MCQ" && (
            <FormField label="Answer" htmlFor={`${labelPrefix}-${i}-answer`}>
              <Input id={`${labelPrefix}-${i}-answer`} value={q.correctAnswer} disabled={disabled} onChange={(e) => update(i, { correctAnswer: e.target.value })} />
            </FormField>
          )}
          <p className="text-xs text-muted-foreground">
            Explanation: {q.explanation} · Objective: {q.learningObjective}
          </p>
        </div>
      ))}
    </div>
  );
}

export function GenerateButton({ busy, onClick, label = "Generate draft" }: { busy: boolean; onClick: () => void; label?: string }) {
  return (
    <Button onClick={onClick} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
