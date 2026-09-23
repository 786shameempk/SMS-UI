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
  averageScore: number;
  passRate: number;
}

export interface RevenueTrendPoint {
  month: string;
  collected: number;
  expected: number;
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
