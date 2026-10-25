import { officeHttp } from "./http";
import type { Paged } from "../types";

export interface TemplateColumn {
  name: string;
  required: boolean;
  description: string;
  example: string;
}

export interface ImportTemplate {
  type: string;
  label: string;
  order: number;
  description: string;
  dependsOn: string[];
  columns: TemplateColumn[];
}

export interface SchoolImportStatus {
  schoolId: string;
  schoolName: string;
  tenantId: string | null;
  provisioned: boolean;
  existing: { academicYears: number; classes: number; sections: number; staff: number; students: number } | null;
  problem: string | null;
}

export interface ImportBatch {
  id: string;
  schoolId: string;
  type: string;
  fileName: string;
  status: "Validated" | "Applying" | "Completed" | "Discarded";
  totalRows: number;
  validRows: number;
  reusedRows: number;
  errorRows: number;
  createdCount: number;
  reusedCount: number;
  rejectedCount: number;
  uploadedByEmail: string | null;
  uploadedAt: string;
  confirmedByEmail: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
}

export interface ImportRow {
  line: number;
  status: "Ok" | "Reuse" | "Error";
  outcome: "Created" | "Reused" | "Rejected" | null;
  messages: string[];
  data: Record<string, string | null>;
}

export interface ImportDetail {
  batch: ImportBatch;
  rows: Paged<ImportRow>;
}

export type RowFilter = "all" | "errors" | "reuse" | "ok";

export const listImportTemplates = async () => (await officeHttp.get<ImportTemplate[]>("onboarding/templates")).data;
export const schoolImportStatus = async (schoolId: string) => (await officeHttp.get<SchoolImportStatus>(`onboarding/schools/${schoolId}`)).data;
export const importHistory = async (schoolId: string) => (await officeHttp.get<ImportBatch[]>(`onboarding/schools/${schoolId}/imports`)).data;
export const importDetail = async (batchId: string, q: { filter?: RowFilter; page?: number; pageSize?: number }) =>
  (await officeHttp.get<ImportDetail>(`onboarding/imports/${batchId}`, { params: { filter: q.filter === "all" ? undefined : q.filter, page: q.page, pageSize: q.pageSize } })).data;

export async function uploadImport(schoolId: string, type: string, file: File): Promise<ImportDetail> {
  const form = new FormData();
  form.append("file", file);
  return (await officeHttp.post<ImportDetail>(`onboarding/schools/${schoolId}/imports/${type}`, form, { timeout: 120_000 })).data;
}

export const confirmImport = async (batchId: string, acknowledgeErrors: boolean) =>
  (await officeHttp.post<ImportDetail>(`onboarding/imports/${batchId}/confirm`, { acknowledgeErrors }, { timeout: 180_000 })).data;

export const discardImport = async (batchId: string) => {
  await officeHttp.post(`onboarding/imports/${batchId}/discard`);
};

/** The files are behind the bearer token, so they are fetched and saved from memory rather than linked. */
async function save(path: string, fileName: string) {
  const blob = (await officeHttp.get<Blob>(path, { responseType: "blob" })).data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export const downloadTemplate = (type: string) => save(`onboarding/templates/${type}.csv`, `${type}-template.csv`);
export const downloadErrorReport = (batchId: string, type: string) => save(`onboarding/imports/${batchId}/errors.csv`, `${type}-errors.csv`);

export interface Invitation {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: "InvitationSent" | "InvitationFailed" | "Active" | "Suspended" | "Missing";
  sendCount: number;
  lastSentAt: string | null;
  lastError: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface InvitationDirectory {
  page: Paged<Invitation>;
  totals: Record<string, number>;
}

export const listInvitations = async (schoolId: string, q: { search?: string; status?: string; role?: string; page?: number; pageSize?: number }) =>
  (await officeHttp.get<InvitationDirectory>(`onboarding/schools/${schoolId}/users`, { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== "" && v !== "all")) })).data;

