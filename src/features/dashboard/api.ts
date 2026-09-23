import type { UserRole } from "@/types/auth";
import { mockDelay } from "@/utils/mockDelay";
import { listClasses, listSubjects } from "@/features/academics/api";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { listHomework, listSubmissionsForHomework, listAssignedHomework } from "@/features/homework/api";
import { listExams, listExamSchedules } from "@/features/examinations/api";
import { listInvoices, listInvoicesForStudent } from "@/features/fees/api";
import { listLoans, listBooks, listMembers } from "@/features/library/api";
import { listLiveStatuses, listAssignments } from "@/features/transport/api";
import { listHostels, listAllocations } from "@/features/hostel/api";
import { getMyChildren } from "@/features/parent-portal/api";
import type { Student } from "@/features/students/types";
import type { BusTrackingStatus } from "@/features/transport/types";
import {
  buildAttendance,
  buildBirthdays,
  buildCalendarEvents,
  buildHolidays,
  buildNotifications,
  buildPerformanceTrend,
  buildRecentActivity,
  buildRevenueTrend,
  buildStats,
  buildTodayClasses,
} from "./mock";
import { monthsInRange, resolveDateRange } from "./dateRange";
import type {
  BusStatusSummary,
  DashboardDateRange,
  DashboardData,
  FeeDueItem,
  FeeDueSummary,
  HostelOccupancySummary,
  LibraryDueItem,
  PendingAssignment,
  UpcomingExam,
} from "./types";

const MAX_ITEMS = 5;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function durationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

async function getParentChildren(role: UserRole, email?: string): Promise<Student[]> {
  if (role !== "parent" || !email) return [];
  return getMyChildren(email);
}

// ── Homework pending ────────────────────────────────────────────────────

async function buildPendingAssignmentsForChildren(children: Student[]): Promise<PendingAssignment[]> {
  const [subjects, classes] = await Promise.all([listSubjects(), listClasses()]);
  const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
  const classById = new Map(classes.map((c) => [c.id, c.name] as const));

  const rows: PendingAssignment[] = [];
  for (const child of children) {
    const assigned = await listAssignedHomework(child.id);
    for (const row of assigned) {
      if (row.submission.status !== "not_submitted") continue;
      rows.push({
        id: row.submission.id,
        title: row.homework.title,
        subject: subjectById.get(row.homework.subjectId) ?? "Subject",
        className: classById.get(row.homework.classId) ?? child.className,
        dueDate: row.homework.dueDate,
      });
    }
  }
  return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, MAX_ITEMS);
}

async function buildPendingAssignmentsSchoolwide(): Promise<PendingAssignment[]> {
  const [homework, subjects, classes] = await Promise.all([listHomework(), listSubjects(), listClasses()]);
  const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
  const classById = new Map(classes.map((c) => [c.id, c.name] as const));
  const today = startOfToday();

  const upcoming = homework
    .filter((h) => h.status === "published" && new Date(h.dueDate) >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, MAX_ITEMS);

  const rows: PendingAssignment[] = [];
  for (const hw of upcoming) {
    const submissions = await listSubmissionsForHomework(hw.id);
    const submittedCount = submissions.filter((s) => s.status !== "not_submitted").length;
    rows.push({
      id: hw.id,
      title: hw.title,
      subject: subjectById.get(hw.subjectId) ?? "Subject",
      className: classById.get(hw.classId) ?? "—",
      dueDate: hw.dueDate,
      submittedCount,
      totalCount: submissions.length,
    });
  }
  return rows;
}

// ── Upcoming exams ──────────────────────────────────────────────────────

