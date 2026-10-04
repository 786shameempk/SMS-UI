import type { UserRole } from "@/types/auth";
import { mockDelay } from "@/utils/mockDelay";
import { monthsInRange, toIsoDate } from "../dateRange";
import type {
  ActivityItem,
  AlertItem,
  FeeDefaulter,
  LearnerAttendance,
  RankedItem,
  SchoolsOverview,
  StatusSlice,
  AttendanceSummary,
  BirthdayItem,
  BusStatusSummary,
  CalendarEvent,
  ClassSession,
  DashboardScopeView,
  FeeDueSummary,
  HolidayItem,
  HostelOccupancySummary,
  LibraryDueItem,
  NotificationItem,
  PendingAssignment,
  PerformanceTrendPoint,
  RevenueTrendPoint,
  ScopeSummary,
  StatCardData,
  UpcomingExam,
} from "../types";
import { isPersonal, type DashboardContext, type DashboardIdentity, type DashboardSourceImpl } from "./types";

/**
 * Demo data: realistic, role-aware sample figures for every widget, shaped exactly like the live source so the
 * page can't tell them apart. Values are deterministic (a month keeps its number when the range changes) and
 * dates are relative to today, so demos always look current. Never mixed with live data - the page uses one
 * source for everything.
 */

const DAY_MS = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString();
const day = (offsetDays: number) => toIsoDate(new Date(Date.now() + offsetDays * DAY_MS));

