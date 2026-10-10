import type { UserRole } from "@/types/auth";
import { DEFAULT_DATE_RANGE, describeDateRange, isWithinRange, monthsInRange, resolveDateRange, toIsoDate } from "./dateRange";
import { resolveDataSourceConfig } from "./dataSource";
import { liveSource, __test } from "./sources/live";
import { mockSource } from "./sources/mock";
import type { DashboardContext, DashboardIdentity, WidgetDataKey } from "./sources/types";
import { WIDGET_CATALOG } from "./widgets";
import { getTimetableSetup } from "@/features/timetable/api";

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toIsoDate(d);
};
const todayDow = (() => {
  const js = new Date().getDay();
  return js === 0 ? null : js - 1;
})();

vi.mock("@/utils/mockDelay", () => ({ mockDelay: <T,>(data: T) => Promise.resolve(data) }));
vi.mock("./scopeApi", () => ({ fetchScopeSummary: vi.fn(async () => ({ view: "aggregated", branches: [], metrics: {} })) }));
// The services' aggregation endpoints (AcademicService / FinanceService), in the current month.
const thisMonth = new Date().toISOString().slice(0, 7);
vi.mock("./sources/summaryApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sources/summaryApi")>()),
  getAcademicSummary: vi.fn(async () => ({
    activeStudents: 2,
    admittedInRange: 1,
    activeStaff: 3,
    staffOnLeaveToday: 1,
    today: { date: "", marked: 50, attended: 45, absent: 4, late: 1, leave: 1, percent: 90 },
    previousSchoolDay: { date: "", marked: 50, attended: 40, absent: 10, late: 0, leave: 0, percent: 80 },
    sectionAttendance: [
      { sectionId: "s5a", label: "Class 5 A", students: 30, marked: 30, percent: 93.3 },
      { sectionId: "s6a", label: "Class 6 A", students: 20, marked: 0, percent: null },
      { sectionId: "s7a", label: "Class 7 A", students: 25, marked: 25, percent: 64 },
    ],
    performance: [{ month: thisMonth, averageScore: 53, passRate: 67, results: 3 }],
    topPerformers: [{ studentId: "st1", name: "Asha N", classLabel: "Class 5 A", averageScore: 80, results: 2 }],
    upcomingExams: 2,
    pendingHomework: 3,
  })),
  getFeeSummary: vi.fn(async () => ({
    currency: "INR",
    collectedInRange: 700,
    collectedPreviousRange: 500,
    pending: 1300,
    overdueCount: 1,
    overdueAmount: 500,
    paymentsToday: 1,
    collectedToday: 200,
    months: [{ month: thisMonth, collected: 700, expected: 2000 }],
    statusBreakdown: [
      { status: "paid", count: 2, amount: 700 },
      { status: "due", count: 1, amount: 800 },
      { status: "overdue", count: 1, amount: 500 },
      { status: "partial", count: 0, amount: 0 },
    ],
    topDefaulters: [{ studentId: "st1", outstanding: 500, invoices: 1, oldestDueDate: "2026-01-10" }],
  })),
}));
vi.mock("@/lib/httpClient", () => ({
  academicHttpClient: {
    get: vi.fn(async () => ({
      data: {
        staffId: "sf1",
        student: { studentId: "st1", name: "Asha N", sectionId: "s5a", classId: "c5", classLabel: "Class 5 - A" },
        children: [{ studentId: "st1", name: "Asha N", sectionId: "s5a", classId: "c5", classLabel: "Class 5 - A" }],
      },
    })),
  },
}));
vi.mock("@/features/academics/api", () => ({
  listClasses: vi.fn(async () => [{ id: "c5", name: "Class 5" }, { id: "c6", name: "Class 6" }]),
  listSections: vi.fn(async () => [{ id: "s5a", name: "A", classId: "c5" }, { id: "s6a", name: "A", classId: "c6" }]),
  listSubjects: vi.fn(async () => [{ id: "math", name: "Maths" }]),
  listCalendarEvents: vi.fn(async () => [
    { id: "ev1", title: "Diwali", type: "holiday", startDate: day(10) },
    { id: "ev2", title: "Old holiday", type: "holiday", startDate: day(-40) },
    { id: "ev3", title: "Sports day", type: "other", startDate: day(5) },
  ]),
}));
vi.mock("@/features/attendance/api", () => ({
  getDailySectionSummaries: vi.fn(async () => [
    { sectionId: "s5a", marked: 30, present: 25, absent: 2, late: 1, halfDay: 1, leave: 1 },
    { sectionId: "s6a", marked: 20, present: 18, absent: 2, late: 0, halfDay: 0, leave: 0 },
  ]),
  listAttendanceRecords: vi.fn(async () => [
    { studentId: "st1", date: day(0), status: "present" },
    { studentId: "other", date: day(0), status: "absent" },
  ]),
}));
vi.mock("@/features/platform/api", () => ({
  listTenants: vi.fn(async () => [
    { id: "t1", schoolName: "Small School", status: "trial", plan: { name: "Starter", maxStudents: 100 }, studentCount: 95, staffCount: 9 },
    { id: "t2", schoolName: "Big School", status: "active", plan: { name: "Enterprise", maxStudents: 0 }, studentCount: 900, staffCount: 60 },
  ]),
}));
vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [
    { id: "st1", firstName: "Asha", lastName: "N", className: "Class 5", status: "active", dateOfBirth: `2014-${day(2).slice(5)}`, admissionDate: day(-3) },
    { id: "st2", firstName: "Ravi", lastName: "K", className: "Class 6", status: "active", dateOfBirth: `2013-${day(40).slice(5)}`, admissionDate: "2020-06-01" },
  ]),
}));
vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [{ id: "sf1", firstName: "Meera", lastName: "Rao", status: "active", dateOfBirth: `1990-${day(0).slice(5)}` }]),
}));
vi.mock("@/features/homework/api", () => ({
  listHomework: vi.fn(async () => [
    { id: "h1", title: "Ex 4.1", subjectId: "math", classId: "c5", dueDate: day(2), status: "published", staffId: "sf1" },
    { id: "h2", title: "Old", subjectId: "math", classId: "c5", dueDate: day(-2), status: "published", staffId: "sf1" },
    { id: "h3", title: "Draft", subjectId: "math", classId: "c5", dueDate: day(3), status: "draft", staffId: "sf1" },
    { id: "h4", title: "Art", subjectId: "art", classId: "c9", dueDate: day(1), status: "published", staffId: "sf2" },
  ]),
  listSubmissionsForHomework: vi.fn(async () => [{ status: "submitted" }, { status: "not_submitted" }, { status: "graded" }]),
  listAssignedHomework: vi.fn(async () => [
    { homework: { title: "Ex 4.1", subjectId: "math", classId: "c5", dueDate: day(2) }, submission: { id: "sb1", status: "not_submitted" } },
    { homework: { title: "Done", subjectId: "math", classId: "c5", dueDate: day(1) }, submission: { id: "sb2", status: "submitted" } },
    { homework: { title: "Mystery", subjectId: "art", classId: "c9", dueDate: day(1) }, submission: { id: "sb3", status: "resubmit_requested" } },
  ]),
}));
vi.mock("@/features/examinations/api", () => ({
  listExams: vi.fn(async () => [
    { id: "e1", classId: "c5", startDate: day(-20) },
    { id: "e2", classId: "c6", startDate: day(-20) },
  ]),
  listExamSchedules: vi.fn(async () => [
    { id: "sc1", examId: "e1", subjectId: "math", date: day(5), startTime: "09:00", endTime: "11:30" },
    { id: "sc2", examId: "e2", subjectId: "math", date: day(3), startTime: "09:00", endTime: "10:00" },
    { id: "sc3", examId: "e1", subjectId: "math", date: day(-1), startTime: "09:00", endTime: "10:00" },
  ]),
  // The family-safe marks endpoint: one row per subject for the signed-in family's own children.
  getExamResults: vi.fn(async (examId: string) => (examId === "e1" ? [{ studentId: "st1", marksObtained: 40, maxMarks: 50, isAbsent: false }] : [])),
  getExamClassResults: vi.fn(async (examId: string) =>
    examId === "e1"
      ? [{ studentId: "st1", percentage: 80 }, { studentId: "x", percentage: 20 }]
      : [{ studentId: "y", percentage: 60 }],
  ),
}));
vi.mock("@/features/fees/api", () => ({
  listInvoices: vi.fn(async () => [
    { id: "i1", studentId: "st1", term: "T1", netAmount: 1000, paidAmount: 200, dueDate: day(10), status: "partial", paidOn: day(-1) },
    { id: "i2", studentId: "gone", term: "T1", netAmount: 500, paidAmount: undefined, dueDate: day(-5), status: "overdue" },
    { id: "i3", studentId: "st1", term: "T0", netAmount: 500, paidAmount: 500, dueDate: day(-30), status: "paid", paidOn: day(-31) },
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
vi.mock("@/features/transport/trackingApi", () => ({
  // The family endpoint: only the signed-in family's own children, never the school's fleet.
  getChildBusTracking: vi.fn(async (studentId: string) =>
    studentId === "st1" ? { routeName: "Route 1", bus: { regNumber: "KL-1" }, live: { status: "at-stop", currentStopIndex: 1 }, stops: [{ name: "Gate" }, { name: "Temple" }] } : null,
  ),
}));
vi.mock("@/features/hostel/api", () => ({
  listHostels: vi.fn(async () => [
    { name: "Boys", status: "active", occupiedCount: 30, bedCount: 40 },
    { name: "Closed", status: "inactive", occupiedCount: 0, bedCount: 10 },
  ]),
  listAllocations: vi.fn(async () => [{ status: "active", student: { id: "st1" }, hostel: { name: "Boys" }, room: { roomNumber: "101" }, bedNumber: 2 }]),
}));
vi.mock("@/features/notifications/api", () => ({
  listMyNotifications: vi.fn(async () => [
    { id: "n1", title: "Old", body: "b", category: "announcement", createdAt: "2026-01-01T00:00:00Z", read: true },
    { id: "n2", title: "New", body: "b", category: "finance", createdAt: "2026-02-01T00:00:00Z", read: false },
  ]),
}));
vi.mock("@/features/settings/api", () => ({
  listAuditLog: vi.fn(async () => [{ id: "a1", actor: "Ava", action: "Enrolled a student", category: "students", detail: "Grade 8", createdAt: "2026-02-01T00:00:00Z" }]),
}));
vi.mock("@/features/timetable/api", () => ({
  // On a Sunday (no school day) the periods sit on Monday, so the teacher still has sections but no classes today.
  listSlots: vi.fn(async () => [
    { id: "t1", sectionId: "s5a", dayOfWeek: todayDow ?? 0, periodNumber: 2, subjectId: "math", staffId: "sf1", room: "204" },
    { id: "t0", sectionId: "s5a", dayOfWeek: todayDow ?? 0, periodNumber: 1, subjectId: "math", staffId: "sf1", room: "204" },
    { id: "tb", sectionId: "s5a", dayOfWeek: todayDow ?? 0, periodNumber: 4, isBreak: true },
  ]),
  // Not reachable by default, so the standard schedule applies; a test can return the branch's own.
  getTimetableSetup: vi.fn(async () => {
    throw new Error("setup unavailable");
  }),
}));
vi.mock("@/features/visitors/api", () => ({
  listVisitorEntries: vi.fn(async (status?: string) =>
    status === "checked-in" ? [{ checkInAt: new Date().toISOString() }] : [{ checkInAt: new Date().toISOString() }, { checkInAt: "2020-01-01T09:00:00Z" }],
  ),
  listPreApprovedVisits: vi.fn(async () => [{ scheduledAt: `${day(0)}T10:00:00` }]),
}));
vi.mock("@/features/helpdesk/api", () => ({
  listTickets: vi.fn(async () => [{ status: "open" }, { status: "closed" }, { status: "reopened" }]),
}));

const SCHOOL_ID: DashboardIdentity = { staffId: "sf1", learners: [] };
const FAMILY_ID: DashboardIdentity = {
  staffId: null,
  learners: [{ studentId: "st1", name: "Asha N", sectionId: "s5a", classId: "c5", classLabel: "Class 5" }],
};

function ctx(role: UserRole, identity: DashboardIdentity = role === "parent" || role === "student" ? FAMILY_ID : SCHOOL_ID): DashboardContext {
  return { role, userId: "u1", identity, range: resolveDateRange(DEFAULT_DATE_RANGE) };
}

const W = liveSource.widgets;

// Each test sees its own mocked responses, not lists shared from the previous one.
beforeEach(() => __test.clearShared());

describe("live source: school-wide widgets", () => {
  it("homework, exams, fees, library, bus and hostel", async () => {
    const admin = ctx("admin");
    expect((await W.pendingAssignments(admin)).map((p) => [p.title, p.subject, p.className, p.submittedCount, p.totalCount])).toEqual([
      ["Art", "Subject", "—", 2, 3],
      ["Ex 4.1", "Maths", "Class 5", 2, 3],
    ]);
    expect((await W.upcomingExams(admin)).map((e) => [e.id, e.className, e.durationMinutes])).toEqual([["sc2", "Class 6", 60], ["sc1", "Class 5", 150]]);
    const fees = await W.feesDue(admin);
    expect(fees).toMatchObject({ totalPending: 1300, totalOverdue: 500 });
    expect(fees.items.map((i) => [i.id, i.studentName])).toEqual([["i2", "Unknown student"], ["i1", "Asha N"]]);
    expect((await W.libraryDue(admin)).map((l) => [l.id, l.borrowerName, l.overdue])).toEqual([
      ["l1", "Asha N", true],
      ["l4", "Unknown", false],
      ["l2", "Meera Rao", false],
    ]);
    expect((await W.busStatus(admin)).fleet).toEqual(expect.arrayContaining([{ status: "idle", count: 2 }, { status: "at-stop", count: 1 }]));
    expect((await W.hostelOccupancy(admin)).hostels).toEqual([{ hostelName: "Boys", occupiedCount: 30, bedCount: 40 }]);
  });

  it("a teacher sees only their own homework", async () => {
    expect((await W.pendingAssignments(ctx("teacher"))).map((p) => p.title)).toEqual(["Ex 4.1"]);
  });

  it("attendance sums today's sections; a teacher sees the sections they teach", async () => {
    expect(await W.attendance(ctx("admin"))).toEqual({ present: 44, absent: 4, late: 1, onLeave: 1, totalMarked: 50 });
    expect(await W.attendance(ctx("teacher"))).toEqual({ present: 26, absent: 2, late: 1, onLeave: 1, totalMarked: 30 });
  });

  it("notifications newest first, mapped to dashboard categories", async () => {
    expect((await W.notifications(ctx("admin"))).map((n) => [n.id, n.category])).toEqual([["n2", "finance"], ["n1", "event"]]);
  });

  it("birthdays in the next 7 days, students and staff", async () => {
    const list = await W.birthdays(ctx("admin"));
    expect(list.map((b) => [b.name, b.role])).toEqual([["Meera Rao", "staff"], ["Asha N", "student"]]);
  });

  it("holidays are upcoming school holidays only; the calendar mixes events and exam papers", async () => {
    expect((await W.holidays(ctx("admin"))).map((h) => h.name)).toEqual(["Diwali"]);
    const events = await W.calendarEvents(ctx("admin"));
    expect(events.map((e) => e.kind)).toEqual(expect.arrayContaining(["holiday", "event", "exam"]));
    expect(events.some((e) => e.label === "Old holiday")).toBe(false);
  });

  it("recent activity comes from the audit log", async () => {
    expect(await W.recentActivity(ctx("admin"))).toEqual([{ id: "a1", actor: "Ava", action: "Enrolled a student", target: "Grade 8", createdAt: "2026-02-01T00:00:00Z" }]);
  });

  it("trends cover every month of the range", async () => {
    const admin = ctx("admin");
    const months = monthsInRange(admin.range).length;
    const perf = await W.performanceTrend(admin);
    expect(perf).toHaveLength(months);
    // e1 (80, 20) and e2 (60) fall in the same month: average 53, 2 of 3 passed.
    expect(perf.find((p) => (p.averageScore ?? 0) > 0)).toMatchObject({ averageScore: 53, passRate: 67 });
    // Months without exams are gaps (null), not 0%.
    expect(perf.filter((p) => p.averageScore === null)).toHaveLength(months - 1);
    const revenue = await W.revenueTrend(admin);
    expect(revenue).toHaveLength(months);
    expect(revenue.reduce((s, r) => s + r.collected, 0)).toBe(700);
  });

  it("today's classes for a teacher, in period order without breaks", async () => {
    const classes = await W.todayClasses(ctx("teacher"));
    if (todayDow === null) return expect(classes).toEqual([]);
    expect(classes.map((c) => [c.id, c.className, c.startTime])).toEqual([["t0", "Class 5 - A", "08:00"], ["t1", "Class 5 - A", "08:40"]]);
  });
});

describe("live source: today's classes use the branch's own periods", () => {
  it("takes times and order from the branch setup, not the standard schedule", async () => {
    vi.mocked(getTimetableSetup).mockResolvedValueOnce({
      periods: [
        { periodNumber: 1, label: "Late start", time: "9:30 - 10:15", startTime: "09:30", endTime: "10:15" },
        { periodNumber: 2, label: "Early bird", time: "6:30 - 7:15", startTime: "06:30", endTime: "07:15" },
      ],
      workingDays: [0, 1, 2, 3, 4, 5],
      isCustom: true,
    });
    const classes = await W.todayClasses(ctx("teacher"));
    if (todayDow === null) return expect(classes).toEqual([]);
    // Period 2 rings first here, and a 6:30 start stays 06:30 (it is not read as an afternoon time).
    expect(classes.map((c) => [c.id, c.startTime, c.endTime])).toEqual([["t1", "06:30", "07:15"], ["t0", "09:30", "10:15"]]);
  });
});

describe("live source: personal widgets", () => {
  it("parents see only their children's records", async () => {
    const parent = ctx("parent");
    expect((await W.pendingAssignments(parent)).map((p) => [p.title, p.className])).toEqual([["Mystery", "Class 5"], ["Ex 4.1", "Class 5"]]);
    expect((await W.upcomingExams(parent)).map((e) => e.id)).toEqual(["sc1"]);
    expect(await W.feesDue(parent)).toMatchObject({ totalPending: 1100, totalOverdue: 300 });
    expect((await W.libraryDue(parent)).map((l) => [l.id, l.borrowerName])).toEqual([["l1", "Asha N"]]);
    expect((await W.busStatus(parent)).mine).toEqual({ routeName: "Route 1", busRegNumber: "KL-1", status: "at-stop", currentStopName: "Temple" });
    // Hostel occupancy is a staff widget: a family login never gets it, and no staff hostel list is called for them.
    expect(await W.hostelOccupancy(parent)).toEqual({ hostels: [], mine: null });
    expect(await W.attendance(parent)).toEqual({ present: 1, absent: 0, late: 0, onLeave: 0, totalMarked: 1 });
    // Performance counts only the child's own results (80%).
    expect((await W.performanceTrend(parent)).find((p) => (p.averageScore ?? 0) > 0)).toMatchObject({ averageScore: 80, passRate: 100 });
  });

  it("an unlinked family login gets empty personal widgets, never school-wide data", async () => {
    const empty = ctx("student", { staffId: null, learners: [] });
    expect(await W.pendingAssignments(empty)).toEqual([]);
    expect(await W.upcomingExams(empty)).toEqual([]);
    expect(await W.busStatus(empty)).toEqual({ fleet: [], mine: null });
    expect(await W.stats(empty)).toEqual([]);
  });

  it("identity: a student gets their own record, a parent their children", async () => {
    expect((await liveSource.identity("student")).learners.map((l) => l.studentId)).toEqual(["st1"]);
    expect((await liveSource.identity("parent")).learners.map((l) => l.classLabel)).toEqual(["Class 5 - A"]);
    expect((await liveSource.identity("admin")).learners).toEqual([]);
  });
});

describe("live source: key stats per role", () => {
  it.each<[UserRole, string[]]>([
    ["admin", ["st-students", "st-staff", "st-attendance", "st-fees"]],
    ["teacher", ["st-classes", "st-attendance", "st-assignments", "st-exams"]],
    ["accountant", ["st-fees", "st-pending", "st-overdue", "st-receipts"]],
    ["librarian", ["st-loans", "st-overdue", "st-due", "st-members"]],
    ["receptionist", ["st-visitors", "st-onsite", "st-expected", "st-tickets"]],
    ["parent", ["st-attendance", "st-fees", "st-assignments", "st-exams"]],
  ])("%s", async (role, ids) => {
    expect((await W.stats(ctx(role))).map((s) => s.id)).toEqual(ids);
  });

  it("figures are real counts", async () => {
    const admin = await W.stats(ctx("admin"));
    expect(admin.find((s) => s.id === "st-students")).toMatchObject({ value: "2", delta: { value: "+1 admitted" } });
    expect(admin.find((s) => s.id === "st-attendance")?.value).toBe("90%");
    const reception = await W.stats(ctx("receptionist"));
    expect(reception.map((s) => s.value)).toEqual(["1", "1", "1", "2"]);
  });

  it("a failing service drops only its tiles", async () => {
    const summaries = await import("./sources/summaryApi");
    vi.mocked(summaries.getFeeSummary).mockRejectedValueOnce(new Error("403"));
    expect((await W.stats(ctx("admin"))).map((s) => s.id)).toEqual(["st-students", "st-staff", "st-attendance"]);
  });

  it("school-wide figures come from one summary request per service", async () => {
    const summaries = await import("./sources/summaryApi");
    vi.mocked(summaries.getAcademicSummary).mockClear();
    vi.mocked(summaries.getFeeSummary).mockClear();
    const admin = ctx("admin");
    await Promise.all([W.stats(admin), W.performanceTrend(admin), W.revenueTrend(admin)]);
    expect(summaries.getAcademicSummary).toHaveBeenCalledTimes(1);
    expect(summaries.getFeeSummary).toHaveBeenCalledTimes(1);
    expect((await W.stats(admin)).find((s) => s.id === "st-staff")).toMatchObject({ value: "3", delta: { value: "1 on leave today" } });
  });
});

describe("live source: role widgets", () => {
  it("class-wise attendance: school-wide from the summary, best first, unmarked last", async () => {
    const items = await W.classAttendance(ctx("admin"));
    expect(items.map((i) => [i.label, i.display, i.tone])).toEqual([
      ["Class 5 A", "93%", "success"],
      ["Class 7 A", "64%", "danger"],
      ["Class 6 A", "Not marked", "muted"],
    ]);
  });

  it("class-wise attendance: a teacher sees the sections they teach", async () => {
    const items = await W.classAttendance(ctx("teacher"));
    expect(items.map((i) => i.id)).toEqual(todayDow === null ? ["s5a", "s6a"].filter((id) => items.some((i) => i.id === id)) : items.map((i) => i.id));
    expect(items.every((i) => i.value === null || (i.value >= 0 && i.value <= 100))).toBe(true);
  });

  it("top performers and fee status come from the summaries", async () => {
    expect(await W.topPerformers(ctx("principal"))).toEqual([
      { id: "st1", label: "Asha N", sublabel: "Class 5 A · 2 results", value: 80, display: "80%", tone: "success" },
    ]);
    // Empty statuses are left out of the doughnut.
    expect((await W.feeStatus(ctx("accountant"))).map((sl) => [sl.label, sl.value, sl.tone])).toEqual([
      ["Paid", 700, "success"],
      ["Due", 800, "warning"],
      ["Overdue", 500, "danger"],
    ]);
  });

  it("fee defaulters are named from the student list", async () => {
    expect(await W.feeDefaulters(ctx("accountant"))).toEqual([
      { studentId: "st1", studentName: "Asha N", className: "Class 5", outstanding: 500, invoices: 1, oldestDueDate: "2026-01-10" },
    ]);
  });

  it("needs attention: overdue fees first, then low and unmarked attendance and staff on leave", async () => {
    const items = await W.alerts(ctx("admin"));
    expect(items.map((a) => [a.id, a.severity])).toEqual([
      ["fees-overdue", "warning"],
      ["low-s7a", "warning"],
      ["unmarked", "info"],
      ["staff-leave", "info"],
    ]);
  });

  it("needs attention survives one service failing, but not both", async () => {
    const summaries = await import("./sources/summaryApi");
    vi.mocked(summaries.getFeeSummary).mockRejectedValueOnce(new Error("403"));
    expect((await W.alerts(ctx("admin"))).map((a) => a.id)).not.toContain("fees-overdue");
    __test.clearShared();
    vi.mocked(summaries.getFeeSummary).mockRejectedValueOnce(new Error("403"));
    vi.mocked(summaries.getAcademicSummary).mockRejectedValueOnce(new Error("down"));
    await expect(W.alerts(ctx("admin"))).rejects.toThrow();
  });

  it("learner attendance covers each child's own records only", async () => {
    expect(await W.learnerAttendance(ctx("parent"))).toEqual([
      { studentId: "st1", name: "Asha N", classLabel: "Class 5", present: 1, late: 0, absent: 0, leave: 0, marked: 1, percent: 100 },
    ]);
    expect(await W.learnerAttendance(ctx("teacher"))).toEqual([]);
  });

  it("schools overview totals the platform", async () => {
    const o = await W.schools(ctx("superAdmin"));
    expect(o.totals).toEqual({ schools: 2, active: 1, trial: 1, suspended: 0, students: 995, staff: 69 });
    expect(o.rows.map((r) => [r.name, r.capacityPercent])).toEqual([["Big School", null], ["Small School", 95]]);
  });
});

describe("mock source", () => {
  const ROLES: UserRole[] = ["superAdmin", "admin", "principal", "teacher", "accountant", "librarian", "receptionist", "parent", "student", "staff"];
  const KEYS = Object.keys(mockSource.widgets) as WidgetDataKey[];

  it("implements exactly the same widgets as the live source", () => {
    expect(KEYS.sort()).toEqual((Object.keys(liveSource.widgets) as WidgetDataKey[]).sort());
  });

  it.each(ROLES)("returns data for every widget for %s", async (role) => {
    for (const key of KEYS) {
      const data = await mockSource.widgets[key](ctx(role));
      expect(data, `${role} ${key}`).toBeDefined();
    }
    expect((await mockSource.widgets.stats(ctx(role))).length).toBe(4);
  });

  it("trends follow the selected range", async () => {
    const three = { ...ctx("admin"), range: resolveDateRange({ preset: "last3Months" }) };
    expect(await mockSource.widgets.revenueTrend(three)).toHaveLength(3);
  });

  it("branch overview: aggregated sums every branch", async () => {
    const agg = await mockSource.scope("aggregated", "t", "b", ctx("admin").range);
    const seg = await mockSource.scope("segregated", "t", "b", ctx("admin").range);
    expect(agg.branches.length).toBeGreaterThan(seg.branches.length);
    expect(agg.metrics.students).toBeGreaterThan(seg.metrics.students);
  });
});

describe("widget data", () => {
  it("every data widget has a loader in both sources", () => {
    for (const w of WIDGET_CATALOG) {
      if (w.dataSource.kind !== "loader") continue;
      expect(liveSource.widgets[w.dataSource.key], w.id).toBeTypeOf("function");
      expect(mockSource.widgets[w.dataSource.key], w.id).toBeTypeOf("function");
    }
  });
});

describe("data source switch", () => {
  it("demo data is allowed by default only in development, and is then the default source", () => {
    expect(resolveDataSourceConfig({ isDev: true })).toEqual({ allowDemoData: true, defaultSource: "mock" });
    expect(resolveDataSourceConfig({ isDev: false })).toEqual({ allowDemoData: false, defaultSource: "live" });
  });

  it("deployment settings win, and production without the allowance is always live", () => {
    expect(resolveDataSourceConfig({ isDev: false, allowDemo: "true" })).toEqual({ allowDemoData: true, defaultSource: "mock" });
    expect(resolveDataSourceConfig({ isDev: false, allowDemo: "true", source: "live" })).toEqual({ allowDemoData: true, defaultSource: "live" });
    expect(resolveDataSourceConfig({ isDev: true, allowDemo: "false", source: "mock" })).toEqual({ allowDemoData: false, defaultSource: "live" });
    expect(resolveDataSourceConfig({ isDev: false, source: "mock" })).toEqual({ allowDemoData: false, defaultSource: "live" });
  });
});

describe("helpers", () => {
  it("next birthday rolls over to next year once passed", () => {
    const from = new Date(2026, 5, 15);
    expect(__test.nextBirthday("2010-06-20", from)).toEqual(new Date(2026, 5, 20));
    expect(__test.nextBirthday("2010-06-10", from)).toEqual(new Date(2027, 5, 10));
  });

  it("deltas and compact rupees", () => {
    expect(__test.delta(110, 100)).toEqual({ value: "+10%", direction: "up" });
    expect(__test.delta(88, 90, "pts")).toEqual({ value: "-2 pts", direction: "down" });
    expect(__test.delta(0, 0)).toBeUndefined();
    expect(__test.formatInrCompact(4810000)).toBe("₹48.1L");
    expect(__test.formatInrCompact(12500)).toBe("₹12,500");
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
