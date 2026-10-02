import * as ai from "./api";
import * as reports from "@/features/reports/api";
import * as exams from "@/features/examinations/api";
import * as attendance from "@/features/attendance/api";
import * as fees from "@/features/fees/api";
import { academicHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";

const asha = { id: "st1", firstName: "Asha", lastName: "N", status: "active" };
const ravi = { id: "st2", firstName: "Ravi", lastName: "K", status: "active" };

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [asha, ravi, { id: "st3", firstName: "Old", lastName: "Boy", status: "alumni" }]),
  getStudent: vi.fn(async (id: string) => (id === "st1" ? asha : ravi)),
}));
vi.mock("@/features/attendance/api", () => ({
  listAttendanceRecords: vi.fn(async () => [
    { studentId: "st1", status: "present" },
    { studentId: "st1", status: "absent" },
    { studentId: "st1", status: "absent" },
    { studentId: "st1", status: "late" },
    ...Array.from({ length: 20 }, () => ({ studentId: "st2", status: "present" })),
  ]),
}));
vi.mock("@/features/examinations/api", () => ({
  getTranscript: vi.fn(async (id: string) =>
    id === "st1"
      ? { cgpa: 4.2, rows: [{ examName: "Unit", percentage: 55, grade: "D" }, { examName: "Midterm", percentage: 40, grade: "F" }] }
      : { cgpa: 9.1, rows: [{ examName: "Unit", percentage: 88, grade: "A" }, { examName: "Midterm", percentage: 92, grade: "A+" }] },
  ),
}));
vi.mock("@/features/fees/api", () => ({
  listInvoices: vi.fn(async () => [
    { studentId: "st1", status: "overdue", netAmount: 4000 },
    { studentId: "st1", status: "overdue", netAmount: 1000 },
    { studentId: "st2", status: "paid", netAmount: 5000 },
  ]),
  listInvoicesForStudent: vi.fn(async (id: string) =>
    id === "st1" ? [{ status: "overdue", netAmount: 4000, feeType: "tuition", term: "T1", dueDate: "2026-09-10" }, { status: "paid", netAmount: 1 }] : [],
  ),
}));
vi.mock("@/features/reports/api", () => ({
  getAttendanceTrendReport: vi.fn(),
  getStudentPerformanceReport: vi.fn(),
  getFeeCollectionReport: vi.fn(),
  getAdmissionsReport: vi.fn(),
}));

function reportsSay(level: "high" | "mid" | "low") {
  const v = { high: [95, 92, 95, 70], mid: [80, 65, 75, 50], low: [60, 40, 50, 20] }[level];
  vi.mocked(reports.getAttendanceTrendReport).mockResolvedValue({
    trend: level === "low"
      ? [{ month: "a", studentPercent: null, staffPercent: null }]
      : [{ month: "a", studentPercent: v[0] - (level === "high" ? 5 : -5), staffPercent: 90 }, { month: "b", studentPercent: v[0], staffPercent: 90 }],
    studentAverage: v[0],
    staffAverage: 90,
  } as never);
  vi.mocked(reports.getStudentPerformanceReport).mockResolvedValue({
    overallAverage: v[1], latestExamName: level === "low" ? null : "Midterm",
    classAverages: [{ className: "Class 5", averagePercentage: 70 }, { className: "Class 6", averagePercentage: 90 }],
    examTrend: [],
  } as never);
  vi.mocked(reports.getFeeCollectionReport).mockResolvedValue({ collectionRate: v[2], totalCollected: 9000, totalPending: 1000, totalOverdue: level === "high" ? 0 : 500, monthly: [] } as never);
  vi.mocked(reports.getAdmissionsReport).mockResolvedValue({
    approvalRate: v[3], totalApplications: 10, monthlyApplications: [],
    statusBreakdown: level === "low" ? [] : [{ status: "inquiry", count: 2 }, { status: "enrolled", count: 7 }],
  } as never);
}

describe("ai insights", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0));

  it("summarise healthy numbers positively", async () => {
    reportsSay("high");

    const [att, acad, fee, adm] = await ai.getInsights();

    expect(att.headline).toBe("Attendance is excellent across the school.");
    expect(att.bullets[0]).toContain("trending upward");
    expect(acad.headline).toBe("Academic performance is strong school-wide.");
    expect(acad.bullets[1]).toBe("Class 6 is leading at 90%, while Class 5 trails at 70%.");
    expect(fee.bullets).toHaveLength(1);
    expect(adm.bullets[1]).toBe('Most applications are currently at the "enrolled" stage (7).');
  });

  it("flag middling and poor numbers", async () => {
    reportsSay("mid");
    const mid = await ai.getInsights();
    reportsSay("low");
    const low = await ai.getInsights();

    expect(mid.map((i) => i.headline)).toEqual([
      "Attendance is healthy overall.",
      "Academic performance is middling — room to grow.",
      "Fee collection is reasonable but has gaps.",
      "Admissions conversion has room to improve.",
    ]);
    expect(mid[0].bullets[0]).toContain("slipping");
    expect(mid[2].bullets[1]).toMatch(/overdue/);
    expect(low.map((i) => i.headline)).toEqual([
      "Attendance needs attention.",
      "Academic performance needs attention.",
      "Fee collection needs follow-up.",
      "Admissions conversion has room to improve.",
    ]);
    expect(low[0].bullets[0]).toContain("not enough history");
    expect(low[1].bullets[0]).not.toContain("most recently");
  });
});

