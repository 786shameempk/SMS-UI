import type { PreApprovalStatus, VisitorStatus, VisitPurpose } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const VISITOR_STATUS_CONFIG: Record<VisitorStatus, { label: string; variant: BadgeVariant }> = {
  "checked-in": { label: "Checked in", variant: "success" },
  "checked-out": { label: "Checked out", variant: "neutral" },
};

export const PURPOSE_CONFIG: Record<VisitPurpose, { label: string }> = {
  meeting: { label: "Meeting" },
  pickup: { label: "Student pickup" },
  delivery: { label: "Delivery" },
  maintenance: { label: "Maintenance / contractor" },
  interview: { label: "Interview" },
  event: { label: "Event / function" },
  other: { label: "Other" },
};

export const PURPOSE_OPTIONS: Array<{ value: VisitPurpose; label: string }> = (Object.keys(PURPOSE_CONFIG) as VisitPurpose[]).map((value) => ({
  value,
  label: PURPOSE_CONFIG[value].label,
}));

export const ID_PROOF_TYPES = ["Aadhaar", "Driving License", "Passport", "Voter ID", "PAN Card", "Other"];

export const PRE_APPROVAL_STATUS_CONFIG: Record<PreApprovalStatus, { label: string; variant: BadgeVariant }> = {
  scheduled: { label: "Scheduled", variant: "info" },
  arrived: { label: "Arrived", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  "no-show": { label: "No-show", variant: "danger" },
};

/**
 * A `datetime-local` input's value must be local wall-clock time; building it via
 * `toISOString()` shifts by the UTC offset (the timezone bug documented in PROGRESS.md
 * for month-key derivation), so this formats straight from local getters instead.
 */
export function nowLocalDateTimeValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function nextBadgeNumber(existingBadges: string[]): string {
  const max = existingBadges.reduce((acc, badge) => {
    const match = badge.match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `VIS-${String(max + 1).padStart(4, "0")}`;
}
