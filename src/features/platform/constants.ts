import type { PlanTier, TenantStatus } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const TENANT_STATUS_CONFIG: Record<TenantStatus, { label: string; variant: BadgeVariant }> = {
  trial: { label: "Trial", variant: "info" },
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

export const PLAN_TIER_CONFIG: Record<PlanTier, { label: string }> = {
  starter: { label: "Starter" },
  growth: { label: "Growth" },
  enterprise: { label: "Enterprise" },
};

export const PLAN_TIER_OPTIONS: Array<{ value: PlanTier; label: string }> = (Object.keys(PLAN_TIER_CONFIG) as PlanTier[]).map((value) => ({
  value,
  label: PLAN_TIER_CONFIG[value].label,
}));

/** Illustrative catalog of module labels a plan can include — mirrors this app's own nav sections. */
export const AVAILABLE_MODULE_LABELS = [
  "Dashboard",
  "Student Management",
  "Academics",
  "Attendance",
  "Staff & Teachers",
  "Timetable",
  "Examinations",
  "Homework",
  "Fee Management",
  "Accounting",
  "Payroll",
  "Inventory",
  "Certificates",
  "Health & Medical",
  "Visitor Management",
  "Help Desk",
  "Surveys & Feedback",
  "Library",
  "Transport",
  "Hostel",
  "Communication",
  "Reports & Analytics",
];

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSubdomain(value: string): boolean {
  return SLUG_PATTERN.test(value) && value.length >= 2 && value.length <= 40;
}
