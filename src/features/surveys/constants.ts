import type { QuestionType, RespondentType, SurveyAudience, SurveyStatus } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 10;
export const MIN_CHOICE_OPTIONS = 2;
export const MAX_CHOICE_OPTIONS = 6;
export const RATING_SCALE = [1, 2, 3, 4, 5] as const;

export const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string }> = {
  rating: { label: "Rating (1–5)" },
  multiple_choice: { label: "Multiple choice" },
  yes_no: { label: "Yes / No" },
  text: { label: "Open text" },
};

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = (Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[]).map((value) => ({
  value,
  label: QUESTION_TYPE_CONFIG[value].label,
}));

export const SURVEY_STATUS_CONFIG: Record<SurveyStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "neutral" },
  published: { label: "Published", variant: "success" },
  closed: { label: "Closed", variant: "warning" },
};

export const AUDIENCE_CONFIG: Record<SurveyAudience, { label: string }> = {
  students: { label: "Students" },
  parents: { label: "Parents" },
  staff: { label: "Staff" },
  all: { label: "Everyone" },
};

export const AUDIENCE_OPTIONS: Array<{ value: SurveyAudience; label: string }> = (Object.keys(AUDIENCE_CONFIG) as SurveyAudience[]).map((value) => ({
  value,
  label: AUDIENCE_CONFIG[value].label,
}));

export const RESPONDENT_TYPE_OPTIONS: Array<{ value: RespondentType; label: string }> = [
  { value: "student", label: "A student" },
  { value: "parent", label: "A parent / guardian" },
  { value: "staff", label: "A staff member" },
  { value: "anonymous", label: "Anonymous" },
];

export function todayDateValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
