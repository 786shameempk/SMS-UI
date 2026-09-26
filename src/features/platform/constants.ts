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
  growth: { label: "Growth" },
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

/** Part of every plan, so a school admin can never be locked out of administering their school. */
export const ALWAYS_INCLUDED_PLAN_MODULES = ["Dashboard", "User Management", "Roles & Permissions", "Settings"];

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSubdomain(value: string): boolean {
  return SLUG_PATTERN.test(value) && value.length >= 2 && value.length <= 40;
}
