import { listClasses, listSections } from "@/features/academics/api";
import { mockDelay } from "@/utils/mockDelay";
import { SEED_ATTENDANCE_RECORDS, SEED_ROSTER, SEED_STAFF_ATTENDANCE_RECORDS } from "./mock";
import type {
  AttendanceRecord,
  AttendanceRecordFilters,
  AttendanceStatus,
  DailySectionSummary,
  MonthlyStudentRow,
  RosterSectionOption,
  SaveAttendanceParams,
  SaveStaffAttendanceParams,
  StaffAttendanceFilters,
  StaffAttendanceRecord,
  StudentRosterEntry,
  YearlyTrendPoint,
} from "./types";

const RECORDS_KEY = "sms-mock-attendance-records";
const STAFF_RECORDS_KEY = "sms-mock-staff-attendance-records";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let records = loadJson<AttendanceRecord[]>(RECORDS_KEY, SEED_ATTENDANCE_RECORDS.map((r) => ({ ...r })));
let staffRecords = loadJson<StaffAttendanceRecord[]>(STAFF_RECORDS_KEY, SEED_STAFF_ATTENDANCE_RECORDS.map((r) => ({ ...r })));

const persistRecords = () => saveJson(RECORDS_KEY, records);
const persistStaffRecords = () => saveJson(STAFF_RECORDS_KEY, staffRecords);

// ── Roster ───────────────────────────────────────────────────────────────

export async function listRosterSections(): Promise<RosterSectionOption[]> {
  const sections = await listSections();
  const bySectionId = new Map<string, number>();
  for (const student of SEED_ROSTER) {
    bySectionId.set(student.sectionId, (bySectionId.get(student.sectionId) ?? 0) + 1);
  }
  const options = Array.from(bySectionId.entries()).map(([sectionId, studentCount]) => ({
    sectionId,
    classId: sections.find((s) => s.id === sectionId)?.classId ?? "",
    studentCount,
  }));
  return mockDelay(options, 250);
}

export async function getSectionRoster(sectionId: string): Promise<StudentRosterEntry[]> {
  return mockDelay(SEED_ROSTER.filter((r) => r.sectionId === sectionId), 300);
}

// ── Student attendance ───────────────────────────────────────────────────

export async function getAttendanceForSectionDate(sectionId: string, date: string): Promise<AttendanceRecord[]> {
  return mockDelay(records.filter((r) => r.sectionId === sectionId && r.date === date), 300);
}

export async function saveAttendance(params: SaveAttendanceParams): Promise<AttendanceRecord[]> {
  const { sectionId, date, captureMode, entries } = params;
  const now = new Date().toISOString();
  const created: AttendanceRecord[] = entries.map((entry) => ({
    id: genId("att"),
    studentId: entry.studentId,
    sectionId,
    date,
    status: entry.status,
    captureMode,
    remarks: entry.remarks,
    markedAt: now,
  }));
  records = [...records.filter((r) => !(r.sectionId === sectionId && r.date === date)), ...created];
  persistRecords();
  return mockDelay(created, 450);
}

export async function listAttendanceRecords(filters?: AttendanceRecordFilters): Promise<AttendanceRecord[]> {
  let result = [...records];
  if (filters?.sectionId) result = result.filter((r) => r.sectionId === filters.sectionId);
  if (filters?.dateFrom) result = result.filter((r) => r.date >= filters.dateFrom!);
  if (filters?.dateTo) result = result.filter((r) => r.date <= filters.dateTo!);
  return mockDelay(result, 350);
}

// ── Staff attendance ─────────────────────────────────────────────────────

export async function getStaffAttendanceForDate(date: string): Promise<StaffAttendanceRecord[]> {
  return mockDelay(staffRecords.filter((r) => r.date === date), 300);
}

