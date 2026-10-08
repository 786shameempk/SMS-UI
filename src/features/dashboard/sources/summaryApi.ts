import { academicHttpClient, financeHttpClient } from "@/lib/httpClient";
import { toIsoDate } from "../dateRange";

/**
 * The services' dashboard aggregation endpoints: one request each instead of downloading every student, staff
 * member, exam result and invoice to count them in the browser. Both are scoped to the caller's school and branch
 * on the server, refuse callers without access (403), and are cached there for a minute.
 */

export interface AttendanceDay {
  date: string;
  marked: number;
  /** Present + late + half day. */
  attended: number;
  absent: number;
  late: number;
  leave: number;
  /** Null when nothing was marked. */
  percent: number | null;
}

export interface SectionAttendance {
  sectionId: string;
  label: string;
  students: number;
  marked: number;
  percent: number | null;
}

export interface AcademicSummary {
  activeStudents: number;
  admittedInRange: number;
  activeStaff: number;
  staffOnLeaveToday: number;
  today: AttendanceDay;
  previousSchoolDay: AttendanceDay;
  sectionAttendance: SectionAttendance[];
  /** month = yyyy-MM. */
  performance: Array<{ month: string; averageScore: number; passRate: number; results: number }>;
  topPerformers: Array<{ studentId: string; name: string; classLabel: string; averageScore: number; results: number }>;
  upcomingExams: number;
  pendingHomework: number;
}

export interface FeeSummary {
  currency: string;
  collectedInRange: number;
  collectedPreviousRange: number;
  pending: number;
  overdueCount: number;
  overdueAmount: number;
  paymentsToday: number;
  collectedToday: number;
  /** month = yyyy-MM. */
  months: Array<{ month: string; collected: number; expected: number }>;
  statusBreakdown: Array<{ status: "due" | "paid" | "overdue" | "partial"; count: number; amount: number }>;
  topDefaulters: Array<{ studentId: string; outstanding: number; invoices: number; oldestDueDate: string }>;
}

export interface SummaryRange {
  start: Date;
  end: Date;
}

const params = (range: SummaryRange) => ({ from: toIsoDate(range.start), to: toIsoDate(range.end), today: toIsoDate(new Date()) });

export async function getAcademicSummary(range: SummaryRange): Promise<AcademicSummary> {
  const { data } = await academicHttpClient.get<AcademicSummary>("/api/dashboard/academic-summary", { params: params(range) });
  return data;
}

export async function getFeeSummary(range: SummaryRange): Promise<FeeSummary> {
  const { data } = await financeHttpClient.get<FeeSummary>("/api/dashboard/fee-summary", { params: params(range) });
  return data;
}

/** "2026-07" → the `${year}-${monthIndex}` key monthsInRange() uses. */
export function monthKeyFromIso(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}-${m - 1}`;
}
