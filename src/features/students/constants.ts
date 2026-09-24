import type { AdmissionStage, ExamResultStatus, SelectionDecision } from "./types";

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
