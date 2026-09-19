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

export const PERIOD_DEFINITIONS: PeriodDefinition[] = [
  { periodNumber: 1, label: "Period 1", time: "8:00 - 8:40" },
  { periodNumber: 2, label: "Period 2", time: "8:40 - 9:20" },
  { periodNumber: 3, label: "Period 3", time: "9:20 - 10:00" },
  { periodNumber: 4, label: "Period 4", time: "10:00 - 10:40" },
  { periodNumber: 5, label: "Lunch Break", time: "10:40 - 11:20", isBreak: true },
  { periodNumber: 6, label: "Period 5", time: "11:20 - 12:00" },
  { periodNumber: 7, label: "Period 6", time: "12:00 - 12:40" },
  { periodNumber: 8, label: "Period 7", time: "12:40 - 13:20" },
];

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
