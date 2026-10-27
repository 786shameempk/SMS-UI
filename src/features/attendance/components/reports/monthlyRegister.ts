import type { AttendanceStatus, MonthlyStudentRow } from "../../types";

/** The letter shown in a register cell for each status. */
export const STATUS_CODE: Record<AttendanceStatus, string> = { present: "P", absent: "A", late: "L", "half-day": "H", leave: "V" };

export const STATUS_LEGEND: { status: AttendanceStatus; code: string; label: string }[] = [
  { status: "present", code: "P", label: "Present" },
  { status: "absent", code: "A", label: "Absent" },
  { status: "late", code: "L", label: "Late" },
  { status: "half-day", code: "H", label: "Half day" },
  { status: "leave", code: "V", label: "On leave" },
];

export const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

/** One letter for the weekday of a day in the month (M T W T F S S), so a column can be read as a date at a glance. */
export function weekdayLetter(year: number, monthIndex: number, day: number): string {
  return "SMTWTFS"[new Date(year, monthIndex, day).getDay()];
}

export const isSunday = (year: number, monthIndex: number, day: number) => new Date(year, monthIndex, day).getDay() === 0;

/** The register as a sheet: a row per student, a column per date, the status letter in each cell (blank when nothing was marked) and the totals at the end. */
export function monthlyRegisterCsv(rows: MonthlyStudentRow[], year: number, monthIndex: number): { headers: string[]; lines: (string | number)[][] } {
  const days = Array.from({ length: daysInMonth(year, monthIndex) }, (_, i) => i + 1);
  const month = String(monthIndex + 1).padStart(2, "0");
  return {
    headers: ["Roll", "Student", ...days.map((d) => `${year}-${month}-${String(d).padStart(2, "0")}`), "Present", "Absent", "Late", "Half day", "Leave", "Marked days", "% Present"],
    lines: rows.map((r) => [
      r.rollNumber, r.name, ...days.map((d) => (r.statusByDay[d] ? STATUS_CODE[r.statusByDay[d]!] : "")),
      r.presentDays, r.absentDays, r.lateDays, r.halfDays, r.leaveDays, r.markedDays, r.percentPresent,
    ]),
  };
}
