import type { UserRole } from "@/types/auth";
import type {
  ActivityItem,
  AttendanceSummary,
  BirthdayItem,
  CalendarEvent,
  ClassSession,
  HolidayItem,
  NotificationItem,
  PerformanceTrendPoint,
  RevenueTrendPoint,
  StatCardData,
} from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString();

const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

function buildPerformanceTrend(): PerformanceTrendPoint[] {
  const base = [72, 74, 73, 77, 79, 81];
  const pass = [88, 89, 87, 91, 92, 94];
  return MONTHS.map((month, i) => ({ month, averageScore: base[i], passRate: pass[i] }));
}

function buildRevenueTrend(): RevenueTrendPoint[] {
  const collected = [412000, 438000, 401000, 452000, 467000, 481000];
  const expected = [450000, 450000, 460000, 460000, 470000, 490000];
  return MONTHS.map((month, i) => ({ month, collected: collected[i], expected: expected[i] }));
}

function buildAttendance(role: UserRole): AttendanceSummary {
  if (role === "parent") return { present: 1, absent: 0, late: 0, onLeave: 0, totalMarked: 1 };
  if (role === "teacher") return { present: 27, absent: 2, late: 1, onLeave: 0, totalMarked: 30 };
  return { present: 1148, absent: 62, late: 24, onLeave: 15, totalMarked: 1249 };
}

function buildTodayClasses(role: UserRole): ClassSession[] {
  const all: ClassSession[] = [
    { id: "cs-1", subject: "Mathematics", className: "Grade 8 - A", room: "Room 204", startTime: "09:00", endTime: "09:45" },
    { id: "cs-2", subject: "Physics", className: "Grade 10 - B", room: "Lab 2", startTime: "10:00", endTime: "10:45" },
    { id: "cs-3", subject: "English", className: "Grade 8 - A", room: "Room 204", startTime: "11:15", endTime: "12:00" },
    { id: "cs-4", subject: "Computer Science", className: "Grade 11 - C", room: "Lab 1", startTime: "13:30", endTime: "14:15" },
  ];
  if (role === "parent") return all.slice(0, 2);
  return all;
}

function buildNotifications(): NotificationItem[] {
  return [
    { id: "nt-1", title: "Fee reminder", body: "Term 2 fee due in 5 days.", createdAt: iso(0), read: false, category: "finance" },
    { id: "nt-2", title: "PTM scheduled", body: "Parent-teacher meeting on Aug 12.", createdAt: iso(-1), read: false, category: "event" },
    { id: "nt-3", title: "Report card published", body: "Mid-term report cards are now available.", createdAt: iso(-2), read: true, category: "academic" },
    { id: "nt-4", title: "System maintenance", body: "Portal will be briefly unavailable Sunday 2 AM.", createdAt: iso(-3), read: true, category: "system" },
  ];
}

function buildBirthdays(): BirthdayItem[] {
  return [
    { id: "bd-1", name: "Riya Kapoor", role: "student", date: iso(0), avatarInitials: "RK" },
    { id: "bd-2", name: "Mohammed Iqbal", role: "staff", date: iso(1), avatarInitials: "MI" },
    { id: "bd-3", name: "Sara Thomas", role: "student", date: iso(3), avatarInitials: "ST" },
  ];
}

function buildHolidays(): HolidayItem[] {
  return [
    { id: "hl-1", name: "Independence Day", date: iso(14), type: "public" },
    { id: "hl-2", name: "Founder's Day", date: iso(22), type: "school" },
    { id: "hl-3", name: "Autumn Break", date: iso(35), type: "school" },
  ];
}

function buildCalendarEvents(): CalendarEvent[] {
  return [
    { date: iso(3), kind: "exam", label: "Mathematics exam" },
    { date: iso(6), kind: "exam", label: "Science exam" },
    { date: iso(14), kind: "holiday", label: "Independence Day" },
    { date: iso(22), kind: "holiday", label: "Founder's Day" },
    { date: iso(-1), kind: "event", label: "PTM scheduled" },
  ];
}

function buildRecentActivity(role: UserRole): ActivityItem[] {
  const base: ActivityItem[] = [
    { id: "ac-1", actor: "Ava Whitfield", action: "enrolled a new student into", target: "Grade 8 - A", createdAt: iso(0) },
    { id: "ac-2", actor: "Daniel Reyes", action: "graded assignments for", target: "Lab report — refraction", createdAt: iso(-1) },
    { id: "ac-3", actor: "Finance office", action: "recorded a fee payment from", target: "Priya Nair", createdAt: iso(-1) },
    { id: "ac-4", actor: "System", action: "published exam schedule for", target: "Grade 10 - B", createdAt: iso(-2) },
  ];
  if (role === "parent") return base.filter((a) => a.target === "Priya Nair" || a.actor === "System");
  return base;
}

function buildStats(role: UserRole): StatCardData[] {
  if (role === "parent") {
    return [
      { id: "st-attendance", label: "Attendance (this month)", value: "96%", delta: { value: "+1.2%", direction: "up" }, icon: "CalendarCheck" },
      { id: "st-fees", label: "Fees pending", value: "₹15,000", delta: { value: "due in 5 days", direction: "flat" }, icon: "Wallet" },
      { id: "st-assignments", label: "Assignments due", value: "1", icon: "ClipboardList" },
      { id: "st-exams", label: "Upcoming exams", value: "2", icon: "FileCheck" },
    ];
  }
  if (role === "teacher") {
    return [
      { id: "st-students", label: "My students", value: "148", icon: "Users" },
      { id: "st-attendance", label: "Today's attendance", value: "90%", delta: { value: "+2%", direction: "up" }, icon: "CalendarCheck" },
      { id: "st-assignments", label: "Assignments to grade", value: "3", icon: "ClipboardList" },
      { id: "st-classes", label: "Classes today", value: "4", icon: "Presentation" },
    ];
  }
  return [
    { id: "st-students", label: "Total students", value: "2,384", delta: { value: "+18 this month", direction: "up" }, icon: "Users" },
    { id: "st-staff", label: "Total staff", value: "162", icon: "Briefcase" },
    { id: "st-attendance", label: "Attendance today", value: "92%", delta: { value: "-1.4%", direction: "down" }, icon: "CalendarCheck" },
    { id: "st-fees", label: "Fees collected (MTD)", value: "₹48.1L", delta: { value: "+6.3%", direction: "up" }, icon: "Wallet" },
  ];
}

/** Everything here is still synthetic — the pieces of DashboardData that have no owning
 * module yet (notifications/birthdays/holidays are dashboard-only concepts, and
 * today's classes / performance / revenue trends would need Timetable/Examinations/Fees
 * aggregation beyond this task's scope). Real per-module data (homework, exams, fees,
 * library, transport, hostel) is assembled in api.ts instead. */
export {
  buildStats,
  buildAttendance,
  buildTodayClasses,
  buildNotifications,
  buildBirthdays,
  buildHolidays,
  buildCalendarEvents,
  buildRecentActivity,
  buildPerformanceTrend,
  buildRevenueTrend,
};
