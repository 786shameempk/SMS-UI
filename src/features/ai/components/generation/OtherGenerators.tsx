import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateHomework, generateLessonPlan, generateWorksheet } from "../../generation/api";
import { homeworkToAssignmentText, worksheetToAssignmentText } from "../../generation/assignment";
import { AI_DIFFICULTIES } from "../../generation/mapping";
import { homeworkToHtml, lessonPlanToHtml, printDocument, worksheetToHtml } from "../../generation/printable";
import type { AiDifficulty, Homework, LessonPlan, Worksheet } from "../../generation/types";
import AssignHomeworkButton from "./AssignHomeworkButton";
import SaveLessonPlanForReview from "./SaveLessonPlanForReview";
import { useAiCapabilities } from "../../capabilities";
import { ClassSubjectFields, DraftBar, FormError, GenerateButton } from "./shared";

const popupHint = "Allow pop-ups to print or save as PDF.";

function DifficultySelect({ id, value, onChange }: { id: string; value: AiDifficulty; onChange: (v: AiDifficulty) => void }) {
  return (
    <FormField label="Difficulty" htmlFor={id}>
      <Select value={value} onValueChange={(v) => onChange(v as AiDifficulty)}>
        <SelectTrigger id={id}>
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
  );
}

export function WorksheetGenerator() {
  const [target, setTarget] = useState({ classId: "", subjectId: "" });
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<AiDifficulty>("Medium");
  const [count, setCount] = useState(15);
  const [language, setLanguage] = useState("English");
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Worksheet | null>(null);

  const generate = useMutation({ mutationFn: generateWorksheet, onSuccess: (r) => setSheet(r.content), onError: (e: Error) => toast.error(e.message) });

  const run = () => {
    const problem = !target.classId ? "Choose a class." : !target.subjectId ? "Choose a subject." : !topic.trim() ? "Enter a topic." : !(count >= 1 && count <= 50) ? "Item count must be between 1 and 50." : null;
    setError(problem);
    if (!problem) generate.mutate({ ...target, topic: topic.trim(), difficulty, questionCount: count, language: language.trim() || "English" });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Worksheet generator</CardTitle>
          <CardDescription>Printable worksheets with a teacher answer key. Use Print / PDF to save or hand out.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClassSubjectFields idPrefix="wg" {...target} onChange={setTarget} />
          <FormField label="Topic" htmlFor="wg-topic">
            <Input id="wg-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Grammar: tenses" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <DifficultySelect id="wg-difficulty" value={difficulty} onChange={setDifficulty} />
            <FormField label="Items" htmlFor="wg-count">
              <Input id="wg-count" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </FormField>
            <FormField label="Language" htmlFor="wg-language">
              <Input id="wg-language" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </FormField>
          </div>
          <FormError message={error} />
          <GenerateButton busy={generate.isPending} onClick={run} />
        </CardContent>
      </Card>

      {sheet && (
        <Card>
          <CardHeader>
            <CardTitle>{sheet.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DraftBar busy={generate.isPending} onRegenerate={run} onReject={() => setSheet(null)}>
              <Button variant="outline" onClick={() => !printDocument(sheet.title, worksheetToHtml(sheet, false)) && toast.error(popupHint)}>
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
              <Button variant="outline" onClick={() => !printDocument(`${sheet.title} - key`, worksheetToHtml(sheet, true)) && toast.error(popupHint)}>
                <Printer className="h-4 w-4" />
                With answers
              </Button>
              {generate.variables && (
                <AssignHomeworkButton
                  key={generate.submittedAt}
                  title={sheet.title}
                  description={worksheetToAssignmentText(sheet)}
                  classId={generate.variables.classId ?? ""}
                  subjectId={generate.variables.subjectId ?? ""}
                  disabled={generate.isPending}
                />
              )}
            </DraftBar>
            {sheet.sections.map((s, i) => (
              <section key={i} className="space-y-1">
                <h3 className="text-sm font-semibold">
                  {s.kind} <span className="font-normal text-muted-foreground">— {s.instructions}</span>
                </h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {s.items.map((item, j) => (
                    <li key={j}>
                      {item.prompt}
                      {item.options.length > 0 && <span className="text-muted-foreground"> ({item.options.join(" / ")})</span>}
                      <span className="block text-xs text-muted-foreground">Answer: {item.answer}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function LessonPlanGenerator() {
  const [target, setTarget] = useState({ classId: "", subjectId: "" });
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(45);
  const [objectives, setObjectives] = useState("");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const { can } = useAiCapabilities();

  const generate = useMutation({ mutationFn: generateLessonPlan, onSuccess: (r) => setPlan(r.content), onError: (e: Error) => toast.error(e.message) });

  const run = () => {
    const problem = !target.classId ? "Choose a class." : !target.subjectId ? "Choose a subject." : !topic.trim() ? "Enter a topic." : !(duration >= 10 && duration <= 180) ? "Duration must be between 10 and 180 minutes." : null;
    setError(problem);
    if (!problem) generate.mutate({ ...target, topic: topic.trim(), durationMinutes: duration, learningObjectives: objectives.trim() || undefined, studentLevel: level.trim() || undefined });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Lesson plan generator</CardTitle>
          <CardDescription>A timed plan with activities, assessment, homework and differentiation ideas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClassSubjectFields idPrefix="lp" {...target} onChange={setTarget} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Topic" htmlFor="lp-topic">
              <Input id="lp-topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </FormField>
            <FormField label="Duration (minutes)" htmlFor="lp-duration">
              <Input id="lp-duration" type="number" min={10} max={180} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </FormField>
          </div>
          <FormField label="Learning objectives" htmlFor="lp-objectives" optional>
            <Input id="lp-objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </FormField>
          <FormField label="Student level" htmlFor="lp-level" optional>
            <Input id="lp-level" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. mixed ability, needs extra practice" />
          </FormField>
          <FormError message={error} />
          <GenerateButton busy={generate.isPending} onClick={run} />
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>{plan.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DraftBar busy={generate.isPending} onRegenerate={run} onReject={() => setPlan(null)}>
              <Button variant="outline" onClick={() => !printDocument(plan.title, lessonPlanToHtml(plan)) && toast.error(popupHint)}>
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
            </DraftBar>
            {can("author-content") && <SaveLessonPlanForReview key={plan.title} plan={plan} classId={target.classId} subjectId={target.subjectId} />}
            <div>
              <h4 className="font-semibold">Learning objectives</h4>
              <ul className="list-disc pl-5">{plan.learningObjectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
            {[
              ["Introduction", [plan.introduction]],
              ["Teaching activities", plan.teachingActivities],
              ["Student activities", plan.studentActivities],
            ].map(([label, acts]) => (
              <div key={label as string}>
                <h4 className="font-semibold">{label as string}</h4>
                <ul className="list-disc pl-5">
                  {(acts as LessonPlan["teachingActivities"]).map((a, i) => (
                    <li key={i}>
                      <b>{a.title}</b> ({a.minutes} min): {a.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p><b>Assessment:</b> {plan.assessment}</p>
            <p><b>Homework:</b> {plan.homework}</p>
            <div>
              <h4 className="font-semibold">Differentiation</h4>
              <ul className="list-disc pl-5">{plan.differentiationSuggestions.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function HomeworkGenerator() {
  const [target, setTarget] = useState({ classId: "", subjectId: "" });
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<AiDifficulty>("Medium");
  const [count, setCount] = useState(5);
  const [objectives, setObjectives] = useState("");
  const [performance, setPerformance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [homework, setHomework] = useState<Homework | null>(null);

  const generate = useMutation({ mutationFn: generateHomework, onSuccess: (r) => setHomework(r.content), onError: (e: Error) => toast.error(e.message) });

  const run = () => {
    const problem = !target.classId ? "Choose a class." : !target.subjectId ? "Choose a subject." : !topic.trim() ? "Enter a topic." : !(count >= 1 && count <= 15) ? "Task count must be between 1 and 15." : null;
    setError(problem);
    if (!problem) generate.mutate({ ...target, topic: topic.trim(), difficulty, taskCount: count, learningObjectives: objectives.trim() || undefined, performanceSummary: performance.trim() || undefined });
  };

  const update = (patch: Partial<Homework>) => setHomework((h) => (h ? { ...h, ...patch } : h));

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Homework generator</CardTitle>
          <CardDescription>Draft tasks with an extension and a support task. Edit before sharing with students.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClassSubjectFields idPrefix="hg" {...target} onChange={setTarget} />
          <FormField label="Topic" htmlFor="hg-topic">
            <Input id="hg-topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <DifficultySelect id="hg-difficulty" value={difficulty} onChange={setDifficulty} />
            <FormField label="Number of tasks" htmlFor="hg-count">
              <Input id="hg-count" type="number" min={1} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </FormField>
          </div>
          <FormField label="Learning objectives" htmlFor="hg-objectives" optional>
            <Input id="hg-objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </FormField>
          <FormField label="How the class has done so far" htmlFor="hg-performance" optional hint="Class-level notes only, for example: most of the class found fractions hard. Do not enter student names.">
            <Textarea id="hg-performance" rows={2} value={performance} onChange={(e) => setPerformance(e.target.value)} maxLength={1000} />
          </FormField>
          <FormError message={error} />
          <GenerateButton busy={generate.isPending} onClick={run} />
        </CardContent>
      </Card>

      {homework && (
        <Card>
          <CardHeader>
            <CardTitle>Review draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DraftBar busy={generate.isPending} onRegenerate={run} onReject={() => setHomework(null)}>
              <Button variant="outline" onClick={() => !printDocument(homework.title, homeworkToHtml(homework)) && toast.error(popupHint)}>
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
              {generate.variables && (
                <AssignHomeworkButton
                  key={generate.submittedAt}
                  title={homework.title}
                  description={homeworkToAssignmentText(homework)}
                  classId={generate.variables.classId ?? ""}
                  subjectId={generate.variables.subjectId ?? ""}
                  disabled={generate.isPending}
                />
              )}
            </DraftBar>
            <FormField label="Title" htmlFor="hg-title">
              <Input id="hg-title" value={homework.title} onChange={(e) => update({ title: e.target.value })} />
            </FormField>
            <FormField label="Instructions" htmlFor="hg-instructions">
              <Textarea id="hg-instructions" rows={2} value={homework.instructions} onChange={(e) => update({ instructions: e.target.value })} />
            </FormField>
            {homework.tasks.map((t, i) => (
              <FormField key={i} label={`Task ${i + 1} (${t.difficulty}, about ${t.estimatedMinutes} min)`} htmlFor={`hg-task-${i}`}>
                <Textarea
                  id={`hg-task-${i}`}
                  rows={2}
                  value={t.description}
                  onChange={(e) => update({ tasks: homework.tasks.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })}
                />
              </FormField>
            ))}
            <FormField label="Extension task" htmlFor="hg-ext">
              <Textarea id="hg-ext" rows={2} value={homework.extensionTask} onChange={(e) => update({ extensionTask: e.target.value })} />
            </FormField>
            <FormField label="Support task" htmlFor="hg-support">
              <Textarea id="hg-support" rows={2} value={homework.supportTask} onChange={(e) => update({ supportTask: e.target.value })} />
            </FormField>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
