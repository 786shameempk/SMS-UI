import type { AdmissionStage, ExamResultStatus, SelectionDecision } from "./types";

/**
 * `Student.className`/`section` are still plain strings, not id-linked into the Academic
 * Management module's real `Class`/`Section` records (a known follow-up — see PROGRESS.md).
 * This local list is what every student-facing class picker in this feature uses; it's kept
 * in sync by name with academics' own seeded classes ("Grade 1".."Grade 10") so admissions'
 * seat-availability lookup (`getSeatAvailability`) can join the two by name.
 */
export const CLASS_OPTIONS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export const SECTION_OPTIONS = ["A", "B", "C"] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"] as const;

export const GUARDIAN_RELATIONS = ["father", "mother", "guardian"] as const;

export const DOCUMENT_CATEGORIES = [
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "id_proof", label: "ID Proof" },
  { value: "photo", label: "Photo" },
  { value: "medical_record", label: "Medical Record" },
  { value: "other", label: "Other" },
] as const;

export function nextClass(className: string): string | null {
  const idx = CLASS_OPTIONS.indexOf(className as (typeof CLASS_OPTIONS)[number]);
  if (idx === -1 || idx === CLASS_OPTIONS.length - 1) return null;
  return CLASS_OPTIONS[idx + 1];
}

export const FINAL_CLASS = CLASS_OPTIONS[CLASS_OPTIONS.length - 1];

// ── Admission pipeline ──────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

/** Linear order of the pipeline's forward-progress stages, for a stepper/progress display. */
export const ADMISSION_STAGE_ORDER: AdmissionStage[] = [
  "inquiry",
  "registration",
  "entrance_exam",
  "interview",
  "fee_collection",
  "enrolled",
];

export const ADMISSION_STAGE_CONFIG: Record<AdmissionStage, { label: string; variant: BadgeVariant }> = {
  inquiry: { label: "Inquiry", variant: "neutral" },
  registration: { label: "Registration", variant: "info" },
  entrance_exam: { label: "Entrance Exam", variant: "info" },
  interview: { label: "Interview", variant: "info" },
  fee_collection: { label: "Fee Collection", variant: "warning" },
  enrolled: { label: "Enrolled", variant: "success" },
  waitlisted: { label: "Waitlisted", variant: "warning" },
  rejected: { label: "Rejected", variant: "danger" },
  withdrawn: { label: "Withdrawn", variant: "neutral" },
};

/** Flat processing fee charged once an applicant is selected, due before enrollment. */
export const ADMISSION_FEE_AMOUNT = 2000;

export const EXAM_STATUS_OPTIONS: Array<{ value: ExamResultStatus; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "absent", label: "Absent" },
];

export const DECISION_OPTIONS: Array<{ value: SelectionDecision; label: string }> = [
  { value: "selected", label: "Select for admission" },
  { value: "waitlisted", label: "Waitlist" },
  { value: "rejected", label: "Reject" },
];

export const PAYMENT_MODE_OPTIONS = ["Cash", "Card", "UPI", "Bank Transfer", "Cheque"] as const;
