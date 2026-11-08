export const ACADEMIC_YEAR_STATUSES = ["upcoming", "active", "closed"] as const;

export const TERM_STATUSES = ["upcoming", "ongoing", "completed"] as const;

export const SUBJECT_TYPES = ["core", "elective"] as const;

export const CALENDAR_EVENT_TYPES = [
  { value: "term_start", label: "Term start" },
  { value: "term_end", label: "Term end" },
  { value: "exam", label: "Exam window" },
  { value: "holiday", label: "Holiday" },
  { value: "other", label: "Other" },
] as const;

/** Local today as YYYY-MM-DD. */
function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Term status derived from its from/to dates versus today (dates are YYYY-MM-DD, inclusive). */
export function computeTermStatus(startDate: string, endDate: string, now: Date = new Date()): (typeof TERM_STATUSES)[number] {
  const today = todayIso(now);
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "ongoing";
}

export function statusBadgeVariant(status: string): "success" | "warning" | "neutral" | "info" {
  switch (status) {
    case "active":
    case "ongoing":
      return "success";
    case "upcoming":
      return "info";
    case "closed":
    case "completed":
      return "neutral";
    default:
      return "neutral";
  }
}
