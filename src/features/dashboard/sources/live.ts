import type { UserRole } from "@/types/auth";
import { academicHttpClient } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import * as academicsApi from "@/features/academics/api";
import { getDailySectionSummaries, listAttendanceRecords } from "@/features/attendance/api";
import * as examsApi from "@/features/examinations/api";
import * as feesApi from "@/features/fees/api";
import { listTickets } from "@/features/helpdesk/api";
import * as homeworkApi from "@/features/homework/api";
import { listAllocations, listHostels } from "@/features/hostel/api";
import * as libraryApi from "@/features/library/api";
import { listMyNotifications } from "@/features/notifications/api";
import type { NotificationCategory } from "@/features/notifications/types";
import { listAuditLog } from "@/features/settings/api";
import * as staffApi from "@/features/staff/api";
import * as studentsApi from "@/features/students/api";
import { listSlots } from "@/features/timetable/api";
import { PERIOD_DEFINITIONS, dateToDayOfWeek } from "@/features/timetable/constants";
import { listAssignments, listLiveStatuses } from "@/features/transport/api";
import type { BusTrackingStatus } from "@/features/transport/types";
import { listPreApprovedVisits, listVisitorEntries } from "@/features/visitors/api";
import { listTenants } from "@/features/platform/api";
import { fetchScopeSummary } from "../scopeApi";
import { getAcademicSummary, getFeeSummary, monthKeyFromIso, type SummaryRange } from "./summaryApi";
import { isWithinRange, monthsInRange, toIsoDate } from "../dateRange";
import type {
  ActivityItem,
  AlertItem,
  FeeDefaulter,
  LearnerAttendance,
  RankedItem,
  SchoolsOverview,
  StatusSlice,
  WidgetTone,
  AttendanceSummary,
  BirthdayItem,
  BusStatusSummary,
  CalendarEvent,
  ClassSession,
  FeeDueItem,
  FeeDueSummary,
  HolidayItem,
  HostelOccupancySummary,
  LibraryDueItem,
  NotificationItem,
  PendingAssignment,
  PerformanceTrendPoint,
  RevenueTrendPoint,
  StatCardData,
  UpcomingExam,
} from "../types";
import { isPersonal, type DashboardContext, type DashboardIdentity, type DashboardSourceImpl, type Learner } from "./types";

/**
 * Live data: every widget is composed from the module APIs the rest of the app already uses, scoped the way the
 * signed-in person is allowed to see it (school-wide for staff, their own record or children for students and
 * parents). Each loader stands alone so the page can fetch, retry and fail one card at a time.
 */

// ── Shared lists ────────────────────────────────────────────────────────
// Several widgets need the same reference lists (subjects, classes, students, invoices…). Each list is fetched
// once per school/branch and shared for a few seconds, so a dashboard load doesn't ask for it six times.

const SHARE_MS = 15_000;
const sharedCache = new Map<string, { at: number; promise: Promise<unknown> }>();

function shared<T>(name: string, load: () => Promise<T>): () => Promise<T> {
  return () => {
    const { activeTenantId, activeBranchId } = useAuthStore.getState();
    const key = `${name}|${activeTenantId}|${activeBranchId}`;
    const hit = sharedCache.get(key);
    if (hit && Date.now() - hit.at < SHARE_MS) return hit.promise as Promise<T>;
    const promise = load();
    sharedCache.set(key, { at: Date.now(), promise });
    // A failure is never shared: the next caller (or the card's retry) asks again.
    promise.catch(() => sharedCache.delete(key));
    return promise;
  };
}

const listSubjects = shared("subjects", () => academicsApi.listSubjects());
const listClasses = shared("classes", () => academicsApi.listClasses());
const listSections = shared("sections", () => academicsApi.listSections());
const listCalendarEvents = shared("calendar", () => academicsApi.listCalendarEvents());
const listExams = shared("exams", () => examsApi.listExams());
const listExamSchedules = shared("examSchedules", () => examsApi.listExamSchedules());
const getExamClassResults = examsApi.getExamClassResults;
const listInvoices = shared("invoices", () => feesApi.listInvoices());
const listInvoicesForStudent = feesApi.listInvoicesForStudent;
const listHomework = shared("homework", () => homeworkApi.listHomework());
const listAssignedHomework = homeworkApi.listAssignedHomework;
const listSubmissionsForHomework = homeworkApi.listSubmissionsForHomework;
const listLoans = shared("loans", () => libraryApi.listLoans());
const listBooks = shared("books", () => libraryApi.listBooks());
const listMembers = shared("members", () => libraryApi.listMembers());
const listStaff = shared("staff", () => staffApi.listStaff());
const listStudents = shared("students", () => studentsApi.listStudents());

// The services' aggregation endpoints, shared per school/branch and date range like the lists above.
const academicSummary = (range: SummaryRange) =>
  shared(`academic-summary|${toIsoDate(range.start)}|${toIsoDate(range.end)}`, () => getAcademicSummary(range))();
const feeSummary = (range: SummaryRange) => shared(`fee-summary|${toIsoDate(range.start)}|${toIsoDate(range.end)}`, () => getFeeSummary(range))();

const MAX_ITEMS = 5;
/** Pass mark used for the performance trend's pass rate (percentage of total marks). */
const PASS_PERCENT = 35;
const DAY_MS = 86_400_000;

const todayIso = () => toIsoDate(new Date());

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function durationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function outstanding(inv: { netAmount: number; paidAmount?: number; status: string }): number {
  return inv.status === "paid" ? 0 : Math.max(0, inv.netAmount - (inv.paidAmount ?? 0));
}

