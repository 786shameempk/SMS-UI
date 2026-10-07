import { DEFAULT_WORKING_DAYS, PERIOD_DEFINITIONS, formatPeriodTime } from "./constants";
import { MAX_PERIODS, newPeriodRow, nextPeriodNumber, sortByTime, toFormValues, validateSetup, workingDayColumns } from "./setup";
import type { PeriodFormRow, TimetableSetupFormValues } from "./types";

const row = (periodNumber: number, label: string, startTime: string, endTime: string, isBreak = false): PeriodFormRow => ({ periodNumber, label, startTime, endTime, isBreak });
const form = (periods: PeriodFormRow[], workingDays: TimetableSetupFormValues["workingDays"] = [0, 1, 2, 3, 4]): TimetableSetupFormValues => ({ periods, workingDays });

describe("period setup rules", () => {
  it("accepts a normal schedule, and the built-in one", () => {
    expect(validateSetup(form([row(1, "Lesson 1", "09:00", "09:50"), row(2, "Break", "09:50", "10:10", true), row(3, "Lesson 2", "10:10", "11:00")]))).toEqual([]);
    expect(validateSetup(toFormValues({ periods: PERIOD_DEFINITIONS, workingDays: DEFAULT_WORKING_DAYS, isCustom: false }))).toEqual([]);
  });

  it("needs school days, a period, and a teaching period", () => {
    expect(validateSetup(form([row(1, "A", "09:00", "10:00")], []))).toContain("Choose at least one school day.");
    expect(validateSetup(form([]))).toContain("Add at least one period.");
    expect(validateSetup(form([row(1, "Break", "09:00", "10:00", true)]))).toContain("At least one period must be a teaching period, not a break.");
  });

  it("checks names and times", () => {
    expect(validateSetup(form([row(1, " ", "09:00", "10:00")]))).toContain("Give period 1 a name.");
    expect(validateSetup(form([row(1, "A", "", "10:00")]))).toContain('"A" needs a start and end time.');
    expect(validateSetup(form([row(1, "A", "10:00", "09:00")]))).toContain('"A" must end after it starts.');
    expect(validateSetup(form([row(1, "A", "10:00", "10:00")]))).toContain('"A" must end after it starts.');
  });

  it("refuses overlaps but allows periods that touch", () => {
    expect(validateSetup(form([row(1, "A", "09:00", "10:00"), row(2, "B", "09:30", "10:30")]))).toContain('"B" starts before "A" ends.');
    expect(validateSetup(form([row(2, "B", "10:00", "11:00"), row(1, "A", "09:00", "10:00")]))).toEqual([]);
  });

  it("caps the number of rows", () => {
    const many = Array.from({ length: MAX_PERIODS + 1 }, (_, i) => row(i + 1, `P${i + 1}`, "09:00", "09:30"));
    expect(validateSetup(form(many))).toContain(`A day can have at most ${MAX_PERIODS} periods and breaks.`);
  });
});

describe("period setup helpers", () => {
  it("never reuses a period number, so lessons stay attached to their period", () => {
    expect(nextPeriodNumber([row(1, "A", "09:00", "10:00"), row(7, "B", "10:00", "11:00")])).toBe(8);
    expect(nextPeriodNumber([])).toBe(1);
  });

  it("starts a new row where the last one ends", () => {
    const next = newPeriodRow([row(1, "Period 1", "09:00", "09:45"), row(2, "Lunch", "09:45", "10:15", true)]);
    expect(next).toEqual({ periodNumber: 3, label: "Period 2", startTime: "10:15", endTime: "10:55", isBreak: false });
    expect(newPeriodRow([])).toMatchObject({ periodNumber: 1, startTime: "08:00", endTime: "08:40" });
  });

  it("orders periods by start time, then number", () => {
    const sorted = sortByTime([row(3, "C", "11:00", "12:00"), row(1, "A", "09:00", "10:00"), row(2, "B", "09:00", "09:30")]);
    expect(sorted.map((p) => p.periodNumber)).toEqual([1, 2, 3]);
  });

  it("shows the school days as columns in week order", () => {
    expect(workingDayColumns([4, 0, 2]).map((d) => d.short)).toEqual(["Mon", "Wed", "Fri"]);
  });

  it("formats times the way the grid reads them", () => {
    expect(formatPeriodTime("08:00", "08:40")).toBe("8:00 - 8:40");
    expect(formatPeriodTime("12:40", "13:20")).toBe("12:40 - 13:20");
    expect(PERIOD_DEFINITIONS[0]).toMatchObject({ time: "8:00 - 8:40", startTime: "08:00" });
  });
});
