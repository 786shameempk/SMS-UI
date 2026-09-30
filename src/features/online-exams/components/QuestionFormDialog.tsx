import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, FormRow } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Subject } from "@/features/academics/types";
import { listQuestionTopics } from "../api";
import { DIFFICULTIES } from "../constants";
import type { QuestionBankInput, QuestionBankItem, QuestionContent, QuestionDifficulty } from "../types";
import QuestionEditor, { emptyQuestion, validateQuestion } from "./QuestionEditor";

const ANY_CLASS = "__any";

function toContent(q: QuestionBankItem): QuestionContent {
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

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: QuestionBankItem | null;
  subjects: Subject[];
  classes: SchoolClass[];
  defaultSubjectId?: string;
  submitting: boolean;
  onSubmit: (input: QuestionBankInput) => void;
}

/** Add or edit a Question Bank question: where it belongs (subject, class, topic, difficulty) plus its content. */
export default function QuestionFormDialog({ open, onOpenChange, question, subjects, classes, defaultSubjectId, submitting, onSubmit }: QuestionFormDialogProps) {
  const [content, setContent] = useState<QuestionContent>(emptyQuestion());
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState<string>(ANY_CLASS);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("Medium");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (question) {
      setContent(toContent(question));
      setSubjectId(question.subjectId);
      setClassId(question.classId ?? ANY_CLASS);
      setTopic(question.topic ?? "");
      setDifficulty(question.difficulty);
      setTags(question.tags.join(", "));
    } else {
      setContent(emptyQuestion());
      setSubjectId(defaultSubjectId ?? "");
      setClassId(ANY_CLASS);
      setTopic("");
      setDifficulty("Medium");
      setTags("");
    }
  }, [open, question, defaultSubjectId]);

  const topics = useQuery({ queryKey: ["online-exams", "topics", subjectId], queryFn: () => listQuestionTopics(subjectId), enabled: open && !!subjectId });

  const submit = () => {
    const next = validateQuestion(content);
    if (!subjectId) next.subjectId = "Choose a subject.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      content,
      subjectId,
      classId: classId === ANY_CLASS ? null : classId,
      topic: topic.trim() || null,
      difficulty,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>
            {question && question.usedInExams > 0
              ? `Used in ${question.usedInExams} exam${question.usedInExams === 1 ? "" : "s"}. Those exams keep their own copy, so editing here won't change them.`
              : "Questions in the bank can be reused across exams."}
          </DialogDescription>
        </DialogHeader>

        <FormRow>
          <FormField label="Subject" htmlFor="qb-subject" required error={errors.subjectId}>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="qb-subject" aria-invalid={errors.subjectId ? true : undefined}>
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Class" htmlFor="qb-class" optional>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="qb-class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_CLASS}>Any class</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>
        <FormRow cols={3}>
          <FormField label="Chapter / topic" htmlFor="qb-topic" optional>
            <Input id="qb-topic" list="qb-topics" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Algebra" />
            <datalist id="qb-topics">
              {(topics.data ?? []).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Difficulty" htmlFor="qb-difficulty" required>
            <Select value={difficulty} onValueChange={(d) => setDifficulty(d as QuestionDifficulty)}>
              <SelectTrigger id="qb-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Tags" htmlFor="qb-tags" optional hint="Comma separated">
            <Input id="qb-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="revision, term 1" />
          </FormField>
        </FormRow>

        <div className="rounded-xl border border-border/80 p-4">
          <QuestionEditor value={content} onChange={setContent} errors={errors} idPrefix="qb" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {question ? "Save changes" : "Add to question bank"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
