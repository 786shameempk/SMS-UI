import type { AttendanceStatus, CaptureMode, StaffAttendanceStatus } from "./types";

export const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half-day", label: "Half Day" },
  { value: "leave", label: "Leave" },
];

export const STAFF_ATTENDANCE_STATUSES: { value: StaffAttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
];

/** How a record was captured. Device modes are only ever set by the server from real scans. */
export const CAPTURE_MODES: { value: CaptureMode; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "qr", label: "QR pass" },
  { value: "rfid", label: "RFID card" },
  { value: "biometric", label: "Biometric" },
  { value: "face", label: "Face recognition" },
  { value: "mobile", label: "Mobile app" },
];

export function attendanceStatusBadgeVariant(status: AttendanceStatus): "success" | "danger" | "warning" | "info" | "neutral" {
  switch (status) {
    case "present":
      return "success";
    case "absent":
      return "danger";
    case "late":
    case "half-day":
      return "warning";
    case "leave":
      return "info";
    default:
      return "neutral";
  }
}

export function staffAttendanceStatusBadgeVariant(status: StaffAttendanceStatus): "success" | "danger" | "warning" {
  switch (status) {
    case "present":
      return "success";
    case "absent":
      return "danger";
    case "late":
      return "warning";
  }
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_ACTIVE_CLASSES: Record<string, string> = {
  present: "border-green-600 bg-green-600 text-white",
  absent: "border-red-600 bg-red-600 text-white",
  late: "border-amber-500 bg-warning text-white",
  "half-day": "border-amber-500 bg-warning text-white",
  leave: "border-blue-600 bg-blue-600 text-white",
};

export function statusToggleActiveClass(status: string): string {
  return STATUS_ACTIVE_CLASSES[status] ?? "border-primary bg-primary text-primary-foreground";
}