export const resendInvitation = async (invitationId: string) => (await officeHttp.post<Invitation>(`onboarding/users/${invitationId}/resend`)).data;

// ── Profile approval ─────────────────────────────────────────────────────────

export type ProfileStatus = "Incomplete" | "PendingApproval" | "ChangesRequested" | "Approved";

export interface ProfileQueueItem {
  profileId: string;
  personType: "staff" | "student";
  personId: string;
  name: string;
  subtitle: string;
  status: ProfileStatus;
  submittedAt: string | null;
  version: number;
  changeCount: number;
  hasProtectedChange: boolean;
}

export interface ProfileQueuePage {
  items: ProfileQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
}

export interface ProfileChange {
  key: string;
  label: string;
  protected: boolean;
  imported: string | null;
  approved: string | null;
  current: string | null;
}

export interface ProfileHistoryItem {
  kind: "Submitted" | "Approved" | "ChangesRequested";
  at: string;
  by: string | null;
  reason: string | null;
  version: number;
}

export interface ProfileReview {
  summary: ProfileQueueItem;
  changes: ProfileChange[];
  details: { label: string; group: string; value: string | null }[];
  history: ProfileHistoryItem[];
}

export interface ProfileDecisionResult {
  profileId: string;
  outcome: "Approved" | "ChangesRequested" | "Skipped";
  message: string | null;
}

const profiles = (schoolId: string) => `onboarding/schools/${schoolId}/profiles`;

export const profileQueue = async (schoolId: string, q: { status?: string; personType?: string; search?: string; page?: number; pageSize?: number }) =>
  (await officeHttp.get<ProfileQueuePage>(profiles(schoolId), { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== "" && v !== "all")) })).data;

export const reviewProfile = async (schoolId: string, profileId: string) => (await officeHttp.get<ProfileReview>(`${profiles(schoolId)}/${profileId}`)).data;

export const approveProfile = async (schoolId: string, profileId: string, version: number) =>
  (await officeHttp.post<ProfileDecisionResult>(`${profiles(schoolId)}/${profileId}/approve`, { version })).data;

export const requestProfileChanges = async (schoolId: string, profileId: string, reason: string, version: number) =>
  (await officeHttp.post<ProfileDecisionResult>(`${profiles(schoolId)}/${profileId}/request-changes`, { reason, version })).data;

export const bulkApproveProfiles = async (schoolId: string, profileIds: string[]) =>
  (await officeHttp.post<ProfileDecisionResult[]>(`${profiles(schoolId)}/bulk-approve`, { profileIds })).data;

// ── Readiness and go-live ────────────────────────────────────────────────────

export interface ReadinessPolicy {
  requireCurrentYear: boolean;
  requireStructure: boolean;
  requireStaffAndStudents: boolean;
  requireClassTeachers: boolean;
  minStaffProfilesApprovedPercent: number;
  minStudentProfilesApprovedPercent: number;
  minAccountsActivatedPercent: number;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  required: boolean;
  passed: boolean;
  detail: string;
}

export interface ReadinessReport {
  schoolId: string;
  provisioned: boolean;
  ready: boolean;
  passed: number;
  outstanding: number;
  blockers: string[];
  checks: ReadinessCheck[];
  policy: ReadinessPolicy;
  goLive: { stage: string; subscriptionStatus: string | null; subscriptionId: string | null; markedReadyAt: string | null; markedReadyBy: string | null; canActivate: boolean };
  problem: string | null;
}

export const getReadiness = async (schoolId: string) => (await officeHttp.get<ReadinessReport>(`onboarding/schools/${schoolId}/readiness`)).data;
export const saveReadinessPolicy = async (schoolId: string, policy: ReadinessPolicy) => (await officeHttp.put<ReadinessPolicy>(`onboarding/schools/${schoolId}/policy`, policy)).data;
export const markSchoolReady = async (schoolId: string) => (await officeHttp.post<ReadinessReport>(`onboarding/schools/${schoolId}/mark-ready`)).data;