describe("ai at-risk students", () => {
  it("scores attendance, academic and fee risks, honouring dismissals", async () => {
    stubClient(academicHttpClient, {
      "GET /api/risk-flags/dismissed": [],
      "POST /api/risk-flags/dismissed/st1": { studentId: "st1", dismissedAt: "" },
      "DELETE /api/risk-flags/dismissed/st1": null,
    });

    const [row, ...rest] = await ai.getAtRiskStudents();

    expect(rest).toEqual([]);
    expect(row.student.id).toBe("st1");
    expect(row.riskScore).toBe(100);
    expect(row.flags.map((f) => f.reason)).toEqual(["low_attendance", "academic_risk", "overdue_fees"]);
    expect(row.flags[0].detail).toContain("Present 25%");
    expect(row.flags[2].detail).toContain("2 invoices overdue");
    expect(await ai.dismissStudentFlags("st1")).toMatchObject({ studentId: "st1" });
    await ai.restoreStudentFlags("st1");
  });

  it("hides dismissed students unless asked", async () => {
    stubClient(academicHttpClient, { "GET /api/risk-flags/dismissed": [{ studentId: "st1" }] });

    expect(await ai.getAtRiskStudents()).toEqual([]);
    expect(await ai.getAtRiskStudents(true)).toHaveLength(1);
  });
});

describe("ai drafts", () => {
  it("report card comments describe the trend", async () => {
    const dip = await ai.generateDraft({ scenario: "report_card_comment", studentId: "st1" });
    const rise = await ai.generateDraft({ scenario: "report_card_comment", studentId: "st2" });
    vi.mocked(exams.getTranscript).mockResolvedValueOnce({ cgpa: 0, rows: [] } as never);
    const none = await ai.generateDraft({ scenario: "report_card_comment", studentId: "st2" });
    vi.mocked(exams.getTranscript).mockResolvedValueOnce({ cgpa: 7, rows: [{ examName: "Unit", percentage: 70, grade: "B" }] } as never);
    const first = await ai.generateDraft({ scenario: "report_card_comment", studentId: "st2" });
    vi.mocked(exams.getTranscript).mockResolvedValueOnce({ cgpa: 7, rows: [{ percentage: 70 }, { examName: "Mid", percentage: 71, grade: "B" }] } as never);
    const steady = await ai.generateDraft({ scenario: "report_card_comment", studentId: "st2" });

    expect(dip.body).toContain("dip from the previous exam");
    expect(rise.body).toContain("clear improvement");
    expect(none.notApplicableReason).toBe("No exam records yet for this student.");
    expect(first.body).toContain("first exam on record");
    expect(steady.body).toContain("fairly consistent");
  });

  it("fee reminders list overdue invoices only", async () => {
    const reminder = await ai.generateDraft({ scenario: "fee_reminder", studentId: "st1" });
    const nothing = await ai.generateDraft({ scenario: "fee_reminder", studentId: "st2" });

    expect(reminder.body).toContain("the following fee is overdue for Asha");
    expect(reminder.body).toContain("tuition (T1)");
    expect(nothing.notApplicableReason).toBe("No overdue fees for this student.");
    expect(vi.mocked(fees.listInvoicesForStudent)).toHaveBeenCalledWith("st2");
  });

  it("attendance concerns only below the guideline", async () => {
    const concern = await ai.generateDraft({ scenario: "attendance_concern", studentId: "st1" });
    const healthy = await ai.generateDraft({ scenario: "attendance_concern", studentId: "st2" });
    vi.mocked(attendance.listAttendanceRecords).mockResolvedValueOnce([]);
    const noData = await ai.generateDraft({ scenario: "attendance_concern", studentId: "st2" });

    expect(concern.body).toContain("is at 25%");
    expect(healthy.notApplicableReason).toContain("healthy (100%)");
    expect(noData.notApplicableReason).toBe("No attendance records yet for this student.");
  });

  it("positive recognition for attendance, else grades, else nothing", async () => {
    const attendanceStar = await ai.generateDraft({ scenario: "positive_recognition", studentId: "st2" });
    vi.mocked(attendance.listAttendanceRecords).mockResolvedValueOnce([]);
    const gradeStar = await ai.generateDraft({ scenario: "positive_recognition", studentId: "st2" });
    const nothing = await ai.generateDraft({ scenario: "positive_recognition", studentId: "st1" });

    expect(attendanceStar.body).toContain("excellent attendance of 100%");
    expect(gradeStar.body).toContain("CGPA of 9.1/10");
    expect(nothing.notApplicableReason).toMatch(/No standout/);
  });
});
