import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileQuestionMark, FileUp, Library, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/utils/cn";
import { formatDuration, formatMarks, QUESTION_TYPE_LABEL } from "../../constants";
import type { QuestionBankItem, QuestionContent } from "../../types";
import ImportQuestionsDialog from "../ImportQuestionsDialog";
import QuestionEditor, { emptyQuestion, validateQuestion } from "../QuestionEditor";
import QuestionPickerDialog from "../QuestionPickerDialog";
import { newKey, totalMarks, type DraftQuestion, type WizardState } from "./wizardState";

interface QuestionsStepProps {
  state: WizardState;
  update: (fn: (s: WizardState) => WizardState) => void;
  subjectName?: string;
  error?: string;
}

function bankToContent(q: QuestionBankItem): QuestionContent {
  return {
    type: q.type,
    text: q.text,
    marks: q.marks,
    explanation: q.explanation,
    modelAnswer: q.modelAnswer,
    acceptedAnswers: q.acceptedAnswers,
    caseSensitive: q.caseSensitive,
    options: q.options.length ? q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) : null,
  };
}

/** Fisher–Yates: every order equally likely. */
function shuffled<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function QuestionsStep({ state, update, subjectName, error }: QuestionsStepProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<{ index: number | null; content: QuestionContent } | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const questions = state.questions;
  const alreadyAdded = useMemo(() => new Set(questions.map((q) => q.sourceQuestionId).filter((id): id is string => !!id)), [questions]);
  const setQuestions = (fn: (qs: DraftQuestion[]) => DraftQuestion[]) => update((s) => ({ ...s, questions: fn(s.questions) }));

  const move = (index: number, delta: number) =>
    setQuestions((qs) => {
      const next = [...qs];
      const target = index + delta;
      if (target < 0 || target >= next.length) return qs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const saveEdit = () => {
    if (!editing) return;
    const errs = validateQuestion(editing.content);
    setEditErrors(errs);
    if (Object.keys(errs).length) return;
    setQuestions((qs) =>
      editing.index === null
        ? [...qs, { key: newKey(), sourceQuestionId: null, content: editing.content }]
        : qs.map((q, i) => (i === editing.index ? { ...q, content: editing.content } : q)),
    );
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={!state.subjectId}>
          <Library className="h-4 w-4" />
          Select from question bank
        </Button>
        <Button variant="outline" onClick={() => { setEditErrors({}); setEditing({ index: null, content: emptyQuestion() }); }}>
          <Plus className="h-4 w-4" />
          Write a question
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <FileUp className="h-4 w-4" />
          Import CSV
        </Button>
        <Button
          variant="ghost"
          disabled={questions.length < 2}
          onClick={() => setQuestions(shuffled)}
          title="Shuffle the saved order once. To give every student a different order, turn on “Shuffle questions” in Configuration."
        >
          <Shuffle className="h-4 w-4" />
          Randomize order
        </Button>
      </div>

      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-border/80 bg-card/95 px-4 py-2.5 text-sm shadow-sm backdrop-blur" aria-live="polite">
        <span>
          <span className="text-muted-foreground">Total questions </span>
          <strong className="tabular-nums">{questions.length}</strong>
        </span>
        <span>
          <span className="text-muted-foreground">Total marks </span>
          <strong className="tabular-nums">{formatMarks(totalMarks(state))}</strong>
        </span>
        <span>
          <span className="text-muted-foreground">Duration </span>
          <strong>{Number.isFinite(state.durationMinutes) ? formatDuration(state.durationMinutes) : "—"}</strong>
        </span>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-destructive-strong">{error}</p>}

      {questions.length === 0 ? (
        <EmptyState
          icon={FileQuestionMark}
          title="No questions yet"
          description="Pick questions from the bank, write new ones, or import a CSV. You can save a draft without questions."
        />
      ) : (
        <ol className="space-y-2.5">
          {questions.map((q, i) => {
            const invalid = Object.keys(validateQuestion(q.content)).length > 0;
            return (
              <li key={q.key} className={cn("rounded-xl border bg-card p-3.5 shadow-sm", invalid ? "border-destructive/50" : "border-border/80")}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums text-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-foreground">{q.content.text || <em className="text-muted-foreground">Untitled question</em>}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="neutral">{QUESTION_TYPE_LABEL[q.content.type]}</Badge>
                      <span className="text-xs text-muted-foreground">{q.sourceQuestionId ? "Copied from question bank" : "Written for this exam"}</span>
                      {invalid && <span className="text-xs font-medium text-destructive-strong">Needs attention</span>}
                    </div>
                  </div>
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    Marks
                    <Input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={Number.isFinite(q.content.marks) ? q.content.marks : ""}
                      onChange={(e) => {
                        const marks = e.target.value === "" ? NaN : Number(e.target.value);
                        setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, content: { ...x.content, marks } } : x)));
                      }}
                      className="h-8 w-16 text-right tabular-nums"
                      aria-label={`Marks for question ${i + 1}`}
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-end gap-0.5">
                  <Button variant="ghost" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label={`Move question ${i + 1} down`}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => { setEditErrors({}); setEditing({ index: i, content: q.content }); }} aria-label={`Edit question ${i + 1}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive-strong" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <QuestionPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        subjectId={state.subjectId}
        subjectName={subjectName}
        alreadyAdded={alreadyAdded}
        onAdd={(items) => setQuestions((qs) => [...qs, ...items.map((b) => ({ key: newKey(), sourceQuestionId: b.id, content: bankToContent(b) }))])}
      />

      <ImportQuestionsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="exam"
        onImport={(parsed) => {
          setQuestions((qs) => [...qs, ...parsed.map((p) => ({ key: newKey(), sourceQuestionId: null, content: p.content }))]);
          setImportOpen(false);
        }}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.index === null ? "Write a question" : `Edit question ${(editing?.index ?? 0) + 1}`}</DialogTitle>
            <DialogDescription>This question belongs to this exam only. Add reusable questions in the Question Bank.</DialogDescription>
          </DialogHeader>
          {editing && <QuestionEditor value={editing.content} onChange={(content) => setEditing({ ...editing, content })} errors={editErrors} idPrefix="wq" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>{editing?.index === null ? "Add question" : "Save question"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
