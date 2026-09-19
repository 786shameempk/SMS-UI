import type { AuditCategory, LocalizationSettings, SchoolProfile } from "./types";
import type { BrandPresetKey } from "./theme";

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  name: "EduCore International School",
  tagline: "Learning, elevated.",
  address: "123 Residency Road, Bengaluru, Karnataka 560025",
  phone: "+91 80 4567 8900",
  email: "info@educore.dev",
  principalName: "Meera Iyer",
  establishedYear: 1998,
};

export const DEFAULT_LOCALIZATION: LocalizationSettings = {
  language: "en-IN",
  timezone: "Asia/Kolkata",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
};

export const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "en-IN", label: "English (India)" },
  { value: "en-US", label: "English (US)" },
  { value: "hi-IN", label: "Hindi" },
  { value: "kn-IN", label: "Kannada" },
];

export const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Asia/Kolkata", label: "(GMT+5:30) India Standard Time" },
  { value: "Asia/Dubai", label: "(GMT+4:00) Gulf Standard Time" },
  { value: "Asia/Singapore", label: "(GMT+8:00) Singapore Time" },
  { value: "Europe/London", label: "(GMT+0:00) London" },
  { value: "America/New_York", label: "(GMT-5:00) Eastern Time" },
];

export const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "INR", label: "₹ Indian Rupee (INR)" },
  { value: "USD", label: "$ US Dollar (USD)" },
  { value: "GBP", label: "£ British Pound (GBP)" },
  { value: "AED", label: "د.إ UAE Dirham (AED)" },
];

export const DATE_FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export const BRAND_PRESET_OPTIONS: Array<{ value: BrandPresetKey; label: string }> = [
  { value: "blue", label: "Blue" },
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
];

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const AUDIT_CATEGORY_CONFIG: Record<AuditCategory, { label: string; variant: BadgeVariant }> = {
  settings: { label: "Settings", variant: "info" },
  security: { label: "Security", variant: "danger" },
  data: { label: "Data", variant: "warning" },
  user: { label: "User", variant: "neutral" },
  system: { label: "System", variant: "success" },
};
