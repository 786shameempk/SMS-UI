import type { BookLoanStatus, LibraryMemberStatus, LibraryPersonType, ReservationStatus } from "./types";

/** Flat fine charged per calendar day a loan remains unreturned past its due date. */
export const FINE_PER_DAY = 5;

export const DEFAULT_LOAN_PERIOD_DAYS = 14;

export const PERSON_TYPE_OPTIONS: Array<{ value: LibraryPersonType; label: string }> = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Staff" },
];

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const MEMBER_STATUS_CONFIG: Record<LibraryMemberStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "danger" },
};

export const LOAN_STATUS_CONFIG: Record<BookLoanStatus, { label: string; variant: BadgeVariant }> = {
  issued: { label: "Issued", variant: "info" },
  returned: { label: "Returned", variant: "success" },
  overdue: { label: "Overdue", variant: "danger" },
};

export const RESERVATION_STATUS_CONFIG: Record<ReservationStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pending", variant: "warning" },
  fulfilled: { label: "Fulfilled", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};