/** ₹48.1L / ₹2.3Cr / ₹12,500 - the compact Indian format the stat tiles use. */
export function formatInrCompact(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** Change vs. the previous period, as a stat tile delta. */
function delta(current: number, previous: number, unit: "%" | "pts" = "%"): StatCardData["delta"] {
  if (previous === 0 && current === 0) return undefined;
  const diff = unit === "pts" ? current - previous : previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  return { value: `${rounded > 0 ? "+" : ""}${rounded}${unit === "pts" ? " pts" : "%"}`, direction };
}

/** The same-length window immediately before `range`, for "vs previous period" comparisons. */
function previousRange(range: { start: Date; end: Date }): { start: Date; end: Date } {
  const span = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - span - 1), end: new Date(range.start.getTime() - 1) };
}

async function settle<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p;
  } catch {
    return undefined;
  }
}

// ── Identity ────────────────────────────────────────────────────────────

interface ApiMyChild {
  studentId: string;
  name: string;
  sectionId: string;
  classId: string;
  classLabel: string;
}

interface ApiMyPerson {
  student: ApiMyChild | null;
  staffId: string | null;
  children: ApiMyChild[];
}

const toLearner = (c: ApiMyChild): Learner => ({
  studentId: c.studentId,
  name: c.name,
  sectionId: c.sectionId,
  classId: c.classId,
  classLabel: c.classLabel,
});

/** One lookup for every personal widget: a student's own record, a parent's linked children, a teacher's staff id. */
async function loadIdentity(role: UserRole): Promise<DashboardIdentity> {
  try {
    const { data } = await academicHttpClient.get<ApiMyPerson>("/api/people/me");
    const learners = role === "student" ? (data.student ? [toLearner(data.student)] : []) : role === "parent" ? data.children.map(toLearner) : [];
    return { staffId: data.staffId, learners };
  } catch {
    // An unlinked login (or a role AcademicService doesn't know) still gets a dashboard - just no personal data.
    return { staffId: null, learners: [] };
  }
}

/**
 * Parents and students get their children's records, or nothing when none are linked - never the school-wide
 * lists, which they aren't allowed to read.
 */
function personalOr<T>(ctx: DashboardContext, forLearners: (l: Learner[]) => Promise<T>, schoolwide: () => Promise<T>, empty: T): Promise<T> {
  if (!isPersonal(ctx.role)) return schoolwide();
  return ctx.identity.learners.length > 0 ? forLearners(ctx.identity.learners) : Promise.resolve(empty);
}

/** The sections a teacher teaches (from their timetable); empty for anyone without a linked staff record. */
async function teacherSectionIds(ctx: DashboardContext): Promise<Set<string>> {
  if (!ctx.identity.staffId) return new Set();
  const slots = await listSlots({ staffId: ctx.identity.staffId });
  return new Set(slots.map((s) => s.sectionId));
}

// ── Homework pending ────────────────────────────────────────────────────

async function pendingAssignments(ctx: DashboardContext): Promise<PendingAssignment[]> {
  return personalOr(
    ctx,
    async (learners) => {
      const subjects = await listSubjects();
      const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
      const rows: PendingAssignment[] = [];
      for (const learner of learners) {
        for (const row of await listAssignedHomework(learner.studentId)) {
          if (row.submission.status !== "not_submitted" && row.submission.status !== "resubmit_requested") continue;
          rows.push({
            id: row.submission.id,
            title: row.homework.title,
            subject: subjectById.get(row.homework.subjectId) ?? "Subject",
            className: learners.length > 1 ? `${learner.name.split(" ")[0]} · ${learner.classLabel}` : learner.classLabel,
            dueDate: row.homework.dueDate,
          });
        }
      }
      return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, MAX_ITEMS);
    },
    async () => {
      const [homework, subjects, classes] = await Promise.all([listHomework(), listSubjects(), listClasses()]);
      const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
      const classById = new Map(classes.map((c) => [c.id, c.name] as const));
      const today = startOfToday();
      // A teacher sees their own homework; leadership sees the whole school's.
      const mine = ctx.role === "teacher" && ctx.identity.staffId ? homework.filter((h) => h.staffId === ctx.identity.staffId) : homework;
      const upcoming = mine
        .filter((h) => h.status === "published" && new Date(h.dueDate) >= today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, MAX_ITEMS);
      return Promise.all(
        upcoming.map(async (hw) => {
          const submissions = await listSubmissionsForHomework(hw.id);
          return {
            id: hw.id,
            title: hw.title,
            subject: subjectById.get(hw.subjectId) ?? "Subject",
            className: classById.get(hw.classId) ?? "—",
            dueDate: hw.dueDate,
            submittedCount: submissions.filter((s) => s.status !== "not_submitted").length,
            totalCount: submissions.length,
          };
        }),
      );
    },
    [],
  );
}

// ── Upcoming exams ──────────────────────────────────────────────────────

