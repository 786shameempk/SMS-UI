import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, FormRow } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { isChoiceType, QUESTION_TYPE_LABEL, QUESTION_TYPES } from "../constants";
import type { QuestionContent, QuestionType } from "../types";

export const MAX_OPTIONS = 10;

export function emptyQuestion(type: QuestionType = "SingleChoice"): QuestionContent {
  return withType({ type, text: "", marks: 1, explanation: null, modelAnswer: null, acceptedAnswers: null, caseSensitive: false, options: null }, type);
}

/** Switching type keeps the text and marks, and gives the answer area the right starting shape. */
export function withType(q: QuestionContent, type: QuestionType): QuestionContent {
  const base = { ...q, type };
  if (type === "TrueFalse") return { ...base, options: [{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }], acceptedAnswers: null };
  if (type === "SingleChoice" || type === "MultipleSelect") {
    const keep = q.options && isChoiceType(q.type) && q.type !== "TrueFalse" ? q.options : null;
    const options = keep ?? Array.from({ length: 4 }, () => ({ text: "", isCorrect: false }));
    // A single-choice question can't keep several correct options from a multi-select.
    const fixed = type === "SingleChoice" ? options.map((o, i) => ({ ...o, isCorrect: i === options.findIndex((x) => x.isCorrect) })) : options;
    return { ...base, options: fixed, acceptedAnswers: null };
  }
  if (type === "FillInBlank") return { ...base, options: null, acceptedAnswers: q.acceptedAnswers ?? [] };
  return { ...base, options: null, acceptedAnswers: null };
}

/** Same rules the server applies (OnlineExamRules.ValidateQuestion), so problems show before saving. */
export function validateQuestion(q: QuestionContent): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!q.text.trim()) errors.text = "Enter the question.";
  else if (q.text.length > 4000) errors.text = "Keep the question under 4,000 characters.";
  if (!(q.marks > 0) || q.marks > 100) errors.marks = "Marks must be between 0.5 and 100.";
  else if (q.marks * 2 !== Math.floor(q.marks * 2)) errors.marks = "Use whole or half marks.";
  const options = q.options ?? [];
  const correct = options.filter((o) => o.isCorrect).length;
  if (q.type === "SingleChoice" || q.type === "MultipleSelect") {
    if (options.length < 2) errors.options = "Add at least two options.";
    else if (options.some((o) => !o.text.trim())) errors.options = "Options can't be empty.";
    else if (new Set(options.map((o) => o.text.trim().toLowerCase())).size !== options.length) errors.options = "Options must be different from each other.";
    else if (q.type === "SingleChoice" && correct !== 1) errors.options = "Mark exactly one correct option.";
    else if (q.type === "MultipleSelect" && correct < 1) errors.options = "Mark at least one correct option.";
  }
  if (q.type === "TrueFalse" && correct !== 1) errors.options = "Choose whether the statement is true or false.";
  if (q.type === "FillInBlank" && !(q.acceptedAnswers ?? []).some((a) => a.trim())) errors.acceptedAnswers = "Add at least one accepted answer.";
  return errors;
}

interface QuestionEditorProps {
  value: QuestionContent;
  onChange: (value: QuestionContent) => void;
  errors?: Record<string, string>;
  idPrefix?: string;
}

