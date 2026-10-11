import type { BrandPresetKey } from "./theme";

export interface SchoolProfile {
  name: string;
  tagline?: string;
  address: string;
  phone: string;
  email: string;
  principalName?: string;
  establishedYear?: number;
  /** Ready-to-use link to the uploaded logo; undefined = School Sphere's logo is shown. Changed only through the logo upload. */
  logoUrl?: string;
}

export type SchoolProfileFormValues = Omit<SchoolProfile, "logoUrl">;

export interface LocalizationSettings {
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
}

export type LocalizationFormValues = LocalizationSettings;

export type TemplateChannel = "email" | "sms";

export interface SystemTemplate {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  channel: TemplateChannel;
  subject?: string;
  body: string;
  variables: string[];
}

export interface SystemTemplateFormValues {
  subject?: string;
  body: string;
}

export type AuditCategory = "settings" | "security" | "data" | "user" | "system";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  actor: string;
  action: string;
  category: AuditCategory;
  detail?: string;
  createdAt: string;
}

export type BackupEventType = "export" | "restore";

export interface BackupEvent {
  id: string;
  tenantId: string;
  type: BackupEventType;
  createdAt: string;
  /** Email of whoever exported/restored. */
  actor?: string | null;
}

export interface BrandingSettings {
  preset: BrandPresetKey;
}

export type SubscriptionStatus = "Trial" | "Active" | "Suspended" | "Cancelled";

/** The school's own plan (Settings → Subscription). Pricing is private and never part of this. */
export interface Subscription {
  schoolName: string;
  status: SubscriptionStatus;
  /** Null for a school that predates plans: nothing is capped and every module is included. */
  planName: string | null;
  tier: "Starter" | "Growth" | "Enterprise" | null;
  maxStudents: number | null;
  maxStaff: number | null;
  storageGb: number | null;
  includedModules: string[];
  availableModules: string[];
  subscribedSince: string;
  billingContactName: string;
  billingContactEmail: string;
  /** Set when the School Sphere office manages this school; the rest are then filled in. Never a price. */
  managedByOffice?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  daysLeft?: number | null;
  graceDays?: number | null;
  subscriptionState?: string | null;
  noticeLevel?: SubscriptionNoticeLevel;
  notice?: string | null;
  overdueInvoices?: number;
  oldestOverdueDue?: string | null;
}

export type SubscriptionNoticeLevel = "ok" | "notice" | "warning" | "critical";

export interface PlanUsage {
  studentCount: number;
  staffCount: number;
}
