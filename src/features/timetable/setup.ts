import { DAY_DEFINITIONS } from "./constants";
import type { DayOfWeek, PeriodDefinition, PeriodFormRow, TimetableSetup, TimetableSetupFormValues } from "./types";

/** Matches AcademicService's TimetableSetup.MaxPeriods. */
export const MAX_PERIODS = 20;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function toFormValues(setup: TimetableSetup): TimetableSetupFormValues {
  return {
    periods: setup.periods.map((p) => ({
      periodNumber: p.periodNumber,
      label: p.label,
      startTime: p.startTime ?? "",
      endTime: p.endTime ?? "",
      isBreak: Boolean(p.isBreak),
    })),
    workingDays: [...setup.workingDays],
  };
}

/** Number for a new row: lessons refer to periods by number, so numbers are never reused or reshuffled. */
export function nextPeriodNumber(rows: Pick<PeriodFormRow, "periodNumber">[]): number {
  return rows.reduce((max, r) => Math.max(max, r.periodNumber), 0) + 1;
}

/** A new row starts when the last one ends, 40 minutes long. */
export function newPeriodRow(rows: PeriodFormRow[]): PeriodFormRow {
  const last = [...rows].filter((r) => TIME.test(r.endTime)).sort((a, b) => minutes(b.endTime) - minutes(a.endTime))[0];
  const start = last ? minutes(last.endTime) : 8 * 60;
  const end = Math.min(start + 40, 23 * 60 + 59);
  const hhmm = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  const teaching = rows.filter((r) => !r.isBreak).length;
  return { periodNumber: nextPeriodNumber(rows), label: `Period ${teaching + 1}`, startTime: hhmm(start), endTime: hhmm(end), isBreak: false };
}

/** Problems the form can show before saving; the server checks the same rules (and refuses to drop periods that have lessons). */
export function validateSetup(values: TimetableSetupFormValues): string[] {
  const errors: string[] = [];
  const { periods, workingDays } = values;

  if (workingDays.length === 0) errors.push("Choose at least one school day.");
  if (periods.length === 0) errors.push("Add at least one period.");
  if (periods.length > MAX_PERIODS) errors.push(`A day can have at most ${MAX_PERIODS} periods and breaks.`);
  if (periods.length > 0 && periods.every((p) => p.isBreak)) errors.push("At least one period must be a teaching period, not a break.");

  const timed: PeriodFormRow[] = [];
  for (const p of periods) {
    const name = p.label.trim() || `Period ${p.periodNumber}`;
    if (!p.label.trim()) errors.push(`Give period ${p.periodNumber} a name.`);
    if (!TIME.test(p.startTime) || !TIME.test(p.endTime)) {
      errors.push(`"${name}" needs a start and end time.`);
    } else if (minutes(p.endTime) <= minutes(p.startTime)) {
      errors.push(`"${name}" must end after it starts.`);
    } else {
      timed.push(p);
    }
  }

  const ordered = [...timed].sort((a, b) => minutes(a.startTime) - minutes(b.startTime));
  for (let i = 1; i < ordered.length; i++) {
    if (minutes(ordered[i].startTime) < minutes(ordered[i - 1].endTime)) {
      errors.push(`"${ordered[i].label.trim()}" starts before "${ordered[i - 1].label.trim()}" ends.`);
    }
  }
  return errors;
}

/** The school days as grid columns, in week order. */
export function workingDayColumns(workingDays: DayOfWeek[]) {
  return DAY_DEFINITIONS.filter((d) => workingDays.includes(d.value));
}

export function sortByTime<T extends Pick<PeriodDefinition, "startTime" | "periodNumber">>(periods: T[]): T[] {
  return [...periods].sort((a, b) => minutes(a.startTime ?? "00:00") - minutes(b.startTime ?? "00:00") || a.periodNumber - b.periodNumber);
}