/** Type, question, marks and the answer area - the part of a question shared by the bank and the exam wizard. */
export default function QuestionEditor({ value, onChange, errors = {}, idPrefix = "q" }: QuestionEditorProps) {
  const [acceptedDraft, setAcceptedDraft] = useState("");
  const set = (patch: Partial<QuestionContent>) => onChange({ ...value, ...patch });
  const options = value.options ?? [];

  const setOption = (index: number, patch: Partial<{ text: string; isCorrect: boolean }>) => {
    const next = options.map((o, i) => (i === index ? { ...o, ...patch } : o));
    set({ options: next });
  };
  const markCorrect = (index: number, checked: boolean) => {
    // Single choice / true-false: choosing one option un-chooses the others.
    const next = value.type === "MultipleSelect"
      ? options.map((o, i) => (i === index ? { ...o, isCorrect: checked } : o))
      : options.map((o, i) => ({ ...o, isCorrect: i === index }));
    set({ options: next });
  };
  const addAccepted = () => {
    const parts = acceptedDraft.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    set({ acceptedAnswers: Array.from(new Set([...(value.acceptedAnswers ?? []), ...parts])) });
    setAcceptedDraft("");
  };

  return (
    <div className="space-y-4">
      <FormRow>
        <FormField label="Question type" htmlFor={`${idPrefix}-type`} required>
          <Select value={value.type} onValueChange={(t) => onChange(withType(value, t as QuestionType))}>
            <SelectTrigger id={`${idPrefix}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Marks" htmlFor={`${idPrefix}-marks`} required error={errors.marks}>
          <Input
            id={`${idPrefix}-marks`}
            type="number"
            min={0.5}
            max={100}
            step={0.5}
            value={Number.isFinite(value.marks) ? value.marks : ""}
            onChange={(e) => set({ marks: e.target.value === "" ? NaN : Number(e.target.value) })}
            aria-invalid={errors.marks ? true : undefined}
          />
        </FormField>
      </FormRow>

      <FormField label="Question" htmlFor={`${idPrefix}-text`} required error={errors.text} hint={value.type === "FillInBlank" ? "Show the blank with underscores, e.g. “The capital of Kerala is ____.”" : undefined}>
        <Textarea
          id={`${idPrefix}-text`}
          rows={3}
          value={value.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="Type the question students will see…"
          aria-invalid={errors.text ? true : undefined}
        />
      </FormField>

      {isChoiceType(value.type) && (
        <FormField
          label={value.type === "TrueFalse" ? "Correct answer" : "Options"}
          required
          error={errors.options}
          hint={value.type === "MultipleSelect" ? "Tick every correct option. Students must choose exactly these to score." : value.type === "SingleChoice" ? "Select the one correct option." : undefined}
        >
          <div className="space-y-2" role={value.type === "MultipleSelect" ? "group" : "radiogroup"} aria-label="Options">
            {options.map((option, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                  option.isCorrect ? "border-success/40 bg-success-soft/50" : "border-border",
                )}
              >
                {value.type === "MultipleSelect" ? (
                  <Checkbox checked={option.isCorrect} onCheckedChange={(c) => markCorrect(index, c === true)} aria-label={`Option ${index + 1} is correct`} />
                ) : (
                  <input
                    type="radio"
                    name={`${idPrefix}-correct`}
                    checked={option.isCorrect}
                    onChange={() => markCorrect(index, true)}
                    aria-label={`${option.text || `Option ${index + 1}`} is correct`}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                )}
                <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground">{String.fromCharCode(65 + index)}</span>
                {value.type === "TrueFalse" ? (
                  <span className="flex-1 py-1 text-sm font-medium text-foreground">{option.text}</span>
                ) : (
                  <Input
                    value={option.text}
                    onChange={(e) => setOption(index, { text: e.target.value })}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="h-8 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                    aria-label={`Option ${String.fromCharCode(65 + index)}`}
                  />
                )}
                {option.isCorrect && <span className="hidden text-[11px] font-semibold text-success-strong sm:inline">Correct</span>}
                {value.type !== "TrueFalse" && options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => set({ options: options.filter((_, i) => i !== index) })} aria-label={`Remove option ${String.fromCharCode(65 + index)}`}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {value.type !== "TrueFalse" && options.length < MAX_OPTIONS && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ options: [...options, { text: "", isCorrect: false }] })}>
                <Plus className="h-3.5 w-3.5" />
                Add option
              </Button>
            )}
          </div>
        </FormField>
      )}

      {value.type === "FillInBlank" && (
        <FormField label="Accepted answers" required error={errors.acceptedAnswers} hint="Any of these counts as correct. Extra spaces are ignored.">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={acceptedDraft}
                onChange={(e) => setAcceptedDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAccepted();
                  }
                }}
                placeholder="Type an answer and press Enter"
                aria-label="Accepted answer"
              />
              <Button type="button" variant="outline" onClick={addAccepted}>
                Add
              </Button>
            </div>
            {(value.acceptedAnswers ?? []).length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {(value.acceptedAnswers ?? []).map((a) => (
                  <li key={a} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                    {a}
                    <button type="button" onClick={() => set({ acceptedAnswers: (value.acceptedAnswers ?? []).filter((x) => x !== a) })} aria-label={`Remove ${a}`} className="cursor-pointer text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-secondary-foreground">
              <Switch checked={value.caseSensitive} onCheckedChange={(c) => set({ caseSensitive: c })} />
              Match capital letters exactly
            </label>
          </div>
        </FormField>
      )}

      {(value.type === "ShortAnswer" || value.type === "LongAnswer") && (
        <FormField label="Expected answer" optional hint="Shown to the teacher while evaluating - a guide, not an exact match.">
          <Textarea rows={value.type === "LongAnswer" ? 4 : 2} value={value.modelAnswer ?? ""} onChange={(e) => set({ modelAnswer: e.target.value || null })} />
        </FormField>
      )}

      <FormField label="Explanation" optional hint="Shown to students after results, only if the exam allows it.">
        <Textarea rows={2} value={value.explanation ?? ""} onChange={(e) => set({ explanation: e.target.value || null })} />
      </FormField>
    </div>
  );
}
