import { fetchDashboardData } from "./api";
import { DEFAULT_DATE_RANGE, describeDateRange, isWithinRange, monthsInRange, resolveDateRange, toIsoDate } from "./dateRange";

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toIsoDate(d);
};

vi.mock("@/utils/mockDelay", () => ({ mockDelay: <T,>(data: T) => Promise.resolve(data) }));
vi.mock("@/features/academics/api", () => ({
  listClasses: vi.fn(async () => [{ id: "c5", name: "Class 5" }, { id: "c6", name: "Class 6" }]),
  listSubjects: vi.fn(async () => [{ id: "math", name: "Maths" }]),
}));
vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [{ id: "st1", firstName: "Asha", lastName: "N", className: "Class 5" }]),
}));
vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [{ id: "sf1", firstName: "Meera", lastName: "Rao" }]),
}));
vi.mock("@/features/homework/api", () => ({
  listHomework: vi.fn(async () => [
    { id: "h1", title: "Ex 4.1", subjectId: "math", classId: "c5", dueDate: day(2), status: "published" },
    { id: "h2", title: "Old", subjectId: "math", classId: "c5", dueDate: day(-2), status: "published" },
    { id: "h3", title: "Draft", subjectId: "math", classId: "c5", dueDate: day(3), status: "draft" },
    { id: "h4", title: "Art", subjectId: "art", classId: "c9", dueDate: day(1), status: "published" },
  ]),
  listSubmissionsForHomework: vi.fn(async () => [{ status: "submitted" }, { status: "not_submitted" }, { status: "graded" }]),
  listAssignedHomework: vi.fn(async () => [
    { homework: { title: "Ex 4.1", subjectId: "math", classId: "c5", dueDate: day(2) }, submission: { id: "sb1", status: "not_submitted" } },
    { homework: { title: "Done", subjectId: "math", classId: "c5", dueDate: day(1) }, submission: { id: "sb2", status: "submitted" } },
    { homework: { title: "Mystery", subjectId: "art", classId: "c9", dueDate: day(1) }, submission: { id: "sb3", status: "not_submitted" } },
  ]),
}));
vi.mock("@/features/examinations/api", () => ({
  listExams: vi.fn(async () => [{ id: "e1", classId: "c5" }, { id: "e2", classId: "c6" }]),
  listExamSchedules: vi.fn(async () => [
    { id: "sc1", examId: "e1", subjectId: "math", date: day(5), startTime: "09:00", endTime: "11:30" },
    { id: "sc2", examId: "e2", subjectId: "math", date: day(3), startTime: "09:00", endTime: "10:00" },
    { id: "sc3", examId: "e1", subjectId: "math", date: day(-1), startTime: "09:00", endTime: "10:00" },
  ]),
}));
vi.mock("@/features/fees/api", () => ({
  listInvoices: vi.fn(async () => [
    { id: "i1", studentId: "st1", term: "T1", netAmount: 1000, paidAmount: 200, dueDate: day(10), status: "partial" },
    { id: "i2", studentId: "gone", term: "T1", netAmount: 500, paidAmount: undefined, dueDate: day(-5), status: "overdue" },
    { id: "i3", studentId: "st1", term: "T0", netAmount: 500, paidAmount: 500, dueDate: day(-30), status: "paid" },
  ]),
  listInvoicesForStudent: vi.fn(async () => [
    { id: "i1", term: "T1", netAmount: 1000, paidAmount: 200, dueDate: day(10), status: "partial" },
    { id: "i4", term: "T0", netAmount: 300, paidAmount: undefined, dueDate: day(-3), status: "overdue" },
    { id: "i3", term: "T0", netAmount: 500, paidAmount: 500, dueDate: day(-30), status: "paid" },
  ]),
}));
vi.mock("@/features/library/api", () => ({
  listLoans: vi.fn(async () => [
    { id: "l1", bookId: "b1", memberId: "m1", dueDate: day(-1), status: "overdue" },
    { id: "l2", bookId: "b2", memberId: "m2", dueDate: day(2), status: "issued" },
    { id: "l3", bookId: "b1", memberId: "m3", dueDate: day(20), status: "issued" },
    { id: "l4", bookId: "b1", memberId: "m4", dueDate: day(1), status: "issued" },
    { id: "l5", bookId: "b1", memberId: "m1", dueDate: day(1), status: "returned" },
  ]),
  listBooks: vi.fn(async () => [{ id: "b1", title: "Malgudi Days" }]),
  listMembers: vi.fn(async () => [
    { id: "m1", personType: "student", personId: "st1" },
    { id: "m2", personType: "staff", personId: "sf1" },
    { id: "m3", personType: "staff", personId: "gone" },
  ]),
}));
vi.mock("@/features/transport/api", () => ({
  listAssignments: vi.fn(async () => [{ studentId: "st1", routeId: "r1", status: "active" }]),
  listLiveStatuses: vi.fn(async () => [
    { routeId: "r1", status: "at-stop", currentStopIndex: 1, route: { name: "Route 1" }, bus: { regNumber: "KL-1" }, stops: [{ name: "Gate" }, { name: "Temple" }] },
    { routeId: "r2", status: "idle", currentStopIndex: -1, route: { name: "Route 2" }, bus: { regNumber: "KL-2" }, stops: [] },
    { routeId: "r3", status: "idle", currentStopIndex: -1, route: { name: "Route 3" }, bus: { regNumber: "KL-3" }, stops: [] },
  ]),
}));
vi.mock("@/features/hostel/api", () => ({
  listHostels: vi.fn(async () => [{ name: "Boys", status: "active", occupiedCount: 30, bedCount: 40 }, { name: "Closed", status: "inactive", occupiedCount: 0, bedCount: 10 }]),
  listAllocations: vi.fn(async () => [{ status: "active", student: { id: "st1" }, hostel: { name: "Boys" }, room: { roomNumber: "101" }, bedNumber: 2 }]),
}));
vi.mock("@/features/parent-portal/api", () => ({
  getMyChildren: vi.fn(async () => [{ id: "st1", firstName: "Asha", lastName: "N", className: "Class 5" }]),
}));

