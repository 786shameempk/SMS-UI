import type { DashboardDateRange, DateRangePreset } from "./types";

export const DATE_RANGE_PRESET_OPTIONS: Array<{ value: DateRangePreset; label: string }> = [
  { value: "thisYear", label: "This year" },
  { value: "last3Months", label: "Last 3 months" },
  { value: "last6Months", label: "Last 6 months" },
  { value: "custom", label: "Custom range" },
];

export const DEFAULT_DATE_RANGE: DashboardDateRange = { preset: "last6Months" };

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Resolves a preset to concrete, inclusive start/end dates (local time). */
export function resolveDateRange(range: DashboardDateRange): { start: Date; end: Date } {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  switch (range.preset) {
    case "thisYear":
      return { start: new Date(today.getFullYear(), 0, 1), end };
    case "last3Months":
      return { start: new Date(today.getFullYear(), today.getMonth() - 2, 1), end };
    case "custom": {
      if (range.from && range.to) {
        const [fy, fm, fd] = range.from.split("-").map(Number);
        const [ty, tm, td] = range.to.split("-").map(Number);
        return { start: new Date(fy, fm - 1, fd), end: new Date(ty, tm - 1, td, 23, 59, 59, 999) };
      }
      return { start: new Date(today.getFullYear(), today.getMonth() - 5, 1), end };
    }
    case "last6Months":
    default:
      return { start: new Date(today.getFullYear(), today.getMonth() - 5, 1), end };
  }
}

export function isWithinRange(iso: string | undefined | null, range: { start: Date; end: Date }): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

/** Month buckets covered by the range, oldest first — the x-axis of the trend charts. */
export function monthsInRange(range: { start: Date; end: Date }): Array<{ key: string; label: string }> {
  const months: Array<{ key: string; label: string }> = [];
  const spansYears = range.start.getFullYear() !== range.end.getFullYear();
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  while (cursor <= range.end && months.length < 36) {
    const label = MONTH_LABELS[cursor.getMonth()];
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: spansYears ? `${label} ${String(cursor.getFullYear()).slice(2)}` : label,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function describeDateRange(range: DashboardDateRange): string {
  if (range.preset !== "custom") {
    return DATE_RANGE_PRESET_OPTIONS.find((o) => o.value === range.preset)?.label ?? "";
  }
  const { start, end } = resolveDateRange(range);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
