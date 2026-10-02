import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Printer, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { importQuestions } from "@/features/online-exams/api";
import { generateExam } from "../../generation/api";
import { AI_QUESTION_KINDS, KIND_LABEL, toQuestionBankInputs, totalMarks, totalQuestions, validateExamRequest } from "../../generation/mapping";
import { examToHtml, printDocument } from "../../generation/printable";
import type { AiQuestionKind, ExamPaper, ExamRequest, ExamSectionRequest } from "../../generation/types";
import { ClassSubjectFields, DraftBar, FormError, GenerateButton, QuestionReviewList } from "./shared";

export default function ExamGenerator() {
  const [target, setTarget] = useState({ classId: "", subjectId: "" });
  const [chapters, setChapters] = useState("");
  const [duration, setDuration] = useState(60);
  const [mix, setMix] = useState({ easy: 20, medium: 50, hard: 30 });
  const [sections, setSections] = useState<ExamSectionRequest[]>([
    { type: "MCQ", count: 10, marksEach: 1 },
    { type: "ShortAnswer", count: 5, marksEach: 2 },
    { type: "LongAnswer", count: 3, marksEach: 5 },
  ]);
  const [objectives, setObjectives] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [published, setPublished] = useState(false);

  const buildRequest = (): ExamRequest => ({
    ...target,
    chapters: chapters.split(",").map((c) => c.trim()).filter(Boolean),
    totalMarks: totalMarks(sections),
    durationMinutes: duration,
    ...mix,
    sections,
    learningObjectives: objectives.trim() || undefined,
  });

  const generate = useMutation({
    mutationFn: generateExam,
    onSuccess: (r) => {
      setPaper(r.content);
      setPublished(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: () => importQuestions(toQuestionBankInputs(paper!.sections.flatMap((s) => s.questions), target.subjectId, target.classId, chapters.split(",")[0]?.trim() || null)),
    onSuccess: (r) => {
      setPublished(true);
      toast.success(`${r.imported} question${r.imported === 1 ? "" : "s"} added to the question bank. Build the exam from the Online Exams page.`);
      if (r.errors.length) toast.error(`${r.errors.length} could not be imported: ${r.errors[0]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = () => {
    const request = buildRequest();
    const problem = validateExamRequest(request);
    setError(problem);
    if (!problem) generate.mutate(request);
  };

  const updateSection = (i: number, patch: Partial<ExamSectionRequest>) => setSections((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const updateSectionQuestions = (index: number, questions: ExamPaper["sections"][number]["questions"]) =>
    setPaper((p) => (p ? { ...p, sections: p.sections.map((s, i) => (i === index ? { ...s, questions } : s)) } : p));

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Exam paper generator</CardTitle>
          <CardDescription>Builds a sectioned question paper with an answer key. A teacher reviews and approves it; nothing is published automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClassSubjectFields idPrefix="eg" {...target} onChange={setTarget} />
          <FormField label="Chapters (comma separated)" htmlFor="eg-chapters">
            <Input id="eg-chapters" value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="Force and Pressure, Friction" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Duration (minutes)" htmlFor="eg-duration">
              <Input id="eg-duration" type="number" min={10} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </FormField>
            <FormField label="Learning objectives" htmlFor="eg-objectives" optional>
              <Input id="eg-objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
            </FormField>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Difficulty split (%)</legend>
            <div className="grid grid-cols-3 gap-3">
              {(["easy", "medium", "hard"] as const).map((k) => (
                <FormField key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={`eg-mix-${k}`}>
                  <Input id={`eg-mix-${k}`} type="number" min={0} max={100} value={mix[k]} onChange={(e) => setMix((m) => ({ ...m, [k]: Number(e.target.value) }))} />
                </FormField>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Sections</legend>
            {sections.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_5rem_auto] items-end gap-2">
                <FormField label={`Section ${String.fromCharCode(65 + i)} type`} htmlFor={`eg-type-${i}`}>
                  <Select value={s.type} onValueChange={(v) => updateSection(i, { type: v as AiQuestionKind })}>
                    <SelectTrigger id={`eg-type-${i}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_QUESTION_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Count" htmlFor={`eg-count-${i}`}>
                  <Input id={`eg-count-${i}`} type="number" min={1} value={s.count} onChange={(e) => updateSection(i, { count: Number(e.target.value) })} />
                </FormField>
                <FormField label="Marks each" htmlFor={`eg-marks-${i}`}>
                  <Input id={`eg-marks-${i}`} type="number" min={0.5} step={0.5} value={s.marksEach} onChange={(e) => updateSection(i, { marksEach: Number(e.target.value) })} />
                </FormField>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove section ${i + 1}`} onClick={() => setSections((x) => x.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setSections((s) => [...s, { type: "MCQ", count: 5, marksEach: 1 }])}>
              <Plus className="h-4 w-4" />
              Add section
            </Button>
            <p className="text-xs text-muted-foreground">
              {totalQuestions(sections)} questions · {totalMarks(sections)} marks
            </p>
          </fieldset>
          <FormError message={error} />
          <GenerateButton busy={generate.isPending} onClick={run} />
        </CardContent>
      </Card>

      {paper && (
        <Card>
          <CardHeader>
            <CardTitle>{paper.title}</CardTitle>
            <CardDescription>
              {paper.totalMarks} marks · {paper.durationMinutes} minutes · {Object.entries(paper.difficultyCounts).map(([k, v]) => `${v} ${k}`).join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DraftBar
              published={published}
              publishedLabel="Questions added to question bank"
              busy={publish.isPending || generate.isPending}
              onRegenerate={run}
              onReject={() => setPaper(null)}
              onApprove={() => publish.mutate()}
              approveLabel="Approve & add questions to bank"
              canApprove={paper.sections.every((s) => s.questions.length > 0 && s.questions.every((q) => q.question.trim() && q.correctAnswer.trim()))}
            >
              <Button variant="outline" onClick={() => !printDocument(paper.title, examToHtml(paper, false)) && toast.error("Allow pop-ups to print or save as PDF.")}>
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
              <Button variant="outline" onClick={() => !printDocument(`${paper.title} - answer key`, examToHtml(paper, true)) && toast.error("Allow pop-ups to print or save as PDF.")}>
                <Printer className="h-4 w-4" />
                With answer key
              </Button>
            </DraftBar>
            {paper.sections.map((s, i) => (
              <section key={i} className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {s.name} <span className="font-normal text-muted-foreground">— {s.instructions}</span>
                </h3>
                <QuestionReviewList questions={s.questions} onChange={(qs) => updateSectionQuestions(i, qs)} disabled={published} labelPrefix={`${s.name} Q`} />
              </section>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
