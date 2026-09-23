import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  AttendanceRecord,
  AttendanceRecordFilters,
  AttendanceStatus,
  CaptureMode,
  DailySectionSummary,
  MonthlyStudentRow,
  RosterSectionOption,
  SaveAttendanceParams,
  SaveStaffAttendanceParams,
  StaffAttendanceFilters,
  StaffAttendanceRecord,
  StaffAttendanceStatus,
  StudentRosterEntry,
  YearlyTrendPoint,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// AcademicService's enums serialize as PascalCase; SMS UI's types use lowercase/kebab-case unions.

const ATTENDANCE_STATUS_TO_API: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  "half-day": "HalfDay",
  leave: "Leave",
};
const ATTENDANCE_STATUS_FROM_API: Record<string, AttendanceStatus> = {
  Present: "present",
  Absent: "absent",
  Late: "late",
  HalfDay: "half-day",
  Leave: "leave",
};

const STAFF_ATTENDANCE_STATUS_TO_API: Record<StaffAttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
};
const STAFF_ATTENDANCE_STATUS_FROM_API: Record<string, StaffAttendanceStatus> = {
  Present: "present",
  Absent: "absent",
  Late: "late",
};

const CAPTURE_MODE_TO_API: Record<CaptureMode, string> = {
  manual: "Manual",
  qr: "Qr",
  rfid: "Rfid",
  biometric: "Biometric",
  face: "Face",
  mobile: "Mobile",
};
const CAPTURE_MODE_FROM_API: Record<string, CaptureMode> = {
  Manual: "manual",
  Qr: "qr",
  Rfid: "rfid",
  Biometric: "biometric",
  Face: "face",
  Mobile: "mobile",
};

// ── API response shapes (AcademicService DTOs) ──────────────────────────────

interface ApiAttendanceRecord {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  sectionId: string;
  date: string;
  status: string;
  captureMode: string;
  remarks: string | null;
  markedAt: string;
}

interface ApiStaffAttendanceRecord {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  date: string;
  status: string;
  markedAt: string;
}

interface ApiStudentRosterEntry {
  id: string;
  sectionId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
}

interface ApiRosterSectionOption {
  sectionId: string;
  classId: string;
  studentCount: number;
}

interface ApiDailySectionSummary {
  sectionId: string;
  classId: string;
  className: string;
  sectionName: string;
  totalStudents: number;
  marked: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  percentPresent: number;
}

interface ApiMonthlyStudentRow {
  studentId: string;
  name: string;
  rollNumber: string | null;
  statusByDay: Record<string, string | null>;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  markedDays: number;
  percentPresent: number;
}

interface ApiYearlyTrendPoint {
  month: string;
  percentPresent: number;
  totalMarked: number;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const mapRecord = (dto: ApiAttendanceRecord): AttendanceRecord => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  studentId: dto.studentId,
  sectionId: dto.sectionId,
  date: dto.date,
  status: ATTENDANCE_STATUS_FROM_API[dto.status] ?? "present",
  captureMode: CAPTURE_MODE_FROM_API[dto.captureMode] ?? "manual",
  remarks: dto.remarks ?? undefined,
  markedAt: dto.markedAt,
});

const mapStaffRecord = (dto: ApiStaffAttendanceRecord): StaffAttendanceRecord => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  staffId: dto.staffId,
  date: dto.date,
  status: STAFF_ATTENDANCE_STATUS_FROM_API[dto.status] ?? "present",
  markedAt: dto.markedAt,
});

const mapRosterEntry = (dto: ApiStudentRosterEntry): StudentRosterEntry => ({
  id: dto.id,
  sectionId: dto.sectionId,
  admissionNumber: dto.admissionNumber,
  firstName: dto.firstName,
  lastName: dto.lastName,
  rollNumber: dto.rollNumber ?? "",
});

const mapRosterSection = (dto: ApiRosterSectionOption): RosterSectionOption => ({
  sectionId: dto.sectionId,
  classId: dto.classId,
  studentCount: dto.studentCount,
});

const mapDailySummary = (dto: ApiDailySectionSummary): DailySectionSummary => ({
  sectionId: dto.sectionId,
  classId: dto.classId,
  className: dto.className,
  sectionName: dto.sectionName,
  totalStudents: dto.totalStudents,
  marked: dto.marked,
  present: dto.present,
  absent: dto.absent,
  late: dto.late,
  halfDay: dto.halfDay,
  leave: dto.leave,
  percentPresent: dto.percentPresent,
});

