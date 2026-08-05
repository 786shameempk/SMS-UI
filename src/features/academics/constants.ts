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
