import { getYearlyTrend, listStaffAttendanceRecords } from "@/features/attendance/api";
import { getExamClassResults, listExams } from "@/features/examinations/api";
import { listInvoices } from "@/features/fees/api";
import { getTeacherPerformanceOverview, listTeachers } from "@/features/teachers/api";
import { listAdmissions, listStudents } from "@/features/students/api";
import { listBooks, listCategories, listLoans } from "@/features/library/api";
import { listAssignments, listBuses, listRoutes } from "@/features/transport/api";
import { listHostels } from "@/features/hostel/api";
import type {
  AdmissionsReport,
  AttendanceTrendPoint,
  AttendanceTrendReport,
  DropoutReport,
  FeeCollectionReport,
  FeeMonthPoint,
  HostelOccupancyReport,
  LibraryUsageReport,
  StudentPerformanceReport,
  TeacherPerformancePoint,
  TransportUtilizationReport,
} from "./types";

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function lastNMonthKeys(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

// ── Student performance (examinations) ──────────────────────────────────

export async function getStudentPerformanceReport(): Promise<StudentPerformanceReport> {
  const exams = [...(await listExams())].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const resultsByExam = await Promise.all(exams.map((e) => getExamClassResults(e.id)));

  const examTrend = exams.map((exam, i) => {
    const results = resultsByExam[i];
    const averagePercentage = results.length ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length) : 0;
    return { examId: exam.id, examName: exam.name, date: exam.startDate, averagePercentage, studentCount: results.length };
  });

  const latest = exams.length ? exams[exams.length - 1] : null;
  const latestResults = latest ? resultsByExam[resultsByExam.length - 1] : [];
  const byClass = new Map<string, { total: number; count: number }>();
  for (const r of latestResults) {
    const bucket = byClass.get(r.className) ?? { total: 0, count: 0 };
    bucket.total += r.percentage;
    bucket.count += 1;
    byClass.set(r.className, bucket);
  }
  const classAverages = Array.from(byClass.entries())
    .map(([className, { total, count }]) => ({ className, averagePercentage: Math.round(total / count), studentCount: count }))
    .sort((a, b) => a.className.localeCompare(b.className));

  const overallAverage = examTrend.length ? Math.round(examTrend.reduce((sum, e) => sum + e.averagePercentage, 0) / examTrend.length) : 0;

  return { examTrend, latestExamName: latest?.name ?? null, classAverages, overallAverage };
}

// ── Attendance trends (student + staff) ─────────────────────────────────

export async function getAttendanceTrendReport(): Promise<AttendanceTrendReport> {
  const [studentTrend, staffRecords] = await Promise.all([getYearlyTrend(), listStaffAttendanceRecords()]);

  const staffByMonth = new Map<string, { present: number; total: number }>();
  for (const record of staffRecords) {
    const key = record.date.slice(0, 7);
    const bucket = staffByMonth.get(key) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (record.status === "present") bucket.present += 1;
    staffByMonth.set(key, bucket);
  }

  const studentByLabel = new Map(studentTrend.map((p) => [p.month, p.percentPresent] as const));
  const monthKeys = lastNMonthKeys(6);
  const trend: AttendanceTrendPoint[] = monthKeys.map((key) => {
    const label = monthLabel(key);
    const staffBucket = staffByMonth.get(key);
    return {
      month: label,
      studentPercent: studentByLabel.get(label) ?? null,
      staffPercent: staffBucket ? Math.round((staffBucket.present / staffBucket.total) * 100) : null,
    };
  });

  const studentValues = trend.map((t) => t.studentPercent).filter((v): v is number => v !== null);
  const staffValues = trend.map((t) => t.staffPercent).filter((v): v is number => v !== null);
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

  return { trend, studentAverage: avg(studentValues), staffAverage: avg(staffValues) };
}

// ── Fee collection ───────────────────────────────────────────────────────

export async function getFeeCollectionReport(): Promise<FeeCollectionReport> {
  const invoices = await listInvoices();
  const monthKeys = lastNMonthKeys(6);
  const byMonth = new Map<string, { collected: number; pending: number }>(monthKeys.map((k) => [k, { collected: 0, pending: 0 }]));

  let totalCollected = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  for (const inv of invoices) {
    const paid = inv.paidAmount ?? 0;
    const outstanding = Math.max(0, inv.netAmount - paid);
    totalCollected += paid;
    totalPending += outstanding;
    if (inv.status === "overdue") totalOverdue += outstanding;

    const dueBucket = byMonth.get(inv.dueDate.slice(0, 7));
    if (dueBucket) dueBucket.pending += outstanding;
    if (inv.paidOn) {
      const paidBucket = byMonth.get(inv.paidOn.slice(0, 7));
      if (paidBucket) paidBucket.collected += paid;
    }
  }

  const monthly: FeeMonthPoint[] = monthKeys.map((key) => {
    const bucket = byMonth.get(key)!;
    return { month: monthLabel(key), collected: bucket.collected, pending: bucket.pending };
  });

  const collectionRate = totalCollected + totalPending > 0 ? Math.round((totalCollected / (totalCollected + totalPending)) * 100) : 0;

  return { monthly, totalCollected, totalPending, totalOverdue, collectionRate };
}

// ── Teacher performance ──────────────────────────────────────────────────