describe("dashboard api", () => {
  it("staff see school-wide widgets", async () => {
    const data = await fetchDashboardData("admin", "admin@school.test", DEFAULT_DATE_RANGE);

    expect(data.pendingAssignments.map((p) => [p.title, p.subject, p.className, p.submittedCount, p.totalCount])).toEqual([
      ["Art", "Subject", "—", 2, 3],
      ["Ex 4.1", "Maths", "Class 5", 2, 3],
    ]);
    expect(data.upcomingExams.map((e) => [e.id, e.className, e.durationMinutes])).toEqual([["sc2", "Class 6", 60], ["sc1", "Class 5", 150]]);
    expect(data.feesDue).toMatchObject({ totalPending: 1300, totalOverdue: 500 });
    expect(data.feesDue.items.map((i) => [i.id, i.studentName])).toEqual([["i2", "Unknown student"], ["i1", "Asha N"]]);
    expect(data.libraryDue.map((l) => [l.id, l.bookTitle, l.borrowerName, l.overdue])).toEqual([
      ["l1", "Malgudi Days", "Asha N", true],
      ["l4", "Malgudi Days", "Unknown", false],
      ["l2", "Unknown title", "Meera Rao", false],
    ]);
    expect(data.busStatus.fleet).toEqual(expect.arrayContaining([{ status: "idle", count: 2 }, { status: "at-stop", count: 1 }]));
    expect(data.hostelOccupancy.hostels).toEqual([{ hostelName: "Boys", occupiedCount: 30, bedCount: 40 }]);
    expect(data.performanceTrend.length).toBeGreaterThan(0);
    expect(data.stats.length).toBeGreaterThan(0);
  });

  it("parents see only their children's widgets", async () => {
    const data = await fetchDashboardData("parent", "parent@x.test", { preset: "last3Months" });

    expect(data.pendingAssignments.map((p) => [p.title, p.className])).toEqual([["Mystery", "Class 5"], ["Ex 4.1", "Class 5"]]);
    expect(data.upcomingExams.map((e) => e.id)).toEqual(["sc1"]);
    expect(data.feesDue).toMatchObject({ totalPending: 1100, totalOverdue: 300 });
    expect(data.feesDue.items.map((i) => i.id)).toEqual(["i4", "i1"]);
    expect(data.libraryDue.map((l) => [l.id, l.borrowerName])).toEqual([["l1", "Asha N"]]);
    expect(data.busStatus.mine).toEqual({ routeName: "Route 1", busRegNumber: "KL-1", status: "at-stop", currentStopName: "Temple" });
    expect(data.hostelOccupancy.mine).toEqual({ hostelName: "Boys", roomNumber: "101", bedNumber: 2 });
  });

  it("a student login (no linked children) gets empty personal widgets, and failures degrade to empty", async () => {
    const homework = await import("@/features/homework/api");
    vi.mocked(homework.listHomework).mockRejectedValueOnce(new Error("down"));

    const student = await fetchDashboardData("student", undefined, { preset: "thisYear" });
    const admin = await fetchDashboardData("admin", undefined, DEFAULT_DATE_RANGE);

    expect(student.pendingAssignments).toEqual([]);
    expect(student.busStatus).toEqual({ fleet: [], mine: null });
    expect(admin.pendingAssignments).toEqual([]);
  });
});

describe("dashboard date ranges", () => {
  it("resolves presets and custom ranges", () => {
    const now = new Date();
    expect(resolveDateRange({ preset: "thisYear" }).start).toEqual(new Date(now.getFullYear(), 0, 1));
    expect(resolveDateRange({ preset: "last3Months" }).start).toEqual(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    expect(resolveDateRange({ preset: "custom", from: "2026-01-15", to: "2026-02-10" })).toEqual({
      start: new Date(2026, 0, 15),
      end: new Date(2026, 1, 10, 23, 59, 59, 999),
    });
    expect(resolveDateRange({ preset: "custom" }).start).toEqual(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  });

  it("buckets months, labelling the year only when the range crosses one", () => {
    expect(monthsInRange({ start: new Date(2026, 0, 1), end: new Date(2026, 2, 31) }).map((m) => m.label)).toEqual(["Jan", "Feb", "Mar"]);
    expect(monthsInRange({ start: new Date(2025, 11, 1), end: new Date(2026, 0, 31) }).map((m) => m.label)).toEqual(["Dec 25", "Jan 26"]);
    expect(monthsInRange({ start: new Date(2020, 0, 1), end: new Date(2026, 0, 1) })).toHaveLength(36);
  });

  it("range membership and descriptions", () => {
    const range = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 31, 23, 59) };
    expect(isWithinRange("2026-01-15T00:00:00", range)).toBe(true);
    expect(isWithinRange("2026-02-01T00:00:00", range)).toBe(false);
    expect(isWithinRange(undefined, range)).toBe(false);
    expect(describeDateRange({ preset: "last6Months" })).toBe("Last 6 months");
    expect(describeDateRange({ preset: "custom", from: "2026-01-01", to: "2026-01-31" })).toContain("2026");
  });
});
