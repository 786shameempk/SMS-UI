import type { ReactNode } from "react";
import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAM_TYPE_LABEL, formatDuration, formatExamWindow, formatMarks, QUESTION_TYPE_LABEL } from "../../constants";
import type { QuestionType } from "../../types";
import { totalMarks, windowUtc, type WizardState } from "./wizardState";

interface ReviewStepProps {
  state: WizardState;
  labels: { subject?: string; className?: string; section?: string; teacher?: string; year?: string };
  assignedCount: number;
  blockers: string[];
  onEditStep: (step: number) => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

const Flag = ({ on, label }: { on: boolean; label: string }) => (
  <li className="flex items-center gap-2 text-sm">
    {on ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
    <span className={on ? "text-foreground" : "text-muted-foreground"}>{label}</span>
  </li>
);

export default function ReviewStep({ state, labels, assignedCount, blockers, onEditStep }: ReviewStepProps) {
  const w = windowUtc(state);
  const s = state.settings;
  const byType = state.questions.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.content.type]: (acc[q.content.type] ?? 0) + 1 }), {});
  const edit = (step: number) => (
    <CardAction>
      <Button variant="ghost" size="sm" onClick={() => onEditStep(step)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
    </CardAction>
  );

  return (
    <div className="space-y-4">
      {blockers.length > 0 && (
        <div role="status" className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-strong">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Save as a draft for now - fix these to schedule or publish:
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-6">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
            {edit(0)}
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Row label="Exam">{state.name || "—"}</Row>
              <Row label="Type">{EXAM_TYPE_LABEL[state.examType]}</Row>
              <Row label="Subject">{labels.subject ?? "—"}</Row>
              <Row label="Class">{labels.className ?? "—"}{labels.section ? ` · ${labels.section}` : ""}</Row>
              <Row label="Teacher">{labels.teacher ?? "You"}</Row>
              {labels.year && <Row label="Academic year">{labels.year}</Row>}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            {edit(1)}
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Row label="Window">{w ? formatExamWindow(w.start, w.end, state.timeZoneId) : "—"}</Row>
              <Row label="Duration">{formatDuration(state.durationMinutes)} per student</Row>
              <Row label="Time zone">{state.timeZoneId}</Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            {edit(2)}
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="divide-y divide-border">
              <Row label="Total marks">{formatMarks(totalMarks(state))}</Row>
              <Row label="Passing marks">{formatMarks(s.passingMarks)}</Row>
              <Row label="Attempts">{s.maxAttempts}</Row>
              {s.negativeMarkPerWrong > 0 && <Row label="Negative marking">−{formatMarks(s.negativeMarkPerWrong)} per wrong answer</Row>}
            </dl>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              <Flag on={s.shuffleQuestions} label="Shuffle questions" />
              <Flag on={s.shuffleOptions} label="Shuffle options" />
              <Flag on={s.showQuestionNumbers} label="Show question numbers" />
              <Flag on={s.allowBackNavigation} label="Allow going back" />
              <Flag on={s.autoSubmitOnTimeout} label="Auto-submit at time-up" />
              <Flag on={s.allowReviewBeforeSubmit} label="Review before submitting" />
              <Flag on={s.showResultImmediately} label="Show result immediately" />
              <Flag on={s.showAnswersInResult} label="Show answers with result" />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions &amp; students</CardTitle>
            {edit(3)}
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Row label="Questions">{state.questions.length}</Row>
              {Object.entries(byType).map(([type, n]) => (
                <Row key={type} label={QUESTION_TYPE_LABEL[type as QuestionType]}>{n}</Row>
              ))}
              <Row label="Students assigned">{assignedCount}</Row>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
