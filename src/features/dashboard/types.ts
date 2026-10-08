import type { BusTrackingStatus } from "@/features/transport/types";
import type { FeeInvoiceStatus } from "@/features/fees/types";

export interface StatCardData {
  id: string;
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon: string;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  totalMarked: number;
}

export interface FeeDueItem {
  id: string;
  studentName: string;
  term: string;
  amount: number;
  dueDate: string;
  status: FeeInvoiceStatus;
}

export interface FeeDueSummary {
  totalPending: number;
  totalOverdue: number;
  currency: string;
  items: FeeDueItem[];
}

export interface LibraryDueItem {
  id: string;
  bookTitle: string;
  borrowerName: string;
  dueDate: string;
  overdue: boolean;
}

export interface BusFleetStatusCount {
  status: BusTrackingStatus;
  count: number;
}

export interface MyBusStatus {
  routeName: string;
  busRegNumber: string;
  status: BusTrackingStatus;
  currentStopName?: string;
}

export interface BusStatusSummary {
  fleet: BusFleetStatusCount[];
  mine: MyBusStatus | null;
}

export interface HostelOccupancyItem {
  hostelName: string;
  occupiedCount: number;
  bedCount: number;
}

export interface MyHostelAllocation {
  hostelName: string;
  roomNumber: string;
  bedNumber: number;
}

export interface HostelOccupancySummary {
  hostels: HostelOccupancyItem[];
  mine: MyHostelAllocation | null;
}

export interface ClassSession {
  id: string;
  subject: string;
  className: string;
  room: string;
  startTime: string;
  endTime: string;
}

export interface UpcomingExam {
  id: string;
  subject: string;
  className: string;
  date: string;
  durationMinutes: number;
}

export interface PendingAssignment {
  id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  submittedCount?: number;
  totalCount?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  category: "academic" | "finance" | "event" | "system";
}

export interface BirthdayItem {
  id: string;
  name: string;
  role: "student" | "staff";
  date: string;
  avatarInitials: string;
}

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
  type: "public" | "school";
}

export interface CalendarEvent {
  date: string;
  kind: "holiday" | "exam" | "event";
  label: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface PerformanceTrendPoint {
  month: string;
  /** Null when no results were entered that month: the chart leaves a gap rather than plotting 0%. */
  averageScore: number | null;
  passRate: number | null;
}

export interface RevenueTrendPoint {
  month: string;
  collected: number;
  expected: number;
}

// ── Generic shapes the reusable widget types draw ───────────────────────

export type WidgetTone = "brand" | "success" | "info" | "warning" | "danger" | "muted";

/** One slice of a doughnut / status summary. */
export interface StatusSlice {
  id: string;
  label: string;
  /** What the slice size represents (an amount or a count). */
  value: number;
  /** Shown next to the label, e.g. "₹1.2L · 14 invoices". */
  detail: string;
  tone: WidgetTone;
}

/** One row of a ranking: a label, a 0-100 bar and the value to print. */
export interface RankedItem {
  id: string;
  label: string;
  sublabel?: string;
  /** 0-100 for the bar; null = nothing to measure yet (e.g. attendance not marked). */
  value: number | null;
  display: string;
  tone?: WidgetTone;
}

export interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  /** Where to go to deal with it. */
  href?: string;
}

// ── Role widgets ────────────────────────────────────────────────────────

export interface FeeDefaulter {
  studentId: string;
  studentName: string;
  className: string;
  outstanding: number;
  invoices: number;
  oldestDueDate: string;
}

/** One learner's attendance over the last 30 days (parents see each child). */
export interface LearnerAttendance {
  studentId: string;
  name: string;
  classLabel: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  marked: number;
  percent: number | null;
}

export interface SchoolRow {
  id: string;
  name: string;
  status: "trial" | "active" | "suspended" | "cancelled";
  plan: string;
  students: number;
  staff: number;
  /** Students as a share of the plan's limit; null when the plan is unlimited. */
  capacityPercent: number | null;
}

export interface SchoolsOverview {
  totals: { schools: number; active: number; trial: number; suspended: number; students: number; staff: number };
  rows: SchoolRow[];
}

export interface DashboardData {
  stats: StatCardData[];
  attendance: AttendanceSummary;
  todayClasses: ClassSession[];
  upcomingExams: UpcomingExam[];
  pendingAssignments: PendingAssignment[];
  feesDue: FeeDueSummary;
  libraryDue: LibraryDueItem[];
  busStatus: BusStatusSummary;
  hostelOccupancy: HostelOccupancySummary;
  notifications: NotificationItem[];
  birthdays: BirthdayItem[];
  holidays: HolidayItem[];
  calendarEvents: CalendarEvent[];
  recentActivity: ActivityItem[];
  performanceTrend: PerformanceTrendPoint[];
  revenueTrend: RevenueTrendPoint[];
  alerts: AlertItem[];
  classAttendance: RankedItem[];
  topPerformers: RankedItem[];
  feeStatus: StatusSlice[];
  feeDefaulters: FeeDefaulter[];
  learnerAttendance: LearnerAttendance[];
  schools: SchoolsOverview;
}

// ── Dashboard controls ──────────────────────────────────────────────────

/** Aggregated = every branch of the active school added together; segregated = only the branch
 *  currently picked in the header's branch switcher. Same meaning for Admin and Super Admin. */
export type DashboardScopeView = "aggregated" | "segregated";

export type DateRangePreset = "thisYear" | "last3Months" | "last6Months" | "custom";

export interface DashboardDateRange {
  preset: DateRangePreset;
  /** yyyy-mm-dd, only meaningful for "custom". */
  from?: string;
  to?: string;
}

export interface ScopeMetrics {
  students: number;
  staff: number;
  feesCollected: number;
  feesPending: number;
  overdueInvoices: number;
  /** True when at least one request failed, so the numbers are incomplete. */
  failed: boolean;
}

export interface ScopeSummary {
  view: DashboardScopeView;
  /** The branches that were summed — every active branch, or just the selected one. */
  branches: Array<{ id: string; name: string }>;
  metrics: ScopeMetrics;
}
