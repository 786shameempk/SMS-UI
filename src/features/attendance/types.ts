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
