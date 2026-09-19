import type { LessonPlanStatus } from "./types";

export const LESSON_PLAN_STATUSES: { value: LessonPlanStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];
