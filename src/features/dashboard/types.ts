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

export interface FeeSummary {
  collected: number;
  pending: number;
  overdue: number;
  currency: string;
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
  fees: FeeSummary;
  todayClasses: ClassSession[];
  upcomingExams: UpcomingExam[];
  pendingAssignments: PendingAssignment[];
  notifications: NotificationItem[];
  birthdays: BirthdayItem[];
  holidays: HolidayItem[];
  calendarEvents: CalendarEvent[];
  recentActivity: ActivityItem[];
  performanceTrend: PerformanceTrendPoint[];
  revenueTrend: RevenueTrendPoint[];
}