export async function saveStaffAttendance(params: SaveStaffAttendanceParams): Promise<StaffAttendanceRecord[]> {
  const { date, entries } = params;
  const now = new Date().toISOString();
  const created: StaffAttendanceRecord[] = entries.map((entry) => ({
    id: genId("satt"),
    staffId: entry.staffId,
    date,
    status: entry.status,
    markedAt: now,
  }));
  const staffIds = new Set(entries.map((e) => e.staffId));
  staffRecords = [...staffRecords.filter((r) => !(r.date === date && staffIds.has(r.staffId))), ...created];
  persistStaffRecords();
  return mockDelay(created, 450);
}

export async function listStaffAttendanceRecords(filters?: StaffAttendanceFilters): Promise<StaffAttendanceRecord[]> {
  let result = [...staffRecords];
  if (filters?.dateFrom) result = result.filter((r) => r.date >= filters.dateFrom!);
  if (filters?.dateTo) result = result.filter((r) => r.date <= filters.dateTo!);
  return mockDelay(result, 350);
}

// ── Reports ──────────────────────────────────────────────────────────────

export async function getDailySectionSummaries(date: string): Promise<DailySectionSummary[]> {
  const [sections, classes] = await Promise.all([listSections(), listClasses()]);
  const sectionIds = Array.from(new Set(SEED_ROSTER.map((r) => r.sectionId)));

  const summaries: DailySectionSummary[] = sectionIds.map((sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    const schoolClass = section ? classes.find((c) => c.id === section.classId) : undefined;
    const roster = SEED_ROSTER.filter((r) => r.sectionId === sectionId);
    const dayRecords = records.filter((r) => r.sectionId === sectionId && r.date === date);
    const count = (status: AttendanceStatus) => dayRecords.filter((r) => r.status === status).length;
    const present = count("present");
    const marked = dayRecords.length;
    return {
      sectionId,
      classId: section?.classId ?? "",
      className: schoolClass?.name ?? "Unknown class",
      sectionName: section?.name ?? "Unknown section",
      totalStudents: roster.length,
      marked,
      present,
      absent: count("absent"),
      late: count("late"),
      halfDay: count("half-day"),
      leave: count("leave"),
      percentPresent: marked > 0 ? Math.round((present / marked) * 1000) / 10 : 0,
    };
  });

  return mockDelay(summaries, 350);
}

export async function getMonthlyStudentSummary(sectionId: string, year: number, month: number): Promise<MonthlyStudentRow[]> {
  const roster = SEED_ROSTER.filter((r) => r.sectionId === sectionId);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthRecords = records.filter((r) => r.sectionId === sectionId && r.date.startsWith(monthPrefix));

  const rows: MonthlyStudentRow[] = roster.map((student) => {
    const studentRecords = monthRecords.filter((r) => r.studentId === student.id);
    const statusByDay: Record<number, AttendanceStatus | undefined> = {};
    for (const record of studentRecords) statusByDay[Number(record.date.slice(8, 10))] = record.status;
    const count = (status: AttendanceStatus) => studentRecords.filter((r) => r.status === status).length;
    const present = count("present");
    const markedDays = studentRecords.length;
    return {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      statusByDay,
      presentDays: present,
      absentDays: count("absent"),
      lateDays: count("late"),
      halfDays: count("half-day"),
      leaveDays: count("leave"),
      markedDays,
      percentPresent: markedDays > 0 ? Math.round((present / markedDays) * 1000) / 10 : 0,
    };
  });

  return mockDelay(rows, 400);
}

export async function getYearlyTrend(sectionId?: string): Promise<YearlyTrendPoint[]> {
  const filtered = sectionId ? records.filter((r) => r.sectionId === sectionId) : records;
  const byMonth = new Map<string, { present: number; total: number }>();
  for (const record of filtered) {
    const monthKey = record.date.slice(0, 7);
    const bucket = byMonth.get(monthKey) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (record.status === "present") bucket.present += 1;
    byMonth.set(monthKey, bucket);
  }

  const points: YearlyTrendPoint[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, bucket]) => {
      const [year, month] = monthKey.split("-").map(Number);
      const label = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      return {
        month: label,
        percentPresent: bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 1000) / 10 : 0,
        totalMarked: bucket.total,
      };
    });

  return mockDelay(points, 400);
}
