/** Shapes of the office portal API (AuthService `api/office/*`). */

export interface Paged<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface OfficeUser {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  role: string;
  permissions: string[];
  mfaEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
}

/** The next step of sign-in, or "authenticated" with the tokens. */
export type OfficeAuthStatus = "authenticated" | "mfaRequired" | "mfaSetupRequired" | "passwordChangeRequired";

export interface OfficeAuthResult {
  status: OfficeAuthStatus;
  accessToken: string | null;
  expiresAt: string | null;
  challengeToken: string | null;
  user: OfficeUser | null;
}

export interface MfaEnrollment {
  secret: string;
  otpAuthUri: string;
}

export interface OfficeUserListItem {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  invitationPending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  activeSessions: number;
}

export interface OfficeSession {
  sessionId: string;
  startedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface OfficeRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  users: number;
}

export interface OfficePermission {
  key: string;
  group: string;
  label: string;
}

export interface OfficeAuditEntry {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  tenantId: string | null;
  outcome: "Success" | "Failure" | "Denied";
  details: string | null;
  ipAddress: string | null;
}

// ── Plans, add-ons and pricing ───────────────────────────────────────────────

export type BillingCycle = "Monthly" | "Quarterly" | "Annual" | "Custom";

export interface PlanListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "Draft" | "Active" | "Archived";
  publishedVersion: number | null;
  basePrice: number | null;
  billingCycle: BillingCycle | null;
  currencyCode: string | null;
  hasDraft: boolean;
  versions: number;
  createdAt: string;
}

export interface PlanVersion {
  id: string;
  versionNumber: number;
  status: "Draft" | "Published" | "Retired";
  billingCycle: BillingCycle;
  cycleMonths: number;
  currencyCode: string;
  basePrice: number;
  taxRatePercent: number;
  includedStudents: number;
  extraStudentPrice: number;
  maxBranches: number;
  extraBranchPrice: number;
  maxUsers: number;
  storageGb: number;
  modules: string[];
  aiFeatures: string[];
  mobileApps: string[];
  features: string[];
  trialDays: number;
  graceDays: number;
  autoRenew: boolean;
  renewalRules: string | null;
  upgradePolicy: string | null;
  downgradePolicy: string | null;
  changeNotes: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export type PlanVersionRequest = Omit<PlanVersion, "id" | "versionNumber" | "status" | "createdAt" | "publishedAt" | "cycleMonths"> & { cycleMonths: number | null };

export interface PlanDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: PlanListItem["status"];
  versions: PlanVersion[];
}

export type AddonKind = "Module" | "AiFeature" | "MobileApp" | "Feature" | "Service";
export type AddonPricing = "Flat" | "PerStudent" | "OneTime";

export interface Addon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  kind: AddonKind;
  entitlementKey: string | null;
  pricing: AddonPricing;
  unitPrice: number;
  isActive: boolean;
}

export type AddonRequest = Omit<Addon, "id">;

export interface CatalogItem {
  key: string;
  label: string;
  description: string | null;
}

export interface Catalog {
  modules: CatalogItem[];
  aiFeatures: CatalogItem[];
  mobileApps: CatalogItem[];
  features: CatalogItem[];
  alwaysIncludedModules: string[];
}

export interface QuoteLine {
  code: string;
  description: string;
  kind: string;
  unitPrice: number;
  quantity: number;
  cycles: number;
  amount: number;
  recurring: boolean;
}

export interface QuoteScheduleItem {
  label: string;
  percent: number;
  dueInDays: number;
  amount: number;
}

export interface QuoteEntitlements {
  modules: string[];
  aiFeatures: string[];
  mobileApps: string[];
  features: string[];
  maxStudents: number;
  maxBranches: number;
  maxUsers: number;
  storageGb: number;
}

export interface QuoteBreakdown {
  currency: string;
  contractMonths: number;
  cycleMonths: number;
  cycles: number;
  billingFrequency: string;
  lines: QuoteLine[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxableAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
  amountPerCycle: number;
  renewalAmount: number;
  schedule: QuoteScheduleItem[];
  requiresHighDiscountApproval: boolean;
  entitlements: QuoteEntitlements;
}

/** What a person chooses; the server prices it. */
export interface QuoteSelection {
  planVersionId: string;
  contractMonths: number;
  students: number;
  branches: number;
  addons: Array<{ code: string; quantity: number }>;
  discountKind: "Percent" | "Fixed" | null;
  discountValue: number;
  milestones: Array<{ label: string; percent: number; dueInDays: number }> | null;
  installments: number | null;
  removedModules: string[];
}