export async function getTeacherPerformanceReport(): Promise<TeacherPerformancePoint[]> {
  const teachers = await listTeachers();
  const overviews = await Promise.all(teachers.map((t) => getTeacherPerformanceOverview(t.id)));

  const points: TeacherPerformancePoint[] = teachers.map((teacher, i) => {
    const overview = overviews[i];
    const averageScore = overview.length ? Math.round(overview.reduce((sum, o) => sum + o.classAverage, 0) / overview.length) : 0;
    return { staffId: teacher.id, teacherName: `${teacher.firstName} ${teacher.lastName}`, averageScore, classCount: overview.length };
  });

  return points.filter((p) => p.classCount > 0).sort((a, b) => b.averageScore - a.averageScore);
}

// ── Admissions ───────────────────────────────────────────────────────────

export async function getAdmissionsReport(): Promise<AdmissionsReport> {
  const admissions = await listAdmissions();
  const statusCounts = new Map<string, number>();
  for (const a of admissions) statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);
  const statusBreakdown = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

  const monthKeys = lastNMonthKeys(6);
  const byMonth = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  for (const a of admissions) {
    const key = a.submittedAt.slice(0, 7);
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const monthlyApplications = monthKeys.map((key) => ({ month: monthLabel(key), value: byMonth.get(key) ?? 0 }));

  const approved = statusCounts.get("approved") ?? 0;
  const approvalRate = admissions.length ? Math.round((approved / admissions.length) * 100) : 0;

  return { statusBreakdown, monthlyApplications, totalApplications: admissions.length, approvalRate };
}

// ── Dropout analysis ─────────────────────────────────────────────────────

export async function getDropoutReport(): Promise<DropoutReport> {
  const students = await listStudents();
  const statusCounts = new Map<string, number>();
  for (const s of students) statusCounts.set(s.status, (statusCounts.get(s.status) ?? 0) + 1);
  const statusBreakdown = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

  const byClass = new Map<string, number>();
  for (const s of students) {
    if (s.status !== "inactive") continue;
    byClass.set(s.className, (byClass.get(s.className) ?? 0) + 1);
  }
  const inactiveByClass = Array.from(byClass.entries())
    .map(([className, count]) => ({ className, count }))
    .sort((a, b) => a.className.localeCompare(b.className));

  const inactiveCount = statusCounts.get("inactive") ?? 0;
  const dropoutRate = students.length ? Math.round((inactiveCount / students.length) * 100) : 0;

  return { statusBreakdown, inactiveByClass, totalStudents: students.length, dropoutRate };
}

// ── Library usage ────────────────────────────────────────────────────────

export async function getLibraryUsageReport(): Promise<LibraryUsageReport> {
  const [loans, books, categories] = await Promise.all([listLoans(), listBooks(), listCategories()]);

  const monthKeys = lastNMonthKeys(6);
  const byMonth = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  for (const loan of loans) {
    const key = loan.issuedOn.slice(0, 7);
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const monthlyLoans = monthKeys.map((key) => ({ month: monthLabel(key), value: byMonth.get(key) ?? 0 }));

  const bookById = new Map(books.map((b) => [b.id, b] as const));
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const byCategory = new Map<string, number>();
  for (const loan of loans) {
    const book = bookById.get(loan.bookId);
    const categoryName = book ? (categoryById.get(book.categoryId)?.name ?? "Uncategorized") : "Unknown";
    byCategory.set(categoryName, (byCategory.get(categoryName) ?? 0) + 1);
  }
  const topCategories = Array.from(byCategory.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    monthlyLoans,
    topCategories,
    totalLoans: loans.length,
    currentlyIssued: loans.filter((l) => l.status === "issued").length,
    overdueCount: loans.filter((l) => l.status === "overdue").length,
  };
}

// ── Transport utilization ────────────────────────────────────────────────

export async function getTransportUtilizationReport(): Promise<TransportUtilizationReport> {
  const [routes, buses, assignments] = await Promise.all([listRoutes(), listBuses(), listAssignments()]);
  const busById = new Map(buses.map((b) => [b.id, b] as const));

  const activeAssignmentsByRoute = new Map<string, number>();
  for (const a of assignments) {
    if (a.status !== "active") continue;
    activeAssignmentsByRoute.set(a.routeId, (activeAssignmentsByRoute.get(a.routeId) ?? 0) + 1);
  }

  const points = routes
    .filter((r) => r.busId && r.status === "active")
    .map((route) => {
      const bus = busById.get(route.busId!);
      const capacity = bus?.capacity ?? 0;
      const assigned = activeAssignmentsByRoute.get(route.id) ?? 0;
      return { routeName: route.name, assigned, capacity, utilizationPercent: capacity > 0 ? Math.round((assigned / capacity) * 100) : 0 };
    });

  const totalAssigned = points.reduce((sum, p) => sum + p.assigned, 0);
  const totalCapacity = points.reduce((sum, p) => sum + p.capacity, 0);

  return {
    routes: points,
    totalAssigned,
    totalCapacity,
    overallUtilization: totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0,
  };
}

// ── Hostel occupancy ──────────────────────────────────────────────────────

export async function getHostelOccupancyReport(): Promise<HostelOccupancyReport> {
  const hostels = await listHostels();
  const points = hostels
    .filter((h) => h.status === "active")
    .map((h) => ({ hostelName: h.name, occupied: h.occupiedCount, vacant: Math.max(0, h.bedCount - h.occupiedCount), bedCount: h.bedCount }));
  const totalOccupied = points.reduce((sum, p) => sum + p.occupied, 0);
  const totalBeds = points.reduce((sum, p) => sum + p.bedCount, 0);

  return { hostels: points, totalOccupied, totalBeds, overallOccupancy: totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0 };
}
