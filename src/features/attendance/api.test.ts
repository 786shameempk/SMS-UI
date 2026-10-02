import * as attendance from "./api";
import { academicHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";

const record = (overrides: Record<string, unknown> = {}) => ({
  id: "a1", tenantId: "t", branchId: "b", studentId: "st1", sectionId: "s5a", date: "2026-10-01", status: "HalfDay", captureMode: "Qr", remarks: null, markedAt: "", ...overrides,
});

describe("attendance api", () => {
  it("roster and section listings", async () => {
    stubClient(academicHttpClient, {
      "GET /api/attendance/roster-sections": [{ sectionId: "s5a", classId: "c5", studentCount: 38 }],
      "GET /api/attendance/sections/s5a/roster": [{ id: "st1", sectionId: "s5a", admissionNumber: "A1", firstName: "Asha", lastName: "N", rollNumber: null }],
    });

    expect(await attendance.listRosterSections()).toEqual([{ sectionId: "s5a", classId: "c5", studentCount: 38 }]);
    expect((await attendance.getSectionRoster("s5a"))[0]).toMatchObject({ rollNumber: "" });
  });

  it("reads and saves a section's day, translating statuses and capture modes", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/sections/s5a/date/2026-10-01": [record(), record({ id: "a2", status: "?", captureMode: "?" })],
      "POST /api/attendance": [record()],
      "GET /api/attendance/records": [record({ status: "Leave", captureMode: "Face", remarks: "Fever" })],
    });

    const [half, odd] = await attendance.getAttendanceForSectionDate("s5a", "2026-10-01");
    await attendance.saveAttendance({
      sectionId: "s5a", date: "2026-10-01", captureMode: "biometric",
      entries: [{ studentId: "st1", status: "late" }, { studentId: "st2", status: "half-day", remarks: "Left early" }],
    } as never);
    const [leave] = await attendance.listAttendanceRecords({ sectionId: "s5a", dateFrom: "2026-09-01", dateTo: "2026-09-30" });

    expect(half).toMatchObject({ status: "half-day", captureMode: "qr", remarks: undefined });
    expect(odd).toMatchObject({ status: "present", captureMode: "manual" });
    expect(calls[1].body).toEqual({
      sectionId: "s5a", date: "2026-10-01", captureMode: "Biometric",
      entries: [{ studentId: "st1", status: "Late", remarks: null }, { studentId: "st2", status: "HalfDay", remarks: "Left early" }],
    });
    expect(leave).toMatchObject({ status: "leave", captureMode: "face", remarks: "Fever" });
    expect((calls[2].config as { params: unknown }).params).toEqual({ sectionId: "s5a", dateFrom: "2026-09-01", dateTo: "2026-09-30" });
  });

  it("staff attendance", async () => {
    const dto = { id: "sa1", tenantId: "t", branchId: "b", staffId: "sf1", date: "2026-10-01", status: "Late", markedAt: "" };
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/staff/date/2026-10-01": [dto, { ...dto, status: "?" }],
      "POST /api/attendance/staff": [dto],
      "GET /api/attendance/staff/records": [dto],
    });

    expect((await attendance.getStaffAttendanceForDate("2026-10-01")).map((r) => r.status)).toEqual(["late", "present"]);
    await attendance.saveStaffAttendance({ date: "2026-10-01", entries: [{ staffId: "sf1", status: "absent" }] });
    await attendance.listStaffAttendanceRecords();

    expect(calls[1].body).toEqual({ date: "2026-10-01", entries: [{ staffId: "sf1", status: "Absent" }] });
    expect((calls[2].config as { params: unknown }).params).toEqual({ dateFrom: undefined, dateTo: undefined });
  });

  it("reports: daily, monthly grid and yearly trend", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/reports/daily/2026-10-01": [{ sectionId: "s5a", classId: "c5", className: "Class 5", sectionName: "A", totalStudents: 40, marked: 38, present: 35, absent: 2, late: 1, halfDay: 0, leave: 0, percentPresent: 92 }],
      "GET /api/attendance/reports/monthly/s5a/2026/9": [
        { studentId: "st1", name: "Asha", rollNumber: null, statusByDay: { "1": "Present", "2": null, "3": "HalfDay", "4": "Odd" }, presentDays: 1, absentDays: 0, lateDays: 0, halfDays: 1, leaveDays: 0, markedDays: 2, percentPresent: 75 },
      ],
      "GET /api/attendance/reports/yearly-trend": [{ month: "2026-09", percentPresent: 93, totalMarked: 800 }],
    });

    expect((await attendance.getDailySectionSummaries("2026-10-01"))[0].percentPresent).toBe(92);
    const [row] = await attendance.getMonthlyStudentSummary("s5a", 2026, 9);
    expect(await attendance.getYearlyTrend("s5a")).toEqual([{ month: "2026-09", percentPresent: 93, totalMarked: 800 }]);

    expect(row.statusByDay).toEqual({ 1: "present", 3: "half-day", 4: undefined });
    expect(row.rollNumber).toBe("");
    expect((calls[2].config as { params: unknown }).params).toEqual({ sectionId: "s5a" });
  });
});
