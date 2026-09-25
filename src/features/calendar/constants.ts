import type { CalendarEventCategory } from "./types";

export const CATEGORY_CONFIG: Record<CalendarEventCategory, { label: string; dotClass: string; badgeVariant: "default" | "success" | "warning" | "danger" | "info" | "neutral" }> = {
  holiday: { label: "Holiday", dotClass: "bg-amber-500", badgeVariant: "warning" },
  exam: { label: "Exam", dotClass: "bg-red-500", badgeVariant: "danger" },
  academic: { label: "Academic calendar", dotClass: "bg-violet-500", badgeVariant: "info" },
  event: { label: "Event", dotClass: "bg-blue-500", badgeVariant: "info" },
  homework: { label: "Homework due", dotClass: "bg-emerald-500", badgeVariant: "success" },
  leave: { label: "Staff on leave", dotClass: "bg-orange-500", badgeVariant: "warning" },
  birthday: { label: "Birthday", dotClass: "bg-pink-500", badgeVariant: "neutral" },
  online: { label: "Online classes", dotClass: "bg-sky-500", badgeVariant: "info" },
};

export const CATEGORY_ORDER: CalendarEventCategory[] = ["holiday", "exam", "academic", "event", "homework", "leave", "birthday", "online"];
