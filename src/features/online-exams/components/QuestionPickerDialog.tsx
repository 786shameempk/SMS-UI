import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cn } from "@/utils/cn";
import { listQuestions } from "../api";
import { DIFFICULTIES, DIFFICULTY_TONE, formatMarks, QUESTION_TYPE_LABEL, QUESTION_TYPES } from "../constants";
import type { QuestionBankItem, QuestionDifficulty, QuestionType } from "../types";

const ALL = "__all";

interface QuestionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectName?: string;
  /** Bank ids already in the exam - shown as added, can't be picked twice. */
  alreadyAdded: Set<string>;
  onAdd: (questions: QuestionBankItem[]) => void;
}

export default function QuestionPickerDialog({ open, onOpenChange, subjectId, subjectName, alreadyAdded, onAdd }: QuestionPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [difficulty, setDifficulty] = useState<string>(ALL);
  const [topic, setTopic] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const questions = useQuery({
    queryKey: ["online-exams", "question-bank", { subjectId }],
    queryFn: () => listQuestions({ subjectId }),
    enabled: open && !!subjectId,
  });

  const topics = useMemo(() => Array.from(new Set((questions.data ?? []).map((q) => q.topic).filter((t): t is string => !!t))).sort(), [questions.data]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (questions.data ?? []).filter(
      (q) =>
        (type === ALL || q.type === type) &&
        (difficulty === ALL || q.difficulty === difficulty) &&
        (topic === ALL || q.topic === topic) &&
        (!term || q.text.toLowerCase().includes(term) || q.tags.some((t) => t.toLowerCase().includes(term))),
    );
  }, [questions.data, search, type, difficulty, topic]);

  const selectable = visible.filter((q) => !alreadyAdded.has(q.id));
  const allSelected = selectable.length > 0 && selectable.every((q) => selected.has(q.id));
  const chosen = (questions.data ?? []).filter((q) => selected.has(q.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add from question bank</DialogTitle>
          <DialogDescription>{subjectName ? `${subjectName} questions.` : "Questions for this subject."} Each is copied into the exam, so later edits in the bank won't change it.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <SearchInput value={search} onValueChange={setSearch} placeholder="Search questions or tags…" aria-label="Search questions" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-40" aria-label="Question type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t as QuestionType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="sm:w-32" aria-label="Difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any difficulty</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="sm:w-36" aria-label="Topic">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All topics</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {questions.isLoading ? (
          <LoadingState label="Loading questions…" />
        ) : questions.isError ? (
          <ErrorState size="sm" title="Couldn't load the question bank" onRetry={() => questions.refetch()} retrying={questions.isRefetching} />
        ) : visible.length === 0 ? (
          <EmptyState size="sm" title="No matching questions" description={(questions.data ?? []).length ? "Try other filters." : "This subject's bank is empty. Create questions in Question Bank, or write them straight into the exam."} />
        ) : (
          <div className="space-y-2">
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-secondary-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(c) => setSelected((prev) => {
                  const next = new Set(prev);
                  for (const q of selectable) {
                    if (c === true) next.add(q.id);
                    else next.delete(q.id);
                  }
                  return next;
                })}
              />
              Select all {selectable.length} shown
            </label>
            <ul className="divide-y divide-border rounded-xl border border-border/80">
              {visible.map((q) => {
                const added = alreadyAdded.has(q.id);
                return (
                  <li key={q.id}>
                    <label className={cn("flex gap-3 px-3.5 py-3", added ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-secondary/40")}>
                      {added ? (
                        <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded bg-success text-success-foreground" aria-label="Already in exam">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : (
                        <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggle(q.id)} className="mt-0.5" aria-label="Select question" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-foreground">{q.text}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="neutral">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                          <Badge variant={DIFFICULTY_TONE[q.difficulty as QuestionDifficulty]}>{q.difficulty}</Badge>
                          {q.topic && <span className="text-xs text-muted-foreground">{q.topic}</span>}
                          {added && <span className="text-xs font-medium text-success-strong">Added</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatMarks(q.marks)} m</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {chosen.length} selected · {formatMarks(chosen.reduce((s, q) => s + q.marks, 0))} marks
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={chosen.length === 0}
              onClick={() => {
                onAdd(chosen);
                onOpenChange(false);
              }}
            >
              Add {chosen.length || ""} question{chosen.length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
