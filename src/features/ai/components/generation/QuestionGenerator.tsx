import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { importQuestions } from "@/features/online-exams/api";
import { generateQuestions } from "../../generation/api";
import { AI_DIFFICULTIES, AI_QUESTION_KINDS, KIND_LABEL, toQuestionBankInputs } from "../../generation/mapping";
import type { AiDifficulty, AiQuestionKind, GeneratedQuestion } from "../../generation/types";
import { ClassSubjectFields, DraftBar, FormError, GenerateButton, QuestionReviewList } from "./shared";

export default function QuestionGenerator() {
  const [target, setTarget] = useState({ classId: "", subjectId: "" });
  const [chapter, setChapter] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("Medium");
  const [types, setTypes] = useState<AiQuestionKind[]>(["MCQ", "ShortAnswer"]);
  const [objectives, setObjectives] = useState("");
  const [material, setMaterial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [published, setPublished] = useState(false);

  const generate = useMutation({
    mutationFn: generateQuestions,
    onSuccess: (r) => {
      setQuestions(r.content.questions);
      setPublished(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: () => importQuestions(toQuestionBankInputs(questions ?? [], target.subjectId, target.classId, chapter.trim() || null)),
    onSuccess: (r) => {
      setPublished(true);
      toast.success(`${r.imported} question${r.imported === 1 ? "" : "s"} added to the question bank`);
      if (r.errors.length) toast.error(`${r.errors.length} could not be imported: ${r.errors[0]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = () => {
    const problem = !target.classId ? "Choose a class." : !target.subjectId ? "Choose a subject." : !chapter.trim() ? "Enter a chapter or topic." : types.length === 0 ? "Choose at least one question type." : !(count >= 1 && count <= 50) ? "Question count must be between 1 and 50." : null;
    setError(problem);
    if (!problem) generate.mutate({ ...target, chapter: chapter.trim(), questionCount: count, difficulty, questionTypes: types, learningObjectives: objectives.trim() || undefined, material: material.trim() || undefined });
  };

  const toggle = (k: AiQuestionKind) => setTypes((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Question generator</CardTitle>
          <CardDescription>Generates draft questions with answers. Nothing is saved until you approve.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClassSubjectFields idPrefix="qg" {...target} onChange={setTarget} />
          <FormField label="Chapter / topic" htmlFor="qg-chapter">
            <Input id="qg-chapter" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Force and Pressure" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Number of questions" htmlFor="qg-count">
              <Input id="qg-count" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </FormField>
            <FormField label="Difficulty" htmlFor="qg-difficulty">
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as AiDifficulty)}>
                <SelectTrigger id="qg-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Question types</legend>
            <div className="flex flex-wrap gap-3">
              {AI_QUESTION_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={types.includes(k)} onChange={() => toggle(k)} />
                  {KIND_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField label="Learning objectives" htmlFor="qg-objectives" optional>
            <Input id="qg-objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </FormField>
          <FormField label="Source material" htmlFor="qg-material" optional hint="Paste textbook text to base questions on. It is treated as reference data only.">
            <Textarea id="qg-material" rows={3} value={material} onChange={(e) => setMaterial(e.target.value)} maxLength={8000} />
          </FormField>
          <FormError message={error} />
          <GenerateButton busy={generate.isPending} onClick={run} />
        </CardContent>
      </Card>

      {questions && (
        <Card>
          <CardHeader>
            <CardTitle>Review draft</CardTitle>
            <CardDescription>{questions.length} questions. Edit or remove anything before approving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DraftBar
              published={published}
              publishedLabel="Added to question bank"
              busy={publish.isPending || generate.isPending}
              onRegenerate={run}
              onReject={() => setQuestions(null)}
              onApprove={() => publish.mutate()}
              approveLabel="Approve & add to question bank"
              canApprove={questions.length > 0 && questions.every((q) => q.question.trim() && q.correctAnswer.trim())}
            />
            <QuestionReviewList questions={questions} onChange={setQuestions} disabled={published} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
