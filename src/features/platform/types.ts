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
  /** True for exactly one seeded tenant — the school this running app's own data belongs to. */
  isCurrentEnvironment: boolean;
  /** Only meaningful when isCurrentEnvironment is false; the current-environment tenant's
   *  counts are always read live from the real students/staff modules instead. */
  seedStudentCount?: number;
  seedStaffCount?: number;
  seedStorageUsedGb?: number;
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
