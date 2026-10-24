import { useAuthStore } from "@/store/authStore";
import type { ScanResult } from "./types";

/**
 * Administrators set up devices, cards and face consent and decide reviews and corrections. Mirrors AcademicService's
 * ManageAttendanceSetup policy (module.administration); the server enforces it.
 */
export function useIsAttendanceAdmin(): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  return role === "superAdmin" || role === "admin" || role === "principal" || Boolean(modulePermissions?.administration);
}

export const RESULT_LABEL: Record<ScanResult, string> = {
  accepted: "Accepted",
  duplicate: "Duplicate",
  rejected: "Rejected",
  pendingReview: "Needs review",
};

export const RESULT_TONE: Record<ScanResult, "success" | "neutral" | "danger" | "warning"> = {
  accepted: "success",
  duplicate: "neutral",
  rejected: "danger",
  pendingReview: "warning",
};

export const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual",
  mobile: "Mobile app",
  qr: "QR pass",
  rfid: "RFID card",
  biometric: "Biometric",
  face: "Face",
};

export const formatTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
