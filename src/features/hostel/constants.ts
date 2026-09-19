import type {
  AllocationStatus,
  DayOfWeek,
  HostelFeePaymentStatus,
  HostelStatus,
  HostelType,
  MealType,
  RoomStatus,
  RoomType,
  VisitorStatus,
} from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const HOSTEL_TYPE_OPTIONS: Array<{ value: HostelType; label: string }> = [
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
  { value: "co-ed", label: "Co-ed" },
];

export const HOSTEL_STATUS_CONFIG: Record<HostelStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
};

export const ROOM_TYPE_OPTIONS: Array<{ value: RoomType; label: string }> = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "triple", label: "Triple" },
  { value: "dormitory", label: "Dormitory" },
];

export const ROOM_STATUS_CONFIG: Record<RoomStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  maintenance: { label: "Maintenance", variant: "warning" },
};

export const ALLOCATION_STATUS_CONFIG: Record<AllocationStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  vacated: { label: "Vacated", variant: "neutral" },
};

export const VISITOR_STATUS_CONFIG: Record<VisitorStatus, { label: string; variant: BadgeVariant }> = {
  "checked-in": { label: "Checked in", variant: "info" },
  "checked-out": { label: "Checked out", variant: "neutral" },
};

export const HOSTEL_FEE_STATUS_CONFIG: Record<HostelFeePaymentStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pending", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
};

export const DAYS_OF_WEEK: Array<{ value: DayOfWeek; label: string }> = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export const MEAL_TYPES: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "snacks", label: "Snacks" },
  { value: "dinner", label: "Dinner" },
];

/** Formats a (year, 0-indexed month) pair as "YYYY-MM" using local calendar fields, never a UTC conversion — `Date#toISOString` shifts a local midnight backward a day in positive-UTC-offset timezones. */
export function monthKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return monthKey(now.getFullYear(), now.getMonth());
}

export function previousMonthKey(): string {
  const now = new Date();
  const monthIndex0 = now.getMonth() - 1;
  return monthIndex0 < 0 ? monthKey(now.getFullYear() - 1, 11) : monthKey(now.getFullYear(), monthIndex0);
}
