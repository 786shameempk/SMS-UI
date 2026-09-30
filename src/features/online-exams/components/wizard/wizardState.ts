import { DEFAULT_SETTINGS, browserTimeZone } from "../../constants";
import { utcToZoned, zonedToUtcIso } from "../../timeZone";
import type { ExamSettings, OnlineExamDetail, OnlineExamInput, OnlineExamType, QuestionContent } from "../../types";
import { validateQuestion } from "../QuestionEditor";

export const ALL_SECTIONS = "__all";

export interface DraftQuestion {
  /** Stable React key for reordering. */
  key: string;
  sourceQuestionId: string | null;
  content: QuestionContent;
}

export type AssignMode = "class" | "sections" | "students";

export interface WizardState {
  name: string;
  description: string;
  academicYearId: string | null;
  examType: OnlineExamType;
  subjectId: string;
  classId: string;
  sectionId: string; // ALL_SECTIONS = whole class
  teacherStaffId: string | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationMinutes: number;
  timeZoneId: string;
  settings: ExamSettings;
  questions: DraftQuestion[];
  assignMode: AssignMode;
  sectionIds: string[];
  studentIds: string[];
}

export const STEPS = ["Basic information", "Schedule", "Configuration", "Questions", "Assign students", "Review & publish"] as const;

let keySeq = 0;
export const newKey = () => `q${Date.now().toString(36)}${(keySeq++).toString(36)}`;

function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function emptyWizard(): WizardState {
  return {
    name: "",
    description: "",
    academicYearId: null,
    examType: "UnitTest",
    subjectId: "",
    classId: "",
    sectionId: ALL_SECTIONS,
    teacherStaffId: null,
    startDate: localDate(1),
    startTime: "10:00",
    endDate: localDate(1),
    endTime: "11:00",
    durationMinutes: 45,
    timeZoneId: browserTimeZone(),
    settings: { ...DEFAULT_SETTINGS },
    questions: [],
    assignMode: "class",
    sectionIds: [],
    studentIds: [],
  };
}

export function fromDetail(e: OnlineExamDetail): WizardState {
  const start = utcToZoned(e.startUtc, e.timeZoneId);
  const end = utcToZoned(e.endUtc, e.timeZoneId);
  const students = e.assignments.filter((a) => a.kind === "Student").map((a) => a.targetId);
  const sections = e.assignments.filter((a) => a.kind === "Section").map((a) => a.targetId);
  return {
    name: e.name,
    description: e.description ?? "",
    academicYearId: e.academicYearId,
    examType: e.examType,
    subjectId: e.subjectId,
    classId: e.classId,
    sectionId: e.sectionId ?? ALL_SECTIONS,
    teacherStaffId: e.teacherStaffId,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    durationMinutes: e.durationMinutes,
    timeZoneId: e.timeZoneId,
    settings: { ...e.settings },
    questions: [...e.questions]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((q) => ({
        key: newKey(),
        sourceQuestionId: q.sourceQuestionId,
        content: {
          type: q.type,
          text: q.text,
          marks: q.marks,
          explanation: q.explanation,
          modelAnswer: q.modelAnswer,
          acceptedAnswers: q.acceptedAnswers,
          caseSensitive: q.caseSensitive,
          options: q.options.length ? [...q.options].sort((a, b) => a.sortOrder - b.sortOrder).map((o) => ({ text: o.text, isCorrect: o.isCorrect })) : null,
        },
      })),
    assignMode: students.length ? "students" : sections.length ? "sections" : "class",
    sectionIds: sections,
    studentIds: students,
  };
}

export const totalMarks = (s: WizardState) => s.questions.reduce((sum, q) => sum + (Number.isFinite(q.content.marks) ? q.content.marks : 0), 0);

export function windowUtc(s: WizardState): { start: string; end: string } | null {
  if (!s.startDate || !s.startTime || !s.endDate || !s.endTime) return null;
  try {
    return { start: zonedToUtcIso(s.startDate, s.startTime, s.timeZoneId), end: zonedToUtcIso(s.endDate, s.endTime, s.timeZoneId) };
  } catch {
    return null;
  }
}

