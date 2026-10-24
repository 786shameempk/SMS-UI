import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";

export type VisitorStatus = "checked-in" | "checked-out";
export type VisitorHostType = "student" | "staff" | "other";
export type VisitPurpose = "meeting" | "pickup" | "delivery" | "maintenance" | "interview" | "event" | "other";
export type PreApprovalStatus = "scheduled" | "arrived" | "cancelled" | "no-show";

export interface HostDetails {
  hostType: VisitorHostType;
  hostStudentId?: string;
  hostStaffId?: string;
  hostOtherLabel?: string;
}

export interface VisitorEntry extends HostDetails {
  id: string;
  tenantId: string;
  branchId: string;
  visitorName: string;
  phone: string;
  idProofType?: string;
  idProofNumber?: string;
  purpose: VisitPurpose;
  purposeNotes?: string;
  badgeNumber: string;
  checkInAt: string;
  checkOutAt?: string;
  status: VisitorStatus;
  preApprovalId?: string;
  /** What the badge's QR code carries; the badge stops working a day after check-in. */
  passToken?: string;
  passExpiresAt?: string;
}

export type VisitorScanResult = "inside" | "already-left" | "expired" | "arrival-expected" | "pre-approval-closed" | "not-today" | "unknown";

/** Security's answer for one scanned pass. Scanning checks nobody in or out: the ids say which action to offer next. */
export interface VisitorScan {
  result: VisitorScanResult;
  message: string;
  visitorName?: string;
  badgeNumber?: string;
  purpose?: VisitPurpose;
  checkInAt?: string;
  checkOutAt?: string;
  scheduledAt?: string;
  visitorEntryId?: string;
  preApprovalId?: string;
}

export interface VisitorCheckInFormValues extends HostDetails {
  visitorName: string;
  phone: string;
  idProofType?: string;
  idProofNumber?: string;
  purpose: VisitPurpose;
  purposeNotes?: string;
  preApprovalId?: string;
}

export interface VisitorEntryRow extends VisitorEntry {
  hostStudent?: Student;
  hostStaff?: StaffMember;
  hostLabel: string;
  durationMinutes?: number;
  onWatchlist: boolean;
}

export interface PreApprovedVisit extends HostDetails {
  id: string;
  tenantId: string;
  branchId: string;
  visitorName: string;
  phone: string;
  purpose: VisitPurpose;
  purposeNotes?: string;
  scheduledAt: string;
  status: PreApprovalStatus;
  visitorEntryId?: string;
  /** What the invitation's QR code carries; the visitor shows it at the gate. */
  passToken?: string;
  passExpiresAt?: string;
}

export interface PreApprovedVisitFormValues extends HostDetails {
  visitorName: string;
  phone: string;
  purpose: VisitPurpose;
  purposeNotes?: string;
  scheduledAt: string;
}

export interface PreApprovedVisitRow extends PreApprovedVisit {
  hostStudent?: Student;
  hostStaff?: StaffMember;
  hostLabel: string;
}

export interface WatchlistEntry {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  reason: string;
  addedAt: string;
}

export interface WatchlistEntryFormValues {
  name: string;
  phone?: string;
  reason: string;
}

export interface VisitorReportsSummary {
  currentlyOnPremises: number;
  visitsToday: number;
  visitsLast30Days: number;
  visitsByPurpose: Array<{ purpose: VisitPurpose; count: number }>;
  avgVisitDurationMinutes: number | null;
  topHosts: Array<{ label: string; count: number }>;
}