async function upcomingExams(ctx: DashboardContext): Promise<UpcomingExam[]> {
  const [exams, schedules, subjects, classes] = await Promise.all([listExams(), listExamSchedules(), listSubjects(), listClasses()]);
  const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
  const classIdByExam = new Map(exams.map((e) => [e.id, e.classId] as const));
  const classNameById = new Map(classes.map((c) => [c.id, c.name] as const));
  const today = startOfToday();

  let classFilter: Set<string> | null = null;
  if (isPersonal(ctx.role)) {
    if (ctx.identity.learners.length === 0) return [];
    classFilter = new Set(ctx.identity.learners.map((l) => l.classId));
  }

  return schedules
    .filter((sch) => new Date(sch.date) >= today && (!classFilter || classFilter.has(classIdByExam.get(sch.examId) ?? "")))
    .map((sch) => ({
      id: sch.id,
      subject: subjectById.get(sch.subjectId) ?? "Subject",
      className: classNameById.get(classIdByExam.get(sch.examId) ?? "") ?? "—",
      date: sch.date,
      durationMinutes: durationMinutes(sch.startTime, sch.endTime),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_ITEMS);
}

// ── Fees due ────────────────────────────────────────────────────────────

const EMPTY_FEES: FeeDueSummary = { totalPending: 0, totalOverdue: 0, currency: "INR", items: [] };

async function feesDue(ctx: DashboardContext): Promise<FeeDueSummary> {
  return personalOr(
    ctx,
    async (learners) => {
      let totalPending = 0;
      let totalOverdue = 0;
      const items: FeeDueItem[] = [];
      for (const learner of learners) {
        for (const inv of await listInvoicesForStudent(learner.studentId)) {
          const due = outstanding(inv);
          if (due <= 0) continue;
          totalPending += due;
          if (inv.status === "overdue") totalOverdue += due;
          items.push({ id: inv.id, studentName: learner.name, term: inv.term, amount: due, dueDate: inv.dueDate, status: inv.status });
        }
      }
      items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      return { totalPending, totalOverdue, currency: "INR", items: items.slice(0, MAX_ITEMS) };
    },
    async () => {
      const [invoices, students] = await Promise.all([listInvoices(), listStudents()]);
      const studentById = new Map(students.map((s) => [s.id, s] as const));
      const due = invoices.filter((inv) => outstanding(inv) > 0);
      let totalPending = 0;
      let totalOverdue = 0;
      for (const inv of due) {
        totalPending += outstanding(inv);
        if (inv.status === "overdue") totalOverdue += outstanding(inv);
      }
      const items: FeeDueItem[] = due
        .slice()
        .sort((a, b) => (a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === "overdue" ? -1 : 1))
        .slice(0, MAX_ITEMS)
        .map((inv) => {
          const student = studentById.get(inv.studentId);
          return {
            id: inv.id,
            studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown student",
            term: inv.term,
            amount: outstanding(inv),
            dueDate: inv.dueDate,
            status: inv.status,
          };
        });
      return { totalPending, totalOverdue, currency: "INR", items };
    },
    EMPTY_FEES,
  );
}

// ── Library due books ───────────────────────────────────────────────────

async function libraryDue(ctx: DashboardContext): Promise<LibraryDueItem[]> {
  const [loans, books, members] = await Promise.all([listLoans(), listBooks(), listMembers()]);
  const bookById = new Map(books.map((b) => [b.id, b.title] as const));
  const memberById = new Map(members.map((m) => [m.id, m] as const));

  if (isPersonal(ctx.role)) {
    const learnerById = new Map(ctx.identity.learners.map((l) => [l.studentId, l] as const));
    return loans
      .filter((loan) => loan.status !== "returned")
      .map((loan) => ({ loan, member: memberById.get(loan.memberId) }))
      .filter(({ member }) => member?.personType === "student" && learnerById.has(member.personId))
      .map(({ loan, member }) => ({
        id: loan.id,
        bookTitle: bookById.get(loan.bookId) ?? "Unknown title",
        borrowerName: learnerById.get(member!.personId)?.name ?? "—",
        dueDate: loan.dueDate,
        overdue: loan.status === "overdue",
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, MAX_ITEMS);
  }

  const soon = addDays(new Date(), 3);
  const relevant = loans
    .filter((loan) => loan.status === "overdue" || (loan.status === "issued" && new Date(loan.dueDate) <= soon))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, MAX_ITEMS);
  if (relevant.length === 0) return [];
  const [students, staff] = await Promise.all([settle(listStudents()), settle(listStaff())]);
  const nameOf = (personType: string, personId: string) => {
    const person = personType === "student" ? students?.find((s) => s.id === personId) : staff?.find((s) => s.id === personId);
    return person ? `${person.firstName} ${person.lastName}` : personType === "student" ? "Student" : "Staff member";
  };
  return relevant.map((loan) => {
    const member = memberById.get(loan.memberId);
    return {
      id: loan.id,
      bookTitle: bookById.get(loan.bookId) ?? "Unknown title",
      borrowerName: member ? nameOf(member.personType, member.personId) : "Unknown",
      dueDate: loan.dueDate,
      overdue: loan.status === "overdue",
    };
  });
}

// ── Bus status ──────────────────────────────────────────────────────────

async function busStatus(ctx: DashboardContext): Promise<BusStatusSummary> {
  return personalOr<BusStatusSummary>(
    ctx,
    async (learners) => {
      const [assignments, liveStatuses] = await Promise.all([listAssignments(), listLiveStatuses()]);
      const ids = new Set(learners.map((l) => l.studentId));
      const mine = assignments.find((a) => a.status === "active" && ids.has(a.studentId));
      const live = mine ? liveStatuses.find((row) => row.routeId === mine.routeId) : undefined;
      return live
        ? {
            fleet: [],
            mine: { routeName: live.route.name, busRegNumber: live.bus.regNumber, status: live.status, currentStopName: live.stops[live.currentStopIndex]?.name },
          }
        : { fleet: [], mine: null };
    },
    async () => {
      const counts = new Map<BusTrackingStatus, number>();
      for (const row of await listLiveStatuses()) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
      return { fleet: Array.from(counts.entries()).map(([status, count]) => ({ status, count })), mine: null };
    },
    { fleet: [], mine: null },
  );
}

// ── Hostel occupancy ────────────────────────────────────────────────────

async function hostelOccupancy(ctx: DashboardContext): Promise<HostelOccupancySummary> {
  return personalOr<HostelOccupancySummary>(
    ctx,
    async (learners) => {
      const ids = new Set(learners.map((l) => l.studentId));
      const mine = (await listAllocations()).find((a) => a.status === "active" && ids.has(a.student.id));
      return mine
        ? { hostels: [], mine: { hostelName: mine.hostel.name, roomNumber: mine.room.roomNumber, bedNumber: mine.bedNumber } }
        : { hostels: [], mine: null };
    },
    async () => ({
      hostels: (await listHostels())
        .filter((h) => h.status === "active")
        .map((h) => ({ hostelName: h.name, occupiedCount: h.occupiedCount, bedCount: h.bedCount })),
      mine: null,
    }),
    { hostels: [], mine: null },
  );
}

// ── Attendance today ────────────────────────────────────────────────────

const EMPTY_ATTENDANCE: AttendanceSummary = { present: 0, absent: 0, late: 0, onLeave: 0, totalMarked: 0 };

async function attendance(ctx: DashboardContext): Promise<AttendanceSummary> {
  const today = todayIso();
  if (isPersonal(ctx.role)) {
    const ids = new Set(ctx.identity.learners.map((l) => l.studentId));
    if (ids.size === 0) return EMPTY_ATTENDANCE;
    const records = (await listAttendanceRecords({ dateFrom: today, dateTo: today })).filter((r) => ids.has(r.studentId));
    return {
      present: records.filter((r) => r.status === "present" || r.status === "half-day").length,
      absent: records.filter((r) => r.status === "absent").length,
      late: records.filter((r) => r.status === "late").length,
      onLeave: records.filter((r) => r.status === "leave").length,
      totalMarked: records.length,
    };
  }

  let summaries = await getDailySectionSummaries(today);
  // A teacher sees the sections they teach; with no timetable yet, the whole school.
  if (ctx.role === "teacher") {
    const sections = await teacherSectionIds(ctx);
    if (sections.size > 0) summaries = summaries.filter((s) => sections.has(s.sectionId));
  }
  return summaries.reduce<AttendanceSummary>(
    (acc, s) => ({
      present: acc.present + s.present + s.halfDay,
      absent: acc.absent + s.absent,
      late: acc.late + s.late,
      onLeave: acc.onLeave + s.leave,
      totalMarked: acc.totalMarked + s.marked,
    }),
    { ...EMPTY_ATTENDANCE },
  );
}

// ── Today's classes ─────────────────────────────────────────────────────

async function todayClasses(ctx: DashboardContext): Promise<ClassSession[]> {
  const dow = dateToDayOfWeek(todayIso());
  if (dow === null) return [];

  let slots;
  if (ctx.role === "teacher") {
    if (!ctx.identity.staffId) return [];
    slots = await listSlots({ staffId: ctx.identity.staffId });
  } else if (isPersonal(ctx.role)) {
    const sectionIds = [...new Set(ctx.identity.learners.map((l) => l.sectionId))];
    slots = (await Promise.all(sectionIds.map((sectionId) => listSlots({ sectionId })))).flat();
  } else {
    return [];
  }

  const [subjects, sections, classes] = await Promise.all([listSubjects(), listSections(), listClasses()]);
  const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
  const sectionById = new Map(sections.map((s) => [s.id, s] as const));
  const classById = new Map(classes.map((c) => [c.id, c.name] as const));
  const periodByNumber = new Map(PERIOD_DEFINITIONS.map((p) => [p.periodNumber, p] as const));
  const toTime = (t: string) => {
    const [h, m] = t.trim().split(":").map(Number);
    // Period times are written 8:00-3:30 without am/pm; school hours before 7 are afternoon.
    return `${String(h < 7 ? h + 12 : h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return slots
    .filter((s) => s.dayOfWeek === dow && !s.isBreak && s.subjectId)
    .sort((a, b) => a.periodNumber - b.periodNumber)
    .map((s) => {
      const section = sectionById.get(s.sectionId);
      const [start = "00:00", end = "00:00"] = (periodByNumber.get(s.periodNumber)?.time ?? "").split("-");
      return {
        id: s.id,
        subject: subjectById.get(s.subjectId!) ?? "Subject",
        className: section ? `${classById.get(section.classId) ?? "Class"} - ${section.name}` : "—",
        room: s.room ?? "—",
        startTime: toTime(start),
        endTime: toTime(end),
      };
    });
}

// ── Notifications ───────────────────────────────────────────────────────

const NOTIFICATION_CATEGORY: Record<NotificationCategory, NotificationItem["category"]> = {
  announcement: "event",
  academic: "academic",
  finance: "finance",
  event: "event",
  system: "system",
  alert: "system",
  talent: "event",
  meeting: "academic",
  message: "event",
};

async function notifications(): Promise<NotificationItem[]> {
  return (await listMyNotifications())
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ITEMS)
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
      read: n.read,
      category: NOTIFICATION_CATEGORY[n.category] ?? "system",
    }));
}

// ── Birthdays ───────────────────────────────────────────────────────────

/** The next occurrence of a birthday (this year, or next year if it has passed). */
function nextBirthday(dateOfBirth: string, from: Date): Date {
  const [, m, d] = dateOfBirth.slice(0, 10).split("-").map(Number);
  const candidate = new Date(from.getFullYear(), m - 1, d);
  return candidate < from ? new Date(from.getFullYear() + 1, m - 1, d) : candidate;
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

async function birthdays(): Promise<BirthdayItem[]> {
  const [students, staff] = await Promise.all([settle(listStudents()), settle(listStaff())]);
  const today = startOfToday();
  const horizon = addDays(today, 7);
  const people = [
    ...(students ?? []).filter((s) => s.status === "active").map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, dob: s.dateOfBirth, role: "student" as const })),
    ...(staff ?? []).filter((s) => s.status === "active" || s.status === "on-leave").map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, dob: s.dateOfBirth, role: "staff" as const })),
  ];
  return people
    .filter((p) => p.dob)
    .map((p) => ({ ...p, next: nextBirthday(p.dob, today) }))
    .filter((p) => p.next <= horizon)
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, MAX_ITEMS)
    .map((p) => ({ id: `${p.role}-${p.id}`, name: p.name, role: p.role, date: p.next.toISOString(), avatarInitials: initials(p.name) }));
}

// ── Holidays & calendar ─────────────────────────────────────────────────

async function holidays(): Promise<HolidayItem[]> {
  const today = todayIso();
  return (await listCalendarEvents())
    .filter((e) => e.type === "holiday" && (e.endDate ?? e.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, MAX_ITEMS)
    .map((e) => ({ id: e.id, name: e.title, date: e.startDate, type: "school" as const }));
}

async function calendarEvents(ctx: DashboardContext): Promise<CalendarEvent[]> {
  const from = addDays(startOfToday(), -31);
  const to = addDays(startOfToday(), 92);
  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t <= to.getTime();
  };

  const [events, exams, schedules, subjects] = await Promise.all([
    listCalendarEvents(),
    settle(listExams()),
    settle(listExamSchedules()),
    settle(listSubjects()),
  ]);
  const out: CalendarEvent[] = events
    .filter((e) => inWindow(e.startDate))
    .map((e) => ({ date: e.startDate, kind: e.type === "holiday" ? "holiday" : e.type === "exam" ? "exam" : "event", label: e.title }));

  // Exam papers: the learner's own classes for families, everything for staff.
  const classFilter = isPersonal(ctx.role) ? new Set(ctx.identity.learners.map((l) => l.classId)) : null;
  const classIdByExam = new Map((exams ?? []).map((e) => [e.id, e.classId] as const));
  const subjectById = new Map((subjects ?? []).map((s) => [s.id, s.name] as const));
  for (const sch of schedules ?? []) {
    if (!inWindow(sch.date)) continue;
    if (classFilter && !classFilter.has(classIdByExam.get(sch.examId) ?? "")) continue;
    out.push({ date: sch.date, kind: "exam", label: `${subjectById.get(sch.subjectId) ?? "Subject"} exam` });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Recent activity ─────────────────────────────────────────────────────

async function recentActivity(): Promise<ActivityItem[]> {
  return (await listAuditLog())
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((e) => ({ id: e.id, actor: e.actor, action: e.action, target: e.detail ?? e.category, createdAt: e.createdAt }));
}

// ── Trends ──────────────────────────────────────────────────────────────

/** Month key used by monthsInRange: "2026-8" for September 2026 (0-based month). */
const monthKey = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

async function performanceTrend(ctx: DashboardContext): Promise<PerformanceTrendPoint[]> {
  const months = monthsInRange(ctx.range);
  // School-wide: AcademicService aggregates every result in range in one request.
  if (!isPersonal(ctx.role) && ctx.role !== "teacher") {
    const byMonth = new Map((await academicSummary(ctx.range)).performance.map((p) => [monthKeyFromIso(p.month), p]));
    return months.map((m) => ({ month: m.label, averageScore: byMonth.get(m.key)?.averageScore ?? null, passRate: byMonth.get(m.key)?.passRate ?? null }));
  }
  let exams = (await listExams()).filter((e) => isWithinRange(`${e.startDate}T12:00:00`, ctx.range));

  let studentFilter: Set<string> | null = null;
  if (isPersonal(ctx.role)) {
    if (ctx.identity.learners.length === 0) return months.map((m) => ({ month: m.label, averageScore: null, passRate: null }));
    const classIds = new Set(ctx.identity.learners.map((l) => l.classId));
    exams = exams.filter((e) => classIds.has(e.classId));
    studentFilter = new Set(ctx.identity.learners.map((l) => l.studentId));
  } else if (ctx.role === "teacher") {
    const sectionIds = await teacherSectionIds(ctx);
    if (sectionIds.size > 0) {
      const sections = await listSections();
      const classIds = new Set(sections.filter((s) => sectionIds.has(s.id)).map((s) => s.classId));
      exams = exams.filter((e) => classIds.has(e.classId));
    }
  }

  // Newest first and capped, so a long range doesn't fan out into dozens of requests.
  exams = exams.sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 24);
  const results = await Promise.all(exams.map((e) => settle(getExamClassResults(e.id))));

  const byMonth = new Map<string, { total: number; passed: number; count: number }>();
  exams.forEach((exam, i) => {
    const rows = (results[i] ?? []).filter((r) => !studentFilter || studentFilter.has(r.studentId));
    if (rows.length === 0) return;
    const key = monthKey(exam.startDate);
    const bucket = byMonth.get(key) ?? { total: 0, passed: 0, count: 0 };
    for (const r of rows) {
      bucket.total += r.percentage;
      bucket.count += 1;
      if (r.percentage >= PASS_PERCENT) bucket.passed += 1;
    }
    byMonth.set(key, bucket);
  });

  return months.map((m) => {
    const b = byMonth.get(m.key);
    return { month: m.label, averageScore: b ? Math.round(b.total / b.count) : null, passRate: b ? Math.round((b.passed / b.count) * 100) : null };
  });
}

async function revenueTrend(ctx: DashboardContext): Promise<RevenueTrendPoint[]> {
  const months = monthsInRange(ctx.range);
  const byMonth = new Map((await feeSummary(ctx.range)).months.map((m) => [monthKeyFromIso(m.month), m]));
  return months.map((m) => ({ month: m.label, collected: byMonth.get(m.key)?.collected ?? 0, expected: byMonth.get(m.key)?.expected ?? 0 }));
}

// ── Key stats (role-specific) ───────────────────────────────────────────

async function attendancePercentOn(date: string, sectionFilter?: Set<string>): Promise<number | null> {
  let summaries = await getDailySectionSummaries(date);
  if (sectionFilter && sectionFilter.size > 0) summaries = summaries.filter((s) => sectionFilter.has(s.sectionId));
  const marked = summaries.reduce((n, s) => n + s.marked, 0);
  const present = summaries.reduce((n, s) => n + s.present + s.halfDay + s.late, 0);
  return percent(present, marked);
}

/** The most recent school day before today (skips Sunday), for "vs yesterday" attendance. */
function previousSchoolDay(): string {
  let d = addDays(startOfToday(), -1);
  if (d.getDay() === 0) d = addDays(d, -1);
  return toIsoDate(d);
}

async function attendanceStat(sectionFilter?: Set<string>): Promise<StatCardData> {
  const [today, before] = await Promise.all([attendancePercentOn(todayIso(), sectionFilter), settle(attendancePercentOn(previousSchoolDay(), sectionFilter))]);
  return {
    id: "st-attendance",
    label: "Attendance today",
    value: today === null ? "Not marked" : `${today}%`,
    delta: today !== null && before !== null && before !== undefined ? delta(today, before, "pts") : undefined,
    icon: "CalendarCheck",
  };
}

async function feesStats(ctx: DashboardContext) {
  const fees = await feeSummary(ctx.range);
  return {
    collected: {
      id: "st-fees",
      label: "Fees collected",
      value: formatInrCompact(fees.collectedInRange),
      delta: delta(fees.collectedInRange, fees.collectedPreviousRange),
      icon: "Wallet",
    } satisfies StatCardData,
    pending: { id: "st-pending", label: "Fees pending", value: formatInrCompact(fees.pending), icon: "Receipt" } satisfies StatCardData,
    overdue: {
      id: "st-overdue",
      label: "Overdue invoices",
      value: String(fees.overdueCount),
      icon: "AlarmClock",
      delta: fees.overdueCount ? { value: formatInrCompact(fees.overdueAmount), direction: "flat" } : undefined,
    } satisfies StatCardData,
    paymentsToday: { id: "st-receipts", label: "Payments today", value: String(fees.paymentsToday), icon: "Receipt" } satisfies StatCardData,
  };
}

/** School-wide attendance today vs the previous school day, from the academic summary. */
async function schoolAttendanceStat(ctx: DashboardContext): Promise<StatCardData> {
  const { today, previousSchoolDay } = await academicSummary(ctx.range);
  return {
    id: "st-attendance",
    label: "Attendance today",
    value: today.percent === null ? "Not marked" : `${Math.round(today.percent)}%`,
    delta:
      today.percent !== null && previousSchoolDay.percent !== null
        ? delta(Math.round(today.percent), Math.round(previousSchoolDay.percent), "pts")
        : undefined,
    icon: "CalendarCheck",
  };
}

/** Each tile loads on its own; a module the role can't read shows "—" instead of failing the whole row. */
async function tiles(...loaders: Array<() => Promise<StatCardData>>): Promise<StatCardData[]> {
  const results = await Promise.all(loaders.map((load) => settle(load())));
  return results.filter((t): t is StatCardData => Boolean(t));
}

async function stats(ctx: DashboardContext): Promise<StatCardData[]> {
  const range = ctx.range;
  switch (ctx.role) {
    case "parent":
    case "student": {
      const learners = ctx.identity.learners;
      if (learners.length === 0) return [];
      const ids = new Set(learners.map((l) => l.studentId));
      return tiles(
        async () => {
          const from = toIsoDate(addDays(startOfToday(), -29));
          const records = (await listAttendanceRecords({ dateFrom: from, dateTo: todayIso() })).filter((r) => ids.has(r.studentId));
          const present = records.filter((r) => r.status !== "absent" && r.status !== "leave").length;
          const pct = percent(present, records.length);
          return { id: "st-attendance", label: "Attendance (30 days)", value: pct === null ? "—" : `${pct}%`, icon: "CalendarCheck" };
        },
        async () => {
          const fees = await feesDue(ctx);
          return {
            id: "st-fees",
            label: "Fees pending",
            value: formatInrCompact(fees.totalPending),
            delta: fees.totalOverdue > 0 ? { value: `${formatInrCompact(fees.totalOverdue)} overdue`, direction: "down" } : undefined,
            icon: "Wallet",
          };
        },
        async () => ({ id: "st-assignments", label: "Homework due", value: String((await pendingAssignments(ctx)).length), icon: "ClipboardList" }),
        async () => ({ id: "st-exams", label: "Upcoming exams", value: String((await upcomingExams(ctx)).length), icon: "FileCheck" }),
      );
    }

    case "teacher": {
      const sections = await settle(teacherSectionIds(ctx));
      return tiles(
        async () => ({ id: "st-classes", label: "Classes today", value: String((await todayClasses(ctx)).length), icon: "Presentation" }),
        () => attendanceStat(sections),
        async () => {
          const homework = (await listHomework()).filter((h) => h.staffId === ctx.identity.staffId && h.status === "published");
          const recent = homework.filter((h) => new Date(h.dueDate) >= addDays(startOfToday(), -30));
          const subs = await Promise.all(recent.map((h) => listSubmissionsForHomework(h.id)));
          const toGrade = subs.flat().filter((s) => s.status === "submitted").length;
          return { id: "st-assignments", label: "Submissions to grade", value: String(toGrade), icon: "ClipboardList" };
        },
        async () => ({ id: "st-exams", label: "Upcoming exams", value: String((await upcomingExams(ctx)).length), icon: "FileCheck" }),
      );
    }

    case "accountant": {
      const fees = await feesStats(ctx);
      return tiles(
        async () => fees.collected,
        async () => fees.pending,
        async () => fees.overdue,
        async () => fees.paymentsToday,
      );
    }

    case "librarian":
      return tiles(
        async () => ({ id: "st-loans", label: "Books on loan", value: String((await listLoans()).filter((l) => l.status !== "returned").length), icon: "BookOpen" }),
        async () => ({ id: "st-overdue", label: "Overdue loans", value: String((await listLoans()).filter((l) => l.status === "overdue").length), icon: "AlarmClock" }),
        async () => {
          const soon = addDays(new Date(), 3);
          const due = (await listLoans()).filter((l) => l.status === "issued" && new Date(l.dueDate) <= soon).length;
          return { id: "st-due", label: "Due in 3 days", value: String(due), icon: "CalendarCheck" };
        },
        async () => ({ id: "st-members", label: "Members", value: String((await listMembers()).length), icon: "Users" }),
      );

    case "receptionist":
      return tiles(
        async () => {
          const today = todayIso();
          const visits = (await listVisitorEntries()).filter((v) => v.checkInAt.slice(0, 10) === today);
          return { id: "st-visitors", label: "Visitors today", value: String(visits.length), icon: "IdCard" };
        },
        async () => ({ id: "st-onsite", label: "On site now", value: String((await listVisitorEntries("checked-in")).length), icon: "Users" }),
        async () => {
          const today = todayIso();
          const expected = (await listPreApprovedVisits("scheduled")).filter((v) => v.scheduledAt.slice(0, 10) === today).length;
          return { id: "st-expected", label: "Expected today", value: String(expected), icon: "CalendarCheck" };
        },
        async () => {
          const open = (await listTickets()).filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "reopened").length;
          return { id: "st-tickets", label: "Open tickets", value: String(open), icon: "LifeBuoy" };
        },
      );

    default: {
      // superAdmin, admin, principal and custom staff roles: the school at a glance.
      // Headcounts and attendance from AcademicService's summary, fees from FinanceService's - two requests in all.
      return tiles(
        async () => {
          const { activeStudents, admittedInRange } = await academicSummary(range);
          return {
            id: "st-students",
            label: "Total students",
            value: activeStudents.toLocaleString("en-IN"),
            delta: admittedInRange ? { value: `+${admittedInRange} admitted`, direction: "up" } : undefined,
            icon: "Users",
          };
        },
        async () => {
          const { activeStaff, staffOnLeaveToday } = await academicSummary(range);
          return {
            id: "st-staff",
            label: "Total staff",
            value: activeStaff.toLocaleString("en-IN"),
            delta: staffOnLeaveToday ? { value: `${staffOnLeaveToday} on leave today`, direction: "flat" } : undefined,
            icon: "Briefcase",
          };
        },
        () => schoolAttendanceStat(ctx),
        async () => (await feesStats(ctx)).collected,
      );
    }
  }
}

// ── Role widgets ────────────────────────────────────────────────────────

/** Below this, a section's attendance is flagged on the "Needs attention" widget. */
const LOW_ATTENDANCE_PERCENT = 75;

const attendanceTone = (pct: number | null): WidgetTone =>
  pct === null ? "muted" : pct >= 90 ? "success" : pct >= LOW_ATTENDANCE_PERCENT ? "warning" : "danger";

/** Highest first; sections not marked yet go last. */
const byValueDesc = (a: RankedItem, b: RankedItem) => (b.value ?? -1) - (a.value ?? -1) || a.label.localeCompare(b.label);

async function classAttendance(ctx: DashboardContext): Promise<RankedItem[]> {
  if (ctx.role === "teacher") {
    // The sections the teacher teaches (the whole school until they have a timetable).
    const [summaries, sections] = await Promise.all([getDailySectionSummaries(todayIso()), teacherSectionIds(ctx)]);
    return summaries
      .filter((s) => sections.size === 0 || sections.has(s.sectionId))
      .map((s) => {
        const pct = s.marked ? Math.round(((s.present + s.late + s.halfDay) / s.marked) * 100) : null;
        return { id: s.sectionId, label: `${s.className} ${s.sectionName}`.trim(), sublabel: `${s.marked}/${s.totalStudents} marked`, value: pct, display: pct === null ? "Not marked" : `${pct}%`, tone: attendanceTone(pct) };
      })
      .sort(byValueDesc);
  }
  return (await academicSummary(ctx.range)).sectionAttendance
    .map((s) => {
      const pct = s.percent === null ? null : Math.round(s.percent);
      return { id: s.sectionId, label: s.label, sublabel: `${s.marked}/${s.students} marked`, value: pct, display: pct === null ? "Not marked" : `${pct}%`, tone: attendanceTone(pct) };
    })
    .sort(byValueDesc);
}

async function topPerformers(ctx: DashboardContext): Promise<RankedItem[]> {
  return (await academicSummary(ctx.range)).topPerformers.map((t) => ({
    id: t.studentId,
    label: t.name,
    sublabel: `${t.classLabel} · ${t.results} result${t.results === 1 ? "" : "s"}`,
    value: t.averageScore,
    display: `${t.averageScore}%`,
    tone: t.averageScore >= 75 ? "success" : "brand",
  }));
}

const FEE_STATUS: Record<string, { label: string; tone: WidgetTone }> = {
  paid: { label: "Paid", tone: "success" },
  partial: { label: "Partly paid", tone: "info" },
  due: { label: "Due", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
};

async function feeStatus(ctx: DashboardContext): Promise<StatusSlice[]> {
  return (await feeSummary(ctx.range)).statusBreakdown
    .filter((b) => b.count > 0)
    .map((b) => ({
      id: b.status,
      label: FEE_STATUS[b.status]?.label ?? b.status,
      value: b.amount,
      detail: `${formatInrCompact(b.amount)} · ${b.count} invoice${b.count === 1 ? "" : "s"}`,
      tone: FEE_STATUS[b.status]?.tone ?? "muted",
    }));
}

async function feeDefaulters(ctx: DashboardContext): Promise<FeeDefaulter[]> {
  const { topDefaulters } = await feeSummary(ctx.range);
  if (topDefaulters.length === 0) return [];
  // Names come from the student list (shared with the other widgets); a student who has left shows as "Unknown".
  const students = new Map((await settle(listStudents()))?.map((st) => [st.id, st]) ?? []);
  return topDefaulters.map((d) => {
    const st = students.get(d.studentId);
    return {
      studentId: d.studentId,
      studentName: st ? `${st.firstName} ${st.lastName}`.trim() : "Unknown student",
      className: st ? [st.className, st.section].filter(Boolean).join(" ") : "—",
      outstanding: d.outstanding,
      invoices: d.invoices,
      oldestDueDate: d.oldestDueDate,
    };
  });
}

async function alerts(ctx: DashboardContext): Promise<AlertItem[]> {
  const [academic, fees] = await Promise.all([settle(academicSummary(ctx.range)), settle(feeSummary(ctx.range))]);
  if (!academic && !fees) throw new Error("Couldn't load the school's figures.");
  const items: AlertItem[] = [];
  if (fees && fees.overdueCount > 0) {
    items.push({
      id: "fees-overdue",
      severity: fees.overdueAmount >= 1_00_000 ? "critical" : "warning",
      title: `${formatInrCompact(fees.overdueAmount)} in overdue fees`,
      detail: `${fees.overdueCount} overdue invoice${fees.overdueCount === 1 ? "" : "s"} need follow-up.`,
      href: "/fees",
    });
  }
  if (academic) {
    const low = academic.sectionAttendance.filter((s) => s.percent !== null && s.percent < LOW_ATTENDANCE_PERCENT);
    for (const s of low.slice(0, 3)) {
      items.push({ id: `low-${s.sectionId}`, severity: "warning", title: `Low attendance in ${s.label}`, detail: `${Math.round(s.percent!)}% present today.`, href: "/attendance" });
    }
    const unmarked = academic.sectionAttendance.filter((s) => s.marked === 0).length;
    if (unmarked > 0) {
      items.push({
        id: "unmarked",
        severity: "info",
        title: `${unmarked} section${unmarked === 1 ? " hasn't" : "s haven't"} marked attendance`,
        detail: "Today's register is still open.",
        href: "/attendance",
      });
    }
    if (academic.staffOnLeaveToday > 0) {
      items.push({
        id: "staff-leave",
        severity: "info",
        title: `${academic.staffOnLeaveToday} staff on leave today`,
        detail: "Check cover for their classes.",
        href: "/staff",
      });
    }
  }
  const order = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}

async function learnerAttendance(ctx: DashboardContext): Promise<LearnerAttendance[]> {
  const learners = ctx.identity.learners;
  if (learners.length === 0) return [];
  const from = toIsoDate(addDays(startOfToday(), -29));
  const records = await listAttendanceRecords({ dateFrom: from, dateTo: todayIso() });
  return learners.map((l) => {
    const mine = records.filter((r) => r.studentId === l.studentId);
    const count = (status: string) => mine.filter((r) => r.status === status).length;
    const present = count("present") + count("half-day");
    const late = count("late");
    return {
      studentId: l.studentId,
      name: l.name,
      classLabel: l.classLabel,
      present,
      late,
      absent: count("absent"),
      leave: count("leave"),
      marked: mine.length,
      percent: percent(present + late, mine.length),
    };
  });
}

async function schools(): Promise<SchoolsOverview> {
  const tenants = await listTenants();
  const rows = tenants.map((t) => ({
    id: t.id,
    name: t.schoolName,
    status: t.status,
    plan: t.plan.name,
    students: t.studentCount,
    staff: t.staffCount,
    capacityPercent: t.plan.maxStudents > 0 ? Math.round((t.studentCount / t.plan.maxStudents) * 100) : null,
  }));
  return {
    totals: {
      schools: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      trial: rows.filter((r) => r.status === "trial").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
      students: rows.reduce((n, r) => n + r.students, 0),
      staff: rows.reduce((n, r) => n + r.staff, 0),
    },
    rows: rows.sort((a, b) => b.students - a.students),
  };
}

export const liveSource: DashboardSourceImpl = {
  identity: loadIdentity,
  scope: fetchScopeSummary,
  widgets: {
    stats,
    attendance,
    todayClasses,
    upcomingExams,
    pendingAssignments,
    feesDue,
    libraryDue,
    busStatus,
    hostelOccupancy,
    notifications,
    birthdays,
    holidays,
    calendarEvents,
    recentActivity,
    performanceTrend,
    revenueTrend,
    alerts,
    classAttendance,
    topPerformers,
    feeStatus,
    feeDefaulters,
    learnerAttendance,
    schools,
  },
};

/** Exported for tests. */
export const __test = { nextBirthday, delta, previousRange, formatInrCompact, DAY_MS, clearShared: () => sharedCache.clear() };
