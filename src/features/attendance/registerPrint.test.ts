import { describe, expect, it } from "vitest";
import { buildRegisterHtml, buildRegisterRows, dateRange } from "./registerPrint";
import type { AttendanceRecord, StudentRosterEntry } from "./types";

const student = (id: string, firstName: string, rollNumber: string): StudentRosterEntry => ({
  id, sectionId: "s1", admissionNumber: `A${id}`, firstName, lastName: "Khan", rollNumber,
});
const record = (studentId: string, date: string, status: AttendanceRecord["status"]): AttendanceRecord => ({
  id: `${studentId}-${date}`, tenantId: "t", branchId: "b", studentId, sectionId: "s1", date, status, captureMode: "manual", markedAt: "",
});

describe("attendance register print", () => {
  it("lists every date in a range, across month ends", () => {
    expect(dateRange("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("counts late and half-day as attended and computes the percentage", () => {
    const rows = buildRegisterRows(
      [student("1", "Aarav", "1")],
      [record("1", "2026-10-01", "present"), record("1", "2026-10-02", "late"), record("1", "2026-10-03", "absent"), record("1", "2026-10-04", "leave")],
    );
    expect(rows[0]).toMatchObject({ attended: 2, absent: 1, leave: 1, marked: 4, percent: 50 });
  });

  it("draws a tick for present and a cross for absent, in roll order, and escapes names", () => {
    const html = buildRegisterHtml({
      title: "Register", period: "October 2026", classLabel: "Grade 1 / A", dates: dateRange("2026-10-01", "2026-10-02"),
      roster: [student("2", "<b>Zed</b>", "2"), student("1", "Aarav", "1")],
      records: [record("1", "2026-10-01", "present"), record("1", "2026-10-02", "absent")],
    });
    expect(html).toContain("✓");
    expect(html).toContain("✗");
    expect(html).not.toContain("<b>Zed</b>");
    expect(html.indexOf("Aarav")).toBeLessThan(html.indexOf("Zed"));
  });

  it("starts a new table block for each month", () => {
    const html = buildRegisterHtml({ title: "R", period: "p", classLabel: "c", dates: dateRange("2026-10-30", "2026-11-02"), roster: [], records: [] });
    expect(html.match(/class="block"/g)).toHaveLength(2);
  });
});
