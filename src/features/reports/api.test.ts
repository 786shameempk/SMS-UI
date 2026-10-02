import * as reports from "./api";

const monthKey = (offset: number) => {
  const d = new Date();
  const m = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
};
const englishLabel = (offset: number) => {
  const [y, m] = monthKey(offset).split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${String(y % 100).padStart(2, "0")}`;
};

vi.mock("@/features/attendance/api", () => ({
  getYearlyTrend: vi.fn(async () => [0, -1, -2, -3, -4, -5].map((o) => ({ month: englishLabel(o), percentPresent: 90 + o, totalMarked: 100 }))),
  listStaffAttendanceRecords: vi.fn(async () => [
    { staffId: "a", date: `${monthKey(0)}-02`, status: "present" },
    { staffId: "b", date: `${monthKey(0)}-02`, status: "absent" },
    { staffId: "a", date: `${monthKey(-1)}-03`, status: "present" },
  ]),
}));
vi.mock("@/features/examinations/api", () => ({
  listExams: vi.fn(async () => [
    { id: "e2", name: "Midterm", startDate: "2026-09-01" },
    { id: "e1", name: "Unit test", startDate: "2026-07-01" },
  ]),
  getExamClassResults: vi.fn(async (id: string) =>
    id === "e1"
      ? [{ className: "Class 5", percentage: 60 }]
      : [{ className: "Class 6", percentage: 80 }, { className: "Class 5", percentage: 70 }, { className: "Class 5", percentage: 91 }],
  ),
}));
vi.mock("@/features/fees/api", () => ({
  listInvoices: vi.fn(async () => [
    { netAmount: 1000, paidAmount: 1000, paidOn: `${monthKey(0)}-05`, dueDate: `${monthKey(0)}-10`, status: "paid" },
    { netAmount: 2000, paidAmount: 500, paidOn: `${monthKey(-1)}-05`, dueDate: `${monthKey(-1)}-10`, status: "overdue" },
    { netAmount: 700, paidAmount: undefined, paidOn: undefined, dueDate: "2019-01-01", status: "due" },
  ]),
}));
vi.mock("@/features/teachers/api", () => ({
  listTeachers: vi.fn(async () => [
    { id: "t1", firstName: "Meera", lastName: "Rao" },
    { id: "t2", firstName: "No", lastName: "Classes" },
    { id: "t3", firstName: "Ravi", lastName: "K" },
  ]),
  getTeacherPerformanceOverview: vi.fn(async (id: string) =>
    id === "t1" ? [{ classAverage: 70 }, { classAverage: 80 }] : id === "t3" ? [{ classAverage: 90 }] : [],
  ),
}));
vi.mock("@/features/students/api", () => ({
  listAdmissions: vi.fn(async () => [
    { stage: "enrolled", submittedAt: `${monthKey(0)}-01` },
    { stage: "inquiry", submittedAt: `${monthKey(-2)}-01` },
    { stage: "enrolled", submittedAt: "2019-01-01" },
    { stage: "rejected", submittedAt: `${monthKey(0)}-03` },
  ]),
  listStudents: vi.fn(async () => [
    { status: "active", className: "Class 5" },
    { status: "inactive", className: "Class 6" },
    { status: "inactive", className: "Class 5" },
    { status: "graduated", className: "Class 10" },
  ]),
}));
vi.mock("@/features/library/api", () => ({
  listLoans: vi.fn(async () => [
    { bookId: "b1", issuedOn: `${monthKey(0)}-01`, status: "issued" },
    { bookId: "b1", issuedOn: `${monthKey(-1)}-01`, status: "overdue" },
    { bookId: "b2", issuedOn: "2019-01-01", status: "returned" },
    { bookId: "gone", issuedOn: `${monthKey(0)}-02`, status: "returned" },
  ]),
  listBooks: vi.fn(async () => [{ id: "b1", categoryId: "fic" }, { id: "b2", categoryId: "missing" }]),
  listCategories: vi.fn(async () => [{ id: "fic", name: "Fiction" }]),
}));
vi.mock("@/features/transport/api", () => ({
  listRoutes: vi.fn(async () => [
    { id: "r1", name: "Route 1", busId: "bus1", status: "active" },
    { id: "r2", name: "No bus", busId: undefined, status: "active" },
    { id: "r3", name: "Retired", busId: "bus1", status: "inactive" },
    { id: "r4", name: "Ghost bus", busId: "gone", status: "active" },
  ]),
  listBuses: vi.fn(async () => [{ id: "bus1", capacity: 40 }]),
  listAssignments: vi.fn(async () => [
    { routeId: "r1", status: "active" },
    { routeId: "r1", status: "active" },
    { routeId: "r1", status: "inactive" },
  ]),
}));
vi.mock("@/features/hostel/api", () => ({
  listHostels: vi.fn(async () => [
    { name: "Boys", status: "active", occupiedCount: 30, bedCount: 40 },
    { name: "Overfull", status: "active", occupiedCount: 12, bedCount: 10 },
    { name: "Closed", status: "inactive", occupiedCount: 0, bedCount: 50 },
  ]),
}));

describe("reports api", () => {
  it("student performance: exam trend in date order and class averages from the latest exam", async () => {
    const report = await reports.getStudentPerformanceReport();

    expect(report.examTrend.map((e) => [e.examName, e.averagePercentage, e.studentCount])).toEqual([["Unit test", 60, 1], ["Midterm", 80, 3]]);
    expect(report.latestExamName).toBe("Midterm");
    expect(report.classAverages).toEqual([{ className: "Class 5", averagePercentage: 81, studentCount: 2 }, { className: "Class 6", averagePercentage: 80, studentCount: 1 }]);
    expect(report.overallAverage).toBe(70);
  });

  it("attendance trend matches the API's English month labels whatever the viewer's locale", async () => {
    vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(function (this: Date) {
      return `local-${this.getMonth()}`;
    });

    const report = await reports.getAttendanceTrendReport();

    expect(report.trend).toHaveLength(6);
    expect(report.trend.map((t) => t.studentPercent)).toEqual([85, 86, 87, 88, 89, 90]);
    expect(report.trend.at(-1)).toMatchObject({ staffPercent: 50 });
    expect(report.trend.at(-2)).toMatchObject({ staffPercent: 100 });
    expect(report.trend[0].staffPercent).toBeNull();
    expect([report.studentAverage, report.staffAverage]).toEqual([88, 75]);
  });

  it("fee collection by month with overdue totals and collection rate", async () => {
    const report = await reports.getFeeCollectionReport();

    expect([report.totalCollected, report.totalPending, report.totalOverdue, report.collectionRate]).toEqual([1500, 2200, 1500, 41]);
    expect(report.monthly.at(-1)).toMatchObject({ collected: 1000, pending: 0 });
    expect(report.monthly.at(-2)).toMatchObject({ collected: 500, pending: 1500 });
  });

  it("teacher performance skips teachers without classes and ranks by average", async () => {
    expect(await reports.getTeacherPerformanceReport()).toEqual([
      { staffId: "t3", teacherName: "Ravi K", averageScore: 90, classCount: 1 },
      { staffId: "t1", teacherName: "Meera Rao", averageScore: 75, classCount: 2 },
    ]);
  });

  it("admissions and dropouts", async () => {
    const admissions = await reports.getAdmissionsReport();
    const dropouts = await reports.getDropoutReport();

    expect(admissions).toMatchObject({ totalApplications: 4, approvalRate: 50 });
    expect(admissions.statusBreakdown).toEqual(expect.arrayContaining([{ status: "enrolled", count: 2 }]));
    expect(admissions.monthlyApplications.at(-1)?.value).toBe(2);
    expect(dropouts).toMatchObject({ totalStudents: 4, dropoutRate: 50 });
    expect(dropouts.inactiveByClass).toEqual([{ className: "Class 5", count: 1 }, { className: "Class 6", count: 1 }]);
  });

  it("library usage, transport utilisation and hostel occupancy", async () => {
    const library = await reports.getLibraryUsageReport();
    const transport = await reports.getTransportUtilizationReport();
    const hostel = await reports.getHostelOccupancyReport();

    expect(library).toMatchObject({ totalLoans: 4, currentlyIssued: 1, overdueCount: 1 });
    expect(library.topCategories).toEqual([{ category: "Fiction", count: 2 }, { category: "Uncategorized", count: 1 }, { category: "Unknown", count: 1 }]);
    expect(library.monthlyLoans.at(-1)?.value).toBe(2);
    expect(transport.routes).toEqual([
      { routeName: "Route 1", assigned: 2, capacity: 40, utilizationPercent: 5 },
      { routeName: "Ghost bus", assigned: 0, capacity: 0, utilizationPercent: 0 },
    ]);
    expect(transport.overallUtilization).toBe(5);
    expect(hostel).toEqual({
      hostels: [{ hostelName: "Boys", occupied: 30, vacant: 10, bedCount: 40 }, { hostelName: "Overfull", occupied: 12, vacant: 0, bedCount: 10 }],
      totalOccupied: 42,
      totalBeds: 50,
      overallOccupancy: 84,
    });
  });
});
