export type AttendanceStatus = "present" | "absent" | "late" | "half-day" | "leave";
export type StaffAttendanceStatus = "present" | "absent" | "late";
export type CaptureMode = "manual" | "qr" | "rfid" | "biometric" | "face" | "mobile";

export interface StudentRosterEntry {
  id: string;
  sectionId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  rollNumber: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  sectionId: string;
  date: string;
  status: AttendanceStatus;
  captureMode: CaptureMode;
  remarks?: string;
  markedAt: string;
  /** First scan of the day when the record came from a device or pass. */
  checkInAt?: string | null;
}

export interface MarkAttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface SaveAttendanceParams {
  sectionId: string;
  date: string;
  captureMode: CaptureMode;
  entries: MarkAttendanceEntry[];
  /** Client-made id for this save: sending the same id again never saves twice. */
  operationId?: string;
  /** The register version the entries were edited from ("none" when the day had no records). */
  baseVersion?: string;
  /** Save even if the register changed since baseVersion. */
  force?: boolean;
  /** School and branch the register belongs to, for a save sent after the user switched scope. */
  tenantId?: string;
  branchId?: string;
}

export interface AttendanceRegister {
  version: string;
  records: AttendanceRecord[];
}

export interface StaffAttendanceRecord {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  date: string;
  status: StaffAttendanceStatus;
  markedAt: string;
}

export interface MarkStaffAttendanceEntry {
  staffId: string;
  status: StaffAttendanceStatus;
}

export interface SaveStaffAttendanceParams {
  date: string;
  entries: MarkStaffAttendanceEntry[];
}

export interface AttendanceRecordFilters {
  sectionId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface StaffAttendanceFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface DailySectionSummary {
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

export interface MonthlyStudentRow {
  studentId: string;
  name: string;
  rollNumber: string;
  statusByDay: Record<number, AttendanceStatus | undefined>;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  markedDays: number;
  percentPresent: number;
}

export interface YearlyTrendPoint {
  month: string;
  percentPresent: number;
  totalMarked: number;
}

export interface RosterSectionOption {
  sectionId: string;
  classId: string;
  studentCount: number;
}
