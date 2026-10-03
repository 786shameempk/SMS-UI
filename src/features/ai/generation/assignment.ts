import type { Homework, LessonPlan, Worksheet } from "./types";

/** AcademicService's homework limits (CreateHomeworkCommandValidator). */
export const HOMEWORK_TITLE_MAX = 200;
export const HOMEWORK_DESCRIPTION_MAX = 2000;

/** What students read on the homework: instructions and tasks, plus the optional extension and support tasks. */
export function homeworkToAssignmentText(hw: Homework): string {
  const lines = [hw.instructions.trim(), ""];
  hw.tasks.forEach((t, i) => lines.push(`${i + 1}. ${t.description.trim()} (about ${t.estimatedMinutes} min)`));
  if (hw.extensionTask.trim()) lines.push("", `Challenge: ${hw.extensionTask.trim()}`);
  if (hw.supportTask.trim()) lines.push("", `Need help? ${hw.supportTask.trim()}`);
  return lines.join("\n").trim();
}

/** A worksheet as homework text. Answers are never included: students see the questions only. */
export function worksheetToAssignmentText(sheet: Worksheet): string {
  const lines: string[] = [];
  let n = 0;
  for (const section of sheet.sections) {
    if (lines.length) lines.push("");
    lines.push(`${section.kind}: ${section.instructions.trim()}`);
    for (const item of section.items) {
      n += 1;
      const options = item.options.length ? ` (${item.options.join(" / ")})` : "";
      lines.push(`${n}. ${item.prompt.trim()}${options}`);
    }
  }
  return lines.join("\n");
}

/** AcademicService's lesson plan description limit (CreateLessonPlanCommandValidator). */
export const LESSON_PLAN_DESCRIPTION_MAX = 4000;

/** A lesson plan as the plain text stored in the Lesson Plans module, trimmed to fit its limit. */
export function lessonPlanToText(p: LessonPlan): string {
  const act = (a: { title: string; minutes: number; description: string }) => `- ${a.title} (${a.minutes} min): ${a.description.trim()}`;
  const lines = [
    "Learning objectives:",
    ...p.learningObjectives.map((o) => `- ${o.trim()}`),
    "",
    "Introduction:",
    act(p.introduction),
    "",
    "Teaching activities:",
    ...p.teachingActivities.map(act),
    "",
    "Student activities:",
    ...p.studentActivities.map(act),
  ];
  if (p.examples.length) lines.push("", "Examples:", ...p.examples.map((e) => `- ${e.trim()}`));
  lines.push("", `Assessment: ${p.assessment.trim()}`, `Homework: ${p.homework.trim()}`);
  if (p.materialsRequired.length) lines.push(`Materials: ${p.materialsRequired.join(", ")}`);
  if (p.differentiationSuggestions.length) lines.push("", "Differentiation:", ...p.differentiationSuggestions.map((d) => `- ${d.trim()}`));
  const text = lines.join("\n").trim();
  return text.length > LESSON_PLAN_DESCRIPTION_MAX ? `${text.slice(0, LESSON_PLAN_DESCRIPTION_MAX - 1)}…` : text;
}