export function toInput(s: WizardState): OnlineExamInput {
  const w = windowUtc(s)!;
  const assignments =
    s.assignMode === "students"
      ? s.studentIds.map((id) => ({ kind: "Student" as const, targetId: id }))
      : s.assignMode === "sections"
        ? s.sectionIds.map((id) => ({ kind: "Section" as const, targetId: id }))
        : [{ kind: "Class" as const, targetId: s.classId }];
  return {
    name: s.name.trim(),
    description: s.description.trim() || null,
    academicYearId: s.academicYearId,
    examType: s.examType,
    subjectId: s.subjectId,
    classId: s.classId,
    sectionId: s.sectionId === ALL_SECTIONS ? null : s.sectionId,
    teacherStaffId: s.teacherStaffId,
    startUtc: w.start,
    endUtc: w.end,
    durationMinutes: s.durationMinutes,
    timeZoneId: s.timeZoneId,
    settings: s.settings,
    questions: s.questions.map((q) => ({ sourceQuestionId: q.sourceQuestionId, content: q.content })),
    assignments,
  };
}

/** Errors that stop moving past a step (keyed by field). */
export function validateStep(step: number, s: WizardState): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (s.name.trim().length < 3) e.name = "Give the exam a name (at least 3 characters).";
    if (!s.subjectId) e.subjectId = "Choose a subject.";
    if (!s.classId) e.classId = "Choose a class.";
  }
  if (step === 1) {
    const w = windowUtc(s);
    if (!w) e.window = "Enter the start and end date and time.";
    else {
      const minutes = (Date.parse(w.end) - Date.parse(w.start)) / 60000;
      if (minutes <= 0) e.window = "The exam must end after it starts.";
      else if (s.durationMinutes > minutes) e.durationMinutes = `The duration can't be longer than the exam window (${Math.floor(minutes)} min).`;
    }
    if (!Number.isFinite(s.durationMinutes) || s.durationMinutes < 1 || s.durationMinutes > 600) e.durationMinutes = "Duration must be between 1 and 600 minutes.";
  }
  if (step === 2) {
    if (!Number.isFinite(s.settings.passingMarks) || s.settings.passingMarks < 0) e.passingMarks = "Passing marks can't be negative.";
    if (!Number.isFinite(s.settings.maxAttempts) || s.settings.maxAttempts < 1 || s.settings.maxAttempts > 5) e.maxAttempts = "Allow between 1 and 5 attempts.";
    if (!Number.isFinite(s.settings.negativeMarkPerWrong) || s.settings.negativeMarkPerWrong < 0) e.negativeMarkPerWrong = "Can't be negative.";
  }
  if (step === 3) {
    const bad = s.questions.findIndex((q) => Object.keys(validateQuestion(q.content)).length > 0);
    if (bad >= 0) e.questions = `Question ${bad + 1} is incomplete - open it to fix.`;
  }
  if (step === 4) {
    if (s.assignMode === "sections" && s.sectionIds.length === 0) e.assign = "Choose at least one section.";
    if (s.assignMode === "students" && s.studentIds.length === 0) e.assign = "Choose at least one student.";
  }
  return e;
}

/** Problems that block scheduling/publishing (a draft can still be saved). */
export function publishBlockers(s: WizardState, assignedCount: number): string[] {
  const list: string[] = [];
  if (s.questions.length === 0) list.push("Add at least one question.");
  const total = totalMarks(s);
  if (s.settings.passingMarks > total) list.push(`Passing marks (${s.settings.passingMarks}) are more than the total (${total}).`);
  if (assignedCount === 0) list.push("No students are selected.");
  const w = windowUtc(s);
  if (w && Date.parse(w.end) <= Date.now()) list.push("The exam's end time has already passed.");
  return list;
}