async function buildUpcomingExamsForChildren(children: Student[]): Promise<UpcomingExam[]> {
  const [exams, schedules, subjects, classes] = await Promise.all([listExams(), listExamSchedules(), listSubjects(), listClasses()]);
  const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
  const classIdByExam = new Map(exams.map((e) => [e.id, e.classId] as const));
  const classNameById = new Map(classes.map((c) => [c.id, c.name] as const));
  const today = startOfToday();

  const childClassIds = new Set(
    children.map((c) => classes.find((sc) => sc.name === c.className)?.id).filter((id): id is string => Boolean(id)),
  );

  const rows: UpcomingExam[] = schedules
    .filter((sch) => new Date(sch.date) >= today && childClassIds.has(classIdByExam.get(sch.examId) ?? ""))
    .map((sch) => ({
      id: sch.id,
      subject: subjectById.get(sch.subjectId) ?? "Subject",
      className: classNameById.get(classIdByExam.get(sch.examId) ?? "") ?? "—",
      date: sch.date,
      durationMinutes: durationMinutes(sch.startTime, sch.endTime),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return rows.slice(0, MAX_ITEMS);
}

async function buildUpcomingExamsSchoolwide(): Promise<UpcomingExam[]> {
  const [exams, schedules, subjects, classes] = await Promise.all([listExams(), listExamSchedules(), listSubjects(), listClasses()]);
  const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
  const classIdByExam = new Map(exams.map((e) => [e.id, e.classId] as const));
  const classNameById = new Map(classes.map((c) => [c.id, c.name] as const));
  const today = startOfToday();

  const rows: UpcomingExam[] = schedules
    .filter((sch) => new Date(sch.date) >= today)
    .map((sch) => ({
      id: sch.id,
      subject: subjectById.get(sch.subjectId) ?? "Subject",
      className: classNameById.get(classIdByExam.get(sch.examId) ?? "") ?? "—",
      date: sch.date,
      durationMinutes: durationMinutes(sch.startTime, sch.endTime),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return rows.slice(0, MAX_ITEMS);
}

// ── Fee due ─────────────────────────────────────────────────────────────

async function buildFeesDueForChildren(children: Student[]): Promise<FeeDueSummary> {
  let totalPending = 0;
  let totalOverdue = 0;
  const items: FeeDueItem[] = [];

  for (const child of children) {
    const invoices = await listInvoicesForStudent(child.id);
    for (const inv of invoices) {
      if (inv.status === "paid") continue;
      const outstanding = Math.max(0, inv.netAmount - (inv.paidAmount ?? 0));
      totalPending += outstanding;
      if (inv.status === "overdue") totalOverdue += outstanding;
      items.push({
        id: inv.id,
        studentName: `${child.firstName} ${child.lastName}`,
        term: inv.term,
        amount: outstanding,
        dueDate: inv.dueDate,
        status: inv.status,
      });
    }
  }

  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { totalPending, totalOverdue, currency: "INR", items: items.slice(0, MAX_ITEMS) };
}

async function buildFeesDueSchoolwide(): Promise<FeeDueSummary> {
  const [invoices, students] = await Promise.all([listInvoices(), listStudents()]);
  const studentById = new Map(students.map((s) => [s.id, s] as const));

  let totalPending = 0;
  let totalOverdue = 0;
  const due = invoices.filter((inv) => inv.status !== "paid");
  for (const inv of due) {
    const outstanding = Math.max(0, inv.netAmount - (inv.paidAmount ?? 0));
    totalPending += outstanding;
    if (inv.status === "overdue") totalOverdue += outstanding;
  }

  const items: FeeDueItem[] = due
    .slice()
    .sort((a, b) => (a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === "overdue" ? -1 : 1))
    .slice(0, MAX_ITEMS)
    .map((inv) => {
      const student = studentById.get(inv.studentId);
      const outstanding = Math.max(0, inv.netAmount - (inv.paidAmount ?? 0));
      return {
        id: inv.id,
        studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown student",
        term: inv.term,
        amount: outstanding,
        dueDate: inv.dueDate,
        status: inv.status,
      };
    });

  return { totalPending, totalOverdue, currency: "INR", items };
}

// ── Library due books ───────────────────────────────────────────────────

async function resolveBorrowerName(personType: "student" | "staff", personId: string): Promise<string> {
  if (personType === "student") {
    const students = await listStudents();
    const student = students.find((s) => s.id === personId);
    return student ? `${student.firstName} ${student.lastName}` : "Unknown student";
  }
  const staff = await listStaff();
  const member = staff.find((s) => s.id === personId);
  return member ? `${member.firstName} ${member.lastName}` : "Unknown staff";
}

async function buildLibraryDueForChildren(children: Student[]): Promise<LibraryDueItem[]> {
  const [loans, books, members] = await Promise.all([listLoans(), listBooks(), listMembers()]);
  const bookById = new Map(books.map((b) => [b.id, b.title] as const));
  const childMemberIds = new Set(
    members.filter((m) => m.personType === "student" && children.some((c) => c.id === m.personId)).map((m) => m.id),
  );

  const rows: LibraryDueItem[] = loans
    .filter((loan) => loan.status !== "returned" && childMemberIds.has(loan.memberId))
    .map((loan) => {
      const member = members.find((m) => m.id === loan.memberId);
      const child = children.find((c) => c.id === member?.personId);
      return {
        id: loan.id,
        bookTitle: bookById.get(loan.bookId) ?? "Unknown title",
        borrowerName: child ? `${child.firstName} ${child.lastName}` : "—",
        dueDate: loan.dueDate,
        overdue: loan.status === "overdue",
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return rows.slice(0, MAX_ITEMS);
}

async function buildLibraryDueSchoolwide(): Promise<LibraryDueItem[]> {
  const [loans, books, members] = await Promise.all([listLoans(), listBooks(), listMembers()]);
  const bookById = new Map(books.map((b) => [b.id, b.title] as const));
  const memberById = new Map(members.map((m) => [m.id, m] as const));
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);

  const relevant = loans.filter((loan) => loan.status === "overdue" || (loan.status === "issued" && new Date(loan.dueDate) <= soon));
  const rows: LibraryDueItem[] = [];
  for (const loan of relevant.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, MAX_ITEMS)) {
    const member = memberById.get(loan.memberId);
    const borrowerName = member ? await resolveBorrowerName(member.personType, member.personId) : "Unknown";
    rows.push({
      id: loan.id,
      bookTitle: bookById.get(loan.bookId) ?? "Unknown title",
      borrowerName,
      dueDate: loan.dueDate,
      overdue: loan.status === "overdue",
    });
  }
  return rows;
}

// ── Bus status ──────────────────────────────────────────────────────────

async function buildBusStatusForChildren(children: Student[]): Promise<BusStatusSummary> {
  const [assignments, liveStatuses] = await Promise.all([listAssignments(), listLiveStatuses()]);
  const childIds = new Set(children.map((c) => c.id));
  const myAssignment = assignments.find((a) => a.status === "active" && childIds.has(a.studentId));
  if (!myAssignment) return { fleet: [], mine: null };

  const live = liveStatuses.find((row) => row.routeId === myAssignment.routeId);
  if (!live) return { fleet: [], mine: null };

  return {
    fleet: [],
    mine: {
      routeName: live.route.name,
      busRegNumber: live.bus.regNumber,
      status: live.status,
      currentStopName: live.stops[live.currentStopIndex]?.name,
    },
  };
}

async function buildBusStatusSchoolwide(): Promise<BusStatusSummary> {
  const liveStatuses = await listLiveStatuses();
  const counts = new Map<BusTrackingStatus, number>();
  for (const row of liveStatuses) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  const fleet = Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  return { fleet, mine: null };
}

// ── Hostel occupancy ────────────────────────────────────────────────────

async function buildHostelOccupancyForChildren(children: Student[]): Promise<HostelOccupancySummary> {
  const allocations = await listAllocations();
  const childIds = new Set(children.map((c) => c.id));
  const myAllocation = allocations.find((a) => a.status === "active" && childIds.has(a.student.id));
  if (!myAllocation) return { hostels: [], mine: null };

  return {
    hostels: [],
    mine: { hostelName: myAllocation.hostel.name, roomNumber: myAllocation.room.roomNumber, bedNumber: myAllocation.bedNumber },
  };
}

async function buildHostelOccupancySchoolwide(): Promise<HostelOccupancySummary> {
  const hostels = await listHostels();
  const active = hostels.filter((h) => h.status === "active");
  return {
    hostels: active.map((h) => ({ hostelName: h.name, occupiedCount: h.occupiedCount, bedCount: h.bedCount })),
    mine: null,
  };
}

// ── Assembler ───────────────────────────────────────────────────────────

export async function fetchDashboardData(role: UserRole, email: string | undefined, range: DashboardDateRange): Promise<DashboardData> {
  const months = monthsInRange(resolveDateRange(range));
  const children = await getParentChildren(role, email);
  const isParentScoped = role === "parent" && children.length > 0;

  const [
    pendingAssignments,
    upcomingExams,
    feesDue,
    libraryDue,
    busStatus,
    hostelOccupancy,
  ] = await Promise.all([
    isParentScoped ? buildPendingAssignmentsForChildren(children) : buildPendingAssignmentsSchoolwide(),
    isParentScoped ? buildUpcomingExamsForChildren(children) : buildUpcomingExamsSchoolwide(),
    isParentScoped ? buildFeesDueForChildren(children) : buildFeesDueSchoolwide(),
    isParentScoped ? buildLibraryDueForChildren(children) : buildLibraryDueSchoolwide(),
    isParentScoped ? buildBusStatusForChildren(children) : buildBusStatusSchoolwide(),
    isParentScoped ? buildHostelOccupancyForChildren(children) : buildHostelOccupancySchoolwide(),
  ]);

  const data: DashboardData = {
    stats: buildStats(role),
    attendance: buildAttendance(role),
    todayClasses: buildTodayClasses(role),
    upcomingExams,
    pendingAssignments,
    feesDue,
    libraryDue,
    busStatus,
    hostelOccupancy,
    notifications: buildNotifications(),
    birthdays: buildBirthdays(),
    holidays: buildHolidays(),
    calendarEvents: buildCalendarEvents(),
    recentActivity: buildRecentActivity(role),
    performanceTrend: buildPerformanceTrend(months),
    revenueTrend: buildRevenueTrend(months),
  };

  return mockDelay(data, 500);
}