/** Stable pseudo-random 0..1 per key, so values don't jump between renders. */
function wobble(key: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

const delay = <T,>(data: T) => mockDelay(data, 250 + Math.round(Math.random() * 350));

const DEMO_IDENTITY: DashboardIdentity = {
  staffId: "demo-staff",
  learners: [{ studentId: "demo-student", name: "Riya Kapoor", sectionId: "demo-8a", classId: "demo-8", classLabel: "Grade 8 - A" }],
};

/** The demo parent has two children, so the child switcher has something to switch. */
const DEMO_FAMILY: DashboardIdentity = {
  staffId: null,
  learners: [
    ...DEMO_IDENTITY.learners,
    { studentId: "demo-sibling", name: "Kabir Kapoor", sectionId: "demo-5b", classId: "demo-5", classLabel: "Grade 5 - B" },
  ],
};

// ── Widgets ─────────────────────────────────────────────────────────────

function stats(ctx: DashboardContext): StatCardData[] {
  switch (ctx.role) {
    case "parent":
    case "student":
      return [
        { id: "st-attendance", label: "Attendance (30 days)", value: "96%", icon: "CalendarCheck" },
        { id: "st-fees", label: "Fees pending", value: "₹15,000", delta: { value: "₹5,000 overdue", direction: "down" }, icon: "Wallet" },
        { id: "st-assignments", label: "Homework due", value: "2", icon: "ClipboardList" },
        { id: "st-exams", label: "Upcoming exams", value: "3", icon: "FileCheck" },
      ];
    case "teacher":
      return [
        { id: "st-classes", label: "Classes today", value: "5", icon: "Presentation" },
        { id: "st-attendance", label: "Attendance today", value: "91%", delta: { value: "+2 pts", direction: "up" }, icon: "CalendarCheck" },
        { id: "st-assignments", label: "Submissions to grade", value: "18", icon: "ClipboardList" },
        { id: "st-exams", label: "Upcoming exams", value: "4", icon: "FileCheck" },
      ];
    case "accountant":
      return [
        { id: "st-fees", label: "Fees collected", value: "₹48.1L", delta: { value: "+6.3%", direction: "up" }, icon: "Wallet" },
        { id: "st-pending", label: "Fees pending", value: "₹12.4L", icon: "Receipt" },
        { id: "st-overdue", label: "Overdue invoices", value: "37", delta: { value: "₹3.2L", direction: "flat" }, icon: "AlarmClock" },
        { id: "st-receipts", label: "Payments today", value: "22", icon: "Receipt" },
      ];
    case "librarian":
      return [
        { id: "st-loans", label: "Books on loan", value: "412", icon: "BookOpen" },
        { id: "st-overdue", label: "Overdue loans", value: "19", icon: "AlarmClock" },
        { id: "st-due", label: "Due in 3 days", value: "34", icon: "CalendarCheck" },
        { id: "st-members", label: "Members", value: "1,986", icon: "Users" },
      ];
    case "receptionist":
      return [
        { id: "st-visitors", label: "Visitors today", value: "27", icon: "IdCard" },
        { id: "st-onsite", label: "On site now", value: "6", icon: "Users" },
        { id: "st-expected", label: "Expected today", value: "4", icon: "CalendarCheck" },
        { id: "st-tickets", label: "Open tickets", value: "9", icon: "LifeBuoy" },
      ];
    default:
      return [
        { id: "st-students", label: "Total students", value: "2,384", delta: { value: "+18 admitted", direction: "up" }, icon: "Users" },
        { id: "st-staff", label: "Total staff", value: "162", icon: "Briefcase" },
        { id: "st-attendance", label: "Attendance today", value: "92%", delta: { value: "-1.4 pts", direction: "down" }, icon: "CalendarCheck" },
        { id: "st-fees", label: "Fees collected", value: "₹48.1L", delta: { value: "+6.3%", direction: "up" }, icon: "Wallet" },
      ];
  }
}

function attendance(ctx: DashboardContext): AttendanceSummary {
  if (isPersonal(ctx.role)) return { present: 1, absent: 0, late: 0, onLeave: 0, totalMarked: 1 };
  if (ctx.role === "teacher") return { present: 132, absent: 7, late: 4, onLeave: 2, totalMarked: 145 };
  return { present: 2148, absent: 112, late: 64, onLeave: 35, totalMarked: 2359 };
}

const SESSIONS: ClassSession[] = [
  { id: "cs-1", subject: "Mathematics", className: "Grade 8 - A", room: "204", startTime: "08:00", endTime: "08:40" },
  { id: "cs-2", subject: "Physics", className: "Grade 10 - B", room: "Lab 2", startTime: "08:40", endTime: "09:20" },
  { id: "cs-3", subject: "English", className: "Grade 8 - A", room: "204", startTime: "10:20", endTime: "11:00" },
  { id: "cs-4", subject: "Computer Science", className: "Grade 11 - C", room: "Lab 1", startTime: "11:40", endTime: "12:20" },
  { id: "cs-5", subject: "Mathematics", className: "Grade 9 - B", room: "112", startTime: "13:00", endTime: "13:40" },
];

function todayClasses(ctx: DashboardContext): ClassSession[] {
  if (ctx.role === "teacher") return SESSIONS;
  if (isPersonal(ctx.role)) return SESSIONS.filter((s) => s.className === "Grade 8 - A").concat({ ...SESSIONS[4], id: "cs-6", subject: "Science", className: "Grade 8 - A", room: "Lab 3" });
  return [];
}

function upcomingExams(ctx: DashboardContext): UpcomingExam[] {
  const all: UpcomingExam[] = [
    { id: "ex-1", subject: "Mathematics", className: "Grade 8", date: day(3), durationMinutes: 120 },
    { id: "ex-2", subject: "Science", className: "Grade 8", date: day(5), durationMinutes: 120 },
    { id: "ex-3", subject: "Physics", className: "Grade 10", date: day(6), durationMinutes: 180 },
    { id: "ex-4", subject: "English", className: "Grade 8", date: day(8), durationMinutes: 90 },
    { id: "ex-5", subject: "History", className: "Grade 9", date: day(10), durationMinutes: 90 },
  ];
  return isPersonal(ctx.role) ? all.filter((e) => e.className === "Grade 8") : all;
}

function pendingAssignments(ctx: DashboardContext): PendingAssignment[] {
  if (isPersonal(ctx.role)) {
    return [
      { id: "hw-1", title: "Algebra: linear equations", subject: "Mathematics", className: "Grade 8 - A", dueDate: day(1) },
      { id: "hw-2", title: "Photosynthesis diagram", subject: "Science", className: "Grade 8 - A", dueDate: day(3) },
    ];
  }
  return [
    { id: "hw-1", title: "Algebra: linear equations", subject: "Mathematics", className: "Grade 8", dueDate: day(1), submittedCount: 28, totalCount: 36 },
    { id: "hw-2", title: "Lab report — refraction", subject: "Physics", className: "Grade 10", dueDate: day(2), submittedCount: 19, totalCount: 32 },
    { id: "hw-3", title: "Essay: My favourite book", subject: "English", className: "Grade 8", dueDate: day(4), submittedCount: 9, totalCount: 36 },
  ];
}

function feesDue(ctx: DashboardContext): FeeDueSummary {
  if (isPersonal(ctx.role)) {
    return {
      totalPending: 15000,
      totalOverdue: 5000,
      currency: "INR",
      items: [
        { id: "inv-1", studentName: "Riya Kapoor", term: "Term 1 - transport", amount: 5000, dueDate: day(-6), status: "overdue" },
        { id: "inv-2", studentName: "Riya Kapoor", term: "Term 2 - tuition", amount: 10000, dueDate: day(9), status: "due" },
      ],
    };
  }
  return {
    totalPending: 1240000,
    totalOverdue: 320000,
    currency: "INR",
    items: [
      { id: "inv-1", studentName: "Aarav Mehta", term: "Term 1", amount: 18000, dueDate: day(-12), status: "overdue" },
      { id: "inv-2", studentName: "Sara Thomas", term: "Term 1", amount: 12500, dueDate: day(-5), status: "overdue" },
      { id: "inv-3", studentName: "Kabir Singh", term: "Term 2", amount: 9000, dueDate: day(3), status: "partial" },
      { id: "inv-4", studentName: "Meera Iyer", term: "Term 2", amount: 22000, dueDate: day(6), status: "due" },
    ],
  };
}

function libraryDue(ctx: DashboardContext): LibraryDueItem[] {
  const all: LibraryDueItem[] = [
    { id: "ln-1", bookTitle: "Wings of Fire", borrowerName: "Riya Kapoor", dueDate: day(-2), overdue: true },
    { id: "ln-2", bookTitle: "The Guide", borrowerName: "Aarav Mehta", dueDate: day(1), overdue: false },
    { id: "ln-3", bookTitle: "Malgudi Days", borrowerName: "Ms. Nair", dueDate: day(2), overdue: false },
  ];
  return isPersonal(ctx.role) ? all.filter((l) => l.borrowerName === "Riya Kapoor") : all;
}

function busStatus(ctx: DashboardContext): BusStatusSummary {
  if (isPersonal(ctx.role)) return { fleet: [], mine: { routeName: "Route 4 - Kakkanad", busRegNumber: "KL-07-CD-4521", status: "on-route", currentStopName: "Infopark Gate" } };
  return {
    fleet: [
      { status: "on-route", count: 9 },
      { status: "at-stop", count: 3 },
      { status: "idle", count: 4 },
      { status: "completed", count: 2 },
    ],
    mine: null,
  };
}

function hostelOccupancy(ctx: DashboardContext): HostelOccupancySummary {
  if (isPersonal(ctx.role)) return { hostels: [], mine: { hostelName: "Ganga Girls Hostel", roomNumber: "B-204", bedNumber: 2 } };
  return {
    hostels: [
      { hostelName: "Ganga Girls Hostel", occupiedCount: 182, bedCount: 200 },
      { hostelName: "Yamuna Boys Hostel", occupiedCount: 151, bedCount: 180 },
      { hostelName: "Junior Block", occupiedCount: 48, bedCount: 80 },
    ],
    mine: null,
  };
}

function notifications(): NotificationItem[] {
  return [
    { id: "nt-1", title: "Fee reminder", body: "Term 2 fees are due in 9 days.", createdAt: iso(0), read: false, category: "finance" },
    { id: "nt-2", title: "Parent-teacher meeting", body: "PTM for Grades 6–10 on Saturday at 10 am.", createdAt: iso(-1), read: false, category: "event" },
    { id: "nt-3", title: "Report cards published", body: "Mid-term report cards are now available.", createdAt: iso(-2), read: true, category: "academic" },
    { id: "nt-4", title: "Scheduled maintenance", body: "The portal will be briefly unavailable on Sunday 2 am.", createdAt: iso(-3), read: true, category: "system" },
  ];
}

function birthdays(): BirthdayItem[] {
  return [
    { id: "bd-1", name: "Riya Kapoor", role: "student", date: iso(0), avatarInitials: "RK" },
    { id: "bd-2", name: "Mohammed Iqbal", role: "staff", date: iso(1), avatarInitials: "MI" },
    { id: "bd-3", name: "Sara Thomas", role: "student", date: iso(3), avatarInitials: "ST" },
    { id: "bd-4", name: "Anita George", role: "staff", date: iso(6), avatarInitials: "AG" },
  ];
}

function holidays(): HolidayItem[] {
  return [
    { id: "hl-1", name: "Diwali", date: day(12), type: "public" },
    { id: "hl-2", name: "Founder's Day", date: day(22), type: "school" },
    { id: "hl-3", name: "Winter break begins", date: day(48), type: "school" },
  ];
}

function calendarEvents(): CalendarEvent[] {
  return [
    { date: day(-1), kind: "event", label: "Parent-teacher meeting" },
    { date: day(3), kind: "exam", label: "Mathematics exam" },
    { date: day(5), kind: "exam", label: "Science exam" },
    { date: day(8), kind: "event", label: "Sports day" },
    { date: day(12), kind: "holiday", label: "Diwali" },
    { date: day(22), kind: "holiday", label: "Founder's Day" },
  ];
}

function recentActivity(): ActivityItem[] {
  return [
    { id: "ac-1", actor: "Ava Whitfield", action: "Enrolled a student", target: "Grade 8 - A", createdAt: iso(0) },
    { id: "ac-2", actor: "Daniel Reyes", action: "Published marks", target: "Mid-term · Grade 10 - B", createdAt: iso(-0.2) },
    { id: "ac-3", actor: "Finance office", action: "Recorded a payment", target: "Invoice INV-2041", createdAt: iso(-1) },
    { id: "ac-4", actor: "Ava Whitfield", action: "Updated role permissions", target: "Teacher", createdAt: iso(-1.5) },
    { id: "ac-5", actor: "System", action: "Published exam schedule", target: "Grade 10", createdAt: iso(-2) },
  ];
}

function performanceTrend(ctx: DashboardContext): PerformanceTrendPoint[] {
  return monthsInRange(ctx.range).map((m, i) => ({
    month: m.label,
    averageScore: Math.round(70 + i * 0.8 + wobble(m.key, 7) * 5),
    passRate: Math.min(99, Math.round(86 + i * 0.6 + wobble(m.key, 13) * 4)),
  }));
}

function revenueTrend(ctx: DashboardContext): RevenueTrendPoint[] {
  return monthsInRange(ctx.range).map((m) => {
    const expected = 450000 + Math.round(wobble(m.key, 3) * 4) * 10000;
    return { month: m.label, expected, collected: Math.round(expected * (0.86 + wobble(m.key, 5) * 0.12)) };
  });
}

// ── Role widgets ────────────────────────────────────────────────────────

function alerts(): AlertItem[] {
  return [
    { id: "fees-overdue", severity: "critical", title: "₹3.4L in overdue fees", detail: "27 overdue invoices need follow-up.", href: "/fees" },
    { id: "low-7c", severity: "warning", title: "Low attendance in Grade 7 - C", detail: "68% present today.", href: "/attendance" },
    { id: "unmarked", severity: "info", title: "2 sections haven't marked attendance", detail: "Today's register is still open.", href: "/attendance" },
    { id: "staff-leave", severity: "info", title: "4 staff on leave today", detail: "Check cover for their classes.", href: "/staff" },
  ];
}

const SECTIONS = ["Grade 5 - A", "Grade 5 - B", "Grade 6 - A", "Grade 7 - C", "Grade 8 - A", "Grade 9 - B", "Grade 10 - A"];

function classAttendance(ctx: DashboardContext): RankedItem[] {
  const sections = ctx.role === "teacher" ? SECTIONS.slice(3, 6) : SECTIONS;
  return sections
    .map((label, i) => {
      const pct = i === sections.length - 1 && ctx.role !== "teacher" ? null : Math.round(66 + wobble(label, 7) * 32);
      return {
        id: `demo-${label}`,
        label,
        sublabel: pct === null ? "0/38 marked" : `${36 + i}/${38 + i} marked`,
        value: pct,
        display: pct === null ? "Not marked" : `${pct}%`,
        tone: pct === null ? "muted" : pct >= 90 ? "success" : pct >= 75 ? "warning" : "danger",
      } satisfies RankedItem;
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
}

function topPerformers(): RankedItem[] {
  return [
    ["Ananya Iyer", "Grade 10 - A", 96],
    ["Rohan Mehta", "Grade 9 - B", 94],
    ["Riya Kapoor", "Grade 8 - A", 92],
    ["Farhan Sheikh", "Grade 10 - A", 90],
    ["Meera Pillai", "Grade 7 - C", 89],
  ].map(([name, cls, score], i) => ({
    id: `demo-top-${i}`,
    label: name as string,
    sublabel: `${cls} · ${6 - (i % 3)} results`,
    value: score as number,
    display: `${score}%`,
    tone: "success" as const,
  }));
}

function feeStatus(): StatusSlice[] {
  return [
    { id: "paid", label: "Paid", value: 4810000, detail: "₹48.1L · 1,642 invoices", tone: "success" },
    { id: "partial", label: "Partly paid", value: 380000, detail: "₹3.8L · 96 invoices", tone: "info" },
    { id: "due", label: "Due", value: 860000, detail: "₹8.6L · 214 invoices", tone: "warning" },
    { id: "overdue", label: "Overdue", value: 340000, detail: "₹3.4L · 27 invoices", tone: "danger" },
  ];
}

function feeDefaulters(): FeeDefaulter[] {
  return [
    ["Aarav Nair", "Grade 9 - B", 48500, 3, -74],
    ["Ishita Rao", "Grade 6 - A", 36200, 2, -61],
    ["Vikram Das", "Grade 10 - A", 28750, 2, -45],
    ["Sana Khan", "Grade 7 - C", 18900, 1, -33],
    ["Dev Malhotra", "Grade 5 - B", 12400, 1, -18],
  ].map(([name, cls, amount, invoices, offset], i) => ({
    studentId: `demo-def-${i}`,
    studentName: name as string,
    className: cls as string,
    outstanding: amount as number,
    invoices: invoices as number,
    oldestDueDate: day(offset as number),
  }));
}

function learnerAttendance(ctx: DashboardContext): LearnerAttendance[] {
  return ctx.identity.learners.map((l) => {
    const absent = Math.round(wobble(l.studentId, 3) * 3);
    const late = Math.round(wobble(l.studentId, 5) * 2);
    const leave = l.studentId === "demo-sibling" ? 1 : 0;
    const marked = 22;
    const present = marked - absent - late - leave;
    return { studentId: l.studentId, name: l.name, classLabel: l.classLabel, present, late, absent, leave, marked, percent: Math.round(((present + late) / marked) * 100) };
  });
}

function schools(): SchoolsOverview {
  const rows = [
    { id: "demo-t1", name: "Greenfield Public School", status: "active", plan: "Enterprise", students: 2384, staff: 162, capacityPercent: 79 },
    { id: "demo-t2", name: "Riverside International", status: "active", plan: "Professional", students: 1260, staff: 88, capacityPercent: 84 },
    { id: "demo-t3", name: "Sunrise Academy", status: "trial", plan: "Starter", students: 310, staff: 24, capacityPercent: 62 },
    { id: "demo-t4", name: "Hilltop Convent", status: "suspended", plan: "Starter", students: 420, staff: 31, capacityPercent: 84 },
  ] satisfies SchoolsOverview["rows"];
  return {
    totals: {
      schools: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      trial: rows.filter((r) => r.status === "trial").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
      students: rows.reduce((n, r) => n + r.students, 0),
      staff: rows.reduce((n, r) => n + r.staff, 0),
    },
    rows,
  };
}

function scope(view: DashboardScopeView): ScopeSummary {
  const branches = [
    { id: "demo-main", name: "Main Campus", students: 1426, staff: 98, collected: 2890000, pending: 740000, overdue: 21 },
    { id: "demo-north", name: "North Campus", students: 958, staff: 64, collected: 1920000, pending: 500000, overdue: 16 },
  ];
  const picked = view === "aggregated" ? branches : branches.slice(0, 1);
  return {
    view,
    branches: picked.map((b) => ({ id: b.id, name: b.name })),
    metrics: {
      students: picked.reduce((n, b) => n + b.students, 0),
      staff: picked.reduce((n, b) => n + b.staff, 0),
      feesCollected: picked.reduce((n, b) => n + b.collected, 0),
      feesPending: picked.reduce((n, b) => n + b.pending, 0),
      overdueInvoices: picked.reduce((n, b) => n + b.overdue, 0),
      failed: false,
    },
  };
}

export const mockSource: DashboardSourceImpl = {
  identity: (role: UserRole) => delay(role === "parent" ? DEMO_FAMILY : DEMO_IDENTITY),
  scope: (view) => delay(scope(view)),
  widgets: {
    stats: (ctx) => delay(stats(ctx)),
    attendance: (ctx) => delay(attendance(ctx)),
    todayClasses: (ctx) => delay(todayClasses(ctx)),
    upcomingExams: (ctx) => delay(upcomingExams(ctx)),
    pendingAssignments: (ctx) => delay(pendingAssignments(ctx)),
    feesDue: (ctx) => delay(feesDue(ctx)),
    libraryDue: (ctx) => delay(libraryDue(ctx)),
    busStatus: (ctx) => delay(busStatus(ctx)),
    hostelOccupancy: (ctx) => delay(hostelOccupancy(ctx)),
    notifications: () => delay(notifications()),
    birthdays: () => delay(birthdays()),
    holidays: () => delay(holidays()),
    calendarEvents: () => delay(calendarEvents()),
    recentActivity: () => delay(recentActivity()),
    performanceTrend: (ctx) => delay(performanceTrend(ctx)),
    revenueTrend: (ctx) => delay(revenueTrend(ctx)),
    alerts: () => delay(alerts()),
    classAttendance: (ctx) => delay(classAttendance(ctx)),
    topPerformers: () => delay(topPerformers()),
    feeStatus: () => delay(feeStatus()),
    feeDefaulters: () => delay(feeDefaulters()),
    learnerAttendance: (ctx) => delay(learnerAttendance(ctx)),
    schools: () => delay(schools()),
  },
};
