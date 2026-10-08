import type { CalendarEvent } from "@/features/academics/types";
import type { DayOfWeek, PeriodDefinition } from "./types";

export const DAY_DEFINITIONS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 0, label: "Monday", short: "Mon" },
  { value: 1, label: "Tuesday", short: "Tue" },
  { value: 2, label: "Wednesday", short: "Wed" },
  { value: 3, label: "Thursday", short: "Thu" },
  { value: 4, label: "Friday", short: "Fri" },
  { value: 5, label: "Saturday", short: "Sat" },
];

/** "08:00" → "8:00": how a time reads in the grid. */
export function formatClock(hhmm: string): string {
  const [h = "0", m = "00"] = hhmm.split(":");
  return `${Number(h)}:${m}`;
}

export function formatPeriodTime(startTime: string, endTime: string): string {
  return `${formatClock(startTime)} - ${formatClock(endTime)}`;
}

const period = (periodNumber: number, label: string, startTime: string, endTime: string, isBreak?: boolean): PeriodDefinition => ({
  periodNumber,
  label,
  startTime,
  endTime,
  time: formatPeriodTime(startTime, endTime),
  ...(isBreak ? { isBreak } : {}),
});

/**
 * The schedule every branch starts with (until it sets up its own under Timetable → Periods). Must match
 * AcademicService's TimetableSetup.DefaultPeriods.
 */
export const PERIOD_DEFINITIONS: PeriodDefinition[] = [
  period(1, "Period 1", "08:00", "08:40"),
  period(2, "Period 2", "08:40", "09:20"),
  period(3, "Period 3", "09:20", "10:00"),
  period(4, "Period 4", "10:00", "10:40"),
  period(5, "Lunch Break", "10:40", "11:20", true),
  period(6, "Period 5", "11:20", "12:00"),
  period(7, "Period 6", "12:00", "12:40"),
  period(8, "Period 7", "12:40", "13:20"),
];

export const DEFAULT_WORKING_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5];

export const TEACHING_PERIODS = PERIOD_DEFINITIONS.filter((p) => !p.isBreak);

/** JS `Date#getDay()` is 0 (Sun) - 6 (Sat); this school week only runs Monday-Saturday. */
export function dateToDayOfWeek(dateStr: string): DayOfWeek | null {
  const jsDay = new Date(`${dateStr}T00:00:00`).getDay();
  if (jsDay === 0) return null;
  return (jsDay - 1) as DayOfWeek;
}

export function dateForDayOfWeekThisWeek(dayOfWeek: DayOfWeek): Date {
  const today = new Date();
  const todayJsDay = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayJsDay);
  const target = new Date(monday);
  target.setDate(monday.getDate() + dayOfWeek);
  return target;
}

function toDateOnly(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function holidayForDayThisWeek(events: CalendarEvent[], dayOfWeek: DayOfWeek): CalendarEvent | undefined {
  const target = toDateOnly(dateForDayOfWeekThisWeek(dayOfWeek));
  return events
    .filter((e) => e.type === "holiday")
    .find((e) => {
      const start = toDateOnly(new Date(`${e.startDate}T00:00:00`));
      const end = e.endDate ? toDateOnly(new Date(`${e.endDate}T00:00:00`)) : start;
      return target >= start && target <= end;
    });
}
