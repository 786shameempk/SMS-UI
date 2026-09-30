import type { BadgeVariant } from "@/components/ui/badge";
import type { UserRole } from "@/types/auth";
import type {
  ExamSettings,
  MyExamState,
  OnlineExamStatus,
  OnlineExamType,
  QuestionDifficulty,
  QuestionType,
  ResultRowStatus,
} from "./types";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SingleChoice: "Multiple choice",
  MultipleSelect: "Multiple select",
  TrueFalse: "True / False",
  FillInBlank: "Fill in the blank",
  ShortAnswer: "Short answer",
  LongAnswer: "Long answer",
};

export const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[];

/** Choice questions carry options; the rest are typed answers. */
export const isChoiceType = (t: QuestionType) => t === "SingleChoice" || t === "MultipleSelect" || t === "TrueFalse";
/** Marked by a teacher rather than automatically. */
export const isSubjectiveType = (t: QuestionType) => t === "ShortAnswer" || t === "LongAnswer";

export const DIFFICULTIES: QuestionDifficulty[] = ["Easy", "Medium", "Hard"];

export const DIFFICULTY_TONE: Record<QuestionDifficulty, BadgeVariant> = { Easy: "success", Medium: "warning", Hard: "danger" };

export const EXAM_TYPE_LABEL: Record<OnlineExamType, string> = {
  ClassTest: "Class test",
  UnitTest: "Unit test",
  Quiz: "Quiz",
  MidTerm: "Mid-term",
  Final: "Final",
  Practice: "Practice",
};

export const EXAM_TYPES = Object.keys(EXAM_TYPE_LABEL) as OnlineExamType[];

export const EXAM_STATUSES: OnlineExamStatus[] = ["Draft", "Scheduled", "Active", "Completed", "Published", "Cancelled"];

export const EXAM_STATUS_TONE: Record<OnlineExamStatus, BadgeVariant> = {
  Draft: "neutral",
  Scheduled: "info",
  Active: "danger",
  Completed: "warning",
  Published: "success",
  Cancelled: "neutral",
};

export const EXAM_STATUS_LABEL: Record<OnlineExamStatus, string> = {
  Draft: "Draft",
  Scheduled: "Scheduled",
  Active: "Live now",
  Completed: "Completed",
  Published: "Results published",
  Cancelled: "Cancelled",
};

export const RESULT_STATUS_LABEL: Record<ResultRowStatus, string> = {
  Passed: "Passed",
  Failed: "Failed",
  Absent: "Absent",
  PendingEvaluation: "Awaiting evaluation",
  InProgress: "Writing now",
  NotStarted: "Not started",
};

export const RESULT_STATUS_TONE: Record<ResultRowStatus, BadgeVariant> = {
  Passed: "success",
  Failed: "danger",
  Absent: "neutral",
  PendingEvaluation: "warning",
  InProgress: "info",
  NotStarted: "neutral",
};

export const MY_STATE_LABEL: Record<MyExamState, string> = {
  NotStarted: "Not started",
  InProgress: "In progress",
  Submitted: "Submitted",
  Missed: "Missed",
};

export const DEFAULT_SETTINGS: ExamSettings = {
  passingMarks: 0,
  maxAttempts: 1,
  shuffleQuestions: false,
  shuffleOptions: false,
  showQuestionNumbers: true,
  allowBackNavigation: true,
  autoSubmitOnTimeout: true,
  showResultImmediately: false,
  allowReviewBeforeSubmit: true,
  showAnswersInResult: false,
  negativeMarkPerWrong: 0,
};

/** Roles AcademicService lets author/evaluate online exams (see OnlineExamAccess). */
const STAFF_ROLES: UserRole[] = ["superAdmin", "admin", "principal", "teacher"];
export const isExamStaff = (role?: UserRole | null) => !!role && STAFF_ROLES.includes(role);
export const isExamStudent = (role?: UserRole | null) => role === "student";

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

/** The browser's zone if it's a real IANA name, else the school default. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** "Tue 14 Oct, 10:30 AM" in the exam's own time zone. */
export function formatExamTime(iso: string, timeZone?: string | null): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone ?? undefined,
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

/** "Tue 14 Oct, 10:30 AM – 11:30 AM" (end date repeated only when it differs). */
export function formatExamWindow(startIso: string, endIso: string, timeZone?: string | null): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const zone = timeZone ?? undefined;
  const day = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: zone });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone });
  return day(start) === day(end) ? `${formatExamTime(startIso, zone)} – ${time(end)}` : `${formatExamTime(startIso, zone)} – ${formatExamTime(endIso, zone)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const formatMarks = (n: number | null | undefined) =>
  n == null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");

export const formatPercent = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 10) / 10}%`);
