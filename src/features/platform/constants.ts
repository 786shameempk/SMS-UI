import { PERMISSION_MODULES } from "@/features/administration/roles/constants";
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
  growth: { label: "Professional" },
  enterprise: { label: "Enterprise" },
};

export const PLAN_TIER_OPTIONS: Array<{ value: PlanTier; label: string }> = (Object.keys(PLAN_TIER_CONFIG) as PlanTier[]).map((value) => ({
  value,
  label: PLAN_TIER_CONFIG[value].label,
}));

/**
 * What a subscription plan can include: every Roles & Permissions matrix module (the same names, so a
 * school's plan directly decides which matrix rows its admins can grant) except the Platform Console,
 * which is the platform operator's own screen. Mirrors AuthService's PermissionMatrix.PlanModules.
 */
export const AVAILABLE_MODULE_LABELS: string[] = PERMISSION_MODULES.filter((m) => m !== "Platform Console");

/**
 * The plan's modules laid out the way the school's menu groups them, so choosing a plan reads like building the menu: every module
 * appears in exactly one group (a test keeps this in step with the catalog above), and a group can be switched on or off as a whole.
 */
export const PLAN_MODULE_GROUPS: ReadonlyArray<{ title: string; modules: string[] }> = [
  { title: "Everyday", modules: ["Dashboard", "AI Features", "Notifications", "Calendar", "Online Classes", "Talent Showcase", "Extra-Curricular", "Parent Portal", "Study Materials"] },
  { title: "Academics", modules: ["Homework", "Students", "Academic Setup", "Attendance", "Teachers", "Timetable", "Examinations"] },
  { title: "Online Exams", modules: ["Online Exams"] },
  { title: "Human Resources", modules: ["Staff Management", "Payroll"] },
  { title: "Finance", modules: ["Fee Management", "Accounting"] },
  { title: "Campus Operations", modules: ["Library Management", "Transport Management", "Hostel Management", "Inventory Management", "Visitor Management", "Health & Medical"] },
  { title: "Engagement", modules: ["Communication Center", "Surveys & Feedback", "Complaint / Help Desk", "Certificate Generator"] },
  { title: "Insights", modules: ["Reports & Analytics"] },
  { title: "Administration", modules: ["User Management", "Roles & Permissions", "Branch Management", "Settings"] },
];

/** Part of every plan, so a school admin can never be locked out of administering their school. */
export const ALWAYS_INCLUDED_PLAN_MODULES = ["Dashboard", "User Management", "Roles & Permissions", "Settings"];

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSubdomain(value: string): boolean {
  return SLUG_PATTERN.test(value) && value.length >= 2 && value.length <= 40;
}
