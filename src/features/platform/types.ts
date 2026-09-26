export type TenantStatus = "trial" | "active" | "suspended" | "cancelled";
export type PlanTier = "starter" | "growth" | "enterprise";

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  monthlyPriceInr: number;
  maxStudents: number;
  maxStaff: number;
  storageGb: number;
  includedModules: string[];
}

export interface PlanFormValues {
  tier: PlanTier;
  name: string;
  monthlyPriceInr: number;
  maxStudents: number;
  maxStaff: number;
  storageGb: number;
  includedModules: string[];
}

export interface Tenant {
  id: string;
  schoolName: string;
  subdomain: string;
  status: TenantStatus;
  planId: string;
  billingContactName: string;
  billingContactEmail: string;
  createdAt: string;
  /** True for the tenant currently selected in the header switcher (protected from suspend/cancel/delete). */
  isCurrentEnvironment: boolean;
}

export interface TenantFormValues {
  schoolName: string;
  subdomain: string;
  planId: string;
  billingContactName: string;
  billingContactEmail: string;
}

export interface TenantRow extends Tenant {
  plan: Plan;
  studentCount: number;
  staffCount: number;
  /** Not metered yet - always 0; the Tenants table shows the plan quota instead. */
  storageUsedGb: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface AnnouncementFormValues {
  title: string;
  body: string;
  expiresAt?: string;
}

export interface PlatformReportsSummary {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  mrrInr: number;
  totalStudentsAcrossTenants: number;
  totalStaffAcrossTenants: number;
  tenantsByPlan: Array<{ planId: string; planName: string; count: number }>;
}
