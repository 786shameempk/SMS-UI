/** Date presets for report filters. Everything is plain yyyy-mm-dd text, worked out on local calendar dates. */

export type DatePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "lastQuarter"
  | "thisAcademicYear"
  | "lastAcademicYear"
  | "thisCalendarYear"
  | "lastCalendarYear"
  | "last7"
  | "last30"
  | "last90"
  | "month"
  | "custom";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "Current week" },
  { value: "lastWeek", label: "Previous week" },
  { value: "thisMonth", label: "Current month" },
  { value: "lastMonth", label: "Previous month" },
  { value: "thisQuarter", label: "Current quarter" },
  { value: "lastQuarter", label: "Previous quarter" },
  { value: "thisAcademicYear", label: "Current academic year" },
  { value: "lastAcademicYear", label: "Previous academic year" },
  { value: "thisCalendarYear", label: "Current calendar year" },
  { value: "lastCalendarYear", label: "Previous calendar year" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "month", label: "Specific month and year" },
  { value: "custom", label: "Custom date range" },
];

export interface DateRange {
  from: string;
  to: string;
}

export interface YearBounds {
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parse(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shift(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Monday of the week containing <paramref name="d"/> (weeks run Monday to Sunday). */
function weekStart(d: Date): Date {
  return shift(d, -((d.getDay() + 6) % 7));
}

/** The first and last day of the month <paramref name="offset"/> months from <paramref name="d"/>'s month. */
function monthSpan(d: Date, offset: number): DateRange {
  const first = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return { from: toKey(first), to: toKey(new Date(first.getFullYear(), first.getMonth() + 1, 0)) };
}

function quarterSpan(d: Date, offset: number): DateRange {
  const startMonth = Math.floor(d.getMonth() / 3) * 3 + offset * 3;
  const first = new Date(d.getFullYear(), startMonth, 1);
  return { from: toKey(first), to: toKey(new Date(first.getFullYear(), first.getMonth() + 3, 0)) };
}

/** The school's own academic years decide this (they need not follow the calendar year). */
export function currentAcademicYear(years: YearBounds[], today: Date): YearBounds | null {
  const key = toKey(today);
  return years.find((y) => y.startDate <= key && key <= y.endDate) ?? years.find((y) => y.isCurrent) ?? null;
}

export function previousAcademicYear(years: YearBounds[], today: Date): YearBounds | null {
  const current = currentAcademicYear(years, today);
  if (!current) return null;
  const earlier = years.filter((y) => y.endDate < current.startDate).sort((a, b) => b.endDate.localeCompare(a.endDate));
  return earlier[0] ?? null;
}

/**
 * The date range a preset stands for, or null when it cannot be worked out (no academic year configured, or "custom"/"month",
 * which the user fills in). A range never extends past today unless the preset is a whole period such as a year.
 */
export function resolvePreset(preset: DatePreset, today: Date, years: YearBounds[] = []): DateRange | null {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (preset) {
    case "today":
      return { from: toKey(t), to: toKey(t) };
    case "yesterday":
      return { from: toKey(shift(t, -1)), to: toKey(shift(t, -1)) };
    case "thisWeek":
      return { from: toKey(weekStart(t)), to: toKey(shift(weekStart(t), 6)) };
    case "lastWeek":
      return { from: toKey(shift(weekStart(t), -7)), to: toKey(shift(weekStart(t), -1)) };
    case "thisMonth":
      return monthSpan(t, 0);
    case "lastMonth":
      return monthSpan(t, -1);
    case "thisQuarter":
      return quarterSpan(t, 0);
    case "lastQuarter":
      return quarterSpan(t, -1);
    case "thisAcademicYear": {
      const y = currentAcademicYear(years, t);
      return y ? { from: y.startDate.slice(0, 10), to: y.endDate.slice(0, 10) } : null;
    }
    case "lastAcademicYear": {
      const y = previousAcademicYear(years, t);
      return y ? { from: y.startDate.slice(0, 10), to: y.endDate.slice(0, 10) } : null;
    }
    case "thisCalendarYear":
      return { from: `${t.getFullYear()}-01-01`, to: `${t.getFullYear()}-12-31` };
    case "lastCalendarYear":
      return { from: `${t.getFullYear() - 1}-01-01`, to: `${t.getFullYear() - 1}-12-31` };
    case "last7":
      return { from: toKey(shift(t, -6)), to: toKey(t) };
    case "last30":
      return { from: toKey(shift(t, -29)), to: toKey(t) };
    case "last90":
      return { from: toKey(shift(t, -89)), to: toKey(t) };
    default:
      return null;
  }
}

/** The whole of a "yyyy-mm" month. */
export function monthRange(monthValue: string): DateRange | null {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;
  const first = parse(`${monthValue}-01`);
  return { from: toKey(first), to: toKey(new Date(first.getFullYear(), first.getMonth() + 1, 0)) };
}

/** A problem with a start/end pair, or null when both are fine (either may be empty). */
export function validateRange(from: string, to: string): string | null {
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) return "Enter the start date as a valid date.";
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) return "Enter the end date as a valid date.";
  if (from && to && from > to) return "The start date must be on or before the end date.";
  return null;
}