const mapMonthlyRow = (dto: ApiMonthlyStudentRow): MonthlyStudentRow => {
  const statusByDay: Record<number, AttendanceStatus | undefined> = {};
  for (const [day, status] of Object.entries(dto.statusByDay)) {
    if (status) statusByDay[Number(day)] = ATTENDANCE_STATUS_FROM_API[status] ?? undefined;
  }
  return {
    studentId: dto.studentId,
    name: dto.name,
    rollNumber: dto.rollNumber ?? "",
    statusByDay,
    presentDays: dto.presentDays,
    absentDays: dto.absentDays,
    lateDays: dto.lateDays,
    halfDays: dto.halfDays,
    leaveDays: dto.leaveDays,
    markedDays: dto.markedDays,
    percentPresent: dto.percentPresent,
  };
};

const mapYearlyPoint = (dto: ApiYearlyTrendPoint): YearlyTrendPoint => ({
  month: dto.month,
  percentPresent: dto.percentPresent,
  totalMarked: dto.totalMarked,
});

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Roster ───────────────────────────────────────────────────────────────

export async function listRosterSections(): Promise<RosterSectionOption[]> {
  const options = await unwrap(academicHttpClient.get<ApiRosterSectionOption[]>("/api/attendance/roster-sections"));
  return options.map(mapRosterSection);
}

export async function getSectionRoster(sectionId: string): Promise<StudentRosterEntry[]> {
  const roster = await unwrap(academicHttpClient.get<ApiStudentRosterEntry[]>(`/api/attendance/sections/${sectionId}/roster`));
  return roster.map(mapRosterEntry);
}

// ── Student attendance ───────────────────────────────────────────────────

export async function getAttendanceForSectionDate(sectionId: string, date: string): Promise<AttendanceRecord[]> {
  const records = await unwrap(
    academicHttpClient.get<ApiAttendanceRecord[]>(`/api/attendance/sections/${sectionId}/date/${date}`),
  );
  return records.map(mapRecord);
}

export async function saveAttendance(params: SaveAttendanceParams): Promise<AttendanceRecord[]> {
  const records = await unwrap(
    academicHttpClient.post<ApiAttendanceRecord[]>("/api/attendance", {
      sectionId: params.sectionId,
      date: params.date,
      captureMode: CAPTURE_MODE_TO_API[params.captureMode],
      entries: params.entries.map((e) => ({
        studentId: e.studentId,
        status: ATTENDANCE_STATUS_TO_API[e.status],
        remarks: e.remarks ?? null,
      })),
    }),
  );
  return records.map(mapRecord);
}

export async function listAttendanceRecords(filters?: AttendanceRecordFilters): Promise<AttendanceRecord[]> {
  const records = await unwrap(
    academicHttpClient.get<ApiAttendanceRecord[]>("/api/attendance/records", {
      params: { sectionId: filters?.sectionId, dateFrom: filters?.dateFrom, dateTo: filters?.dateTo },
    }),
  );
  return records.map(mapRecord);
}

// ── Staff attendance ─────────────────────────────────────────────────────

export async function getStaffAttendanceForDate(date: string): Promise<StaffAttendanceRecord[]> {
  const records = await unwrap(academicHttpClient.get<ApiStaffAttendanceRecord[]>(`/api/attendance/staff/date/${date}`));
  return records.map(mapStaffRecord);
}

export async function saveStaffAttendance(params: SaveStaffAttendanceParams): Promise<StaffAttendanceRecord[]> {
  const records = await unwrap(
    academicHttpClient.post<ApiStaffAttendanceRecord[]>("/api/attendance/staff", {
      date: params.date,
      entries: params.entries.map((e) => ({ staffId: e.staffId, status: STAFF_ATTENDANCE_STATUS_TO_API[e.status] })),
    }),
  );
  return records.map(mapStaffRecord);
}

export async function listStaffAttendanceRecords(filters?: StaffAttendanceFilters): Promise<StaffAttendanceRecord[]> {
  const records = await unwrap(
    academicHttpClient.get<ApiStaffAttendanceRecord[]>("/api/attendance/staff/records", {
      params: { dateFrom: filters?.dateFrom, dateTo: filters?.dateTo },
    }),
  );
  return records.map(mapStaffRecord);
}

// ── Reports ──────────────────────────────────────────────────────────────

export async function getDailySectionSummaries(date: string): Promise<DailySectionSummary[]> {
  const summaries = await unwrap(academicHttpClient.get<ApiDailySectionSummary[]>(`/api/attendance/reports/daily/${date}`));
  return summaries.map(mapDailySummary);
}

export async function getMonthlyStudentSummary(sectionId: string, year: number, month: number): Promise<MonthlyStudentRow[]> {
  const rows = await unwrap(
    academicHttpClient.get<ApiMonthlyStudentRow[]>(`/api/attendance/reports/monthly/${sectionId}/${year}/${month}`),
  );
  return rows.map(mapMonthlyRow);
}

export async function getYearlyTrend(sectionId?: string): Promise<YearlyTrendPoint[]> {
  const points = await unwrap(
    academicHttpClient.get<ApiYearlyTrendPoint[]>("/api/attendance/reports/yearly-trend", { params: { sectionId } }),
  );
  return points.map(mapYearlyPoint);
}
