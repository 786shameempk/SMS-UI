import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";

export type ProfileStatus = "Incomplete" | "PendingApproval" | "ChangesRequested" | "Approved";

export interface ProfileField {
  key: string;
  label: string;
  group: string;
  kind: "text" | "textarea" | "date" | "select" | "phone" | "email";
  value: string | null;
  editable: boolean;
  sensitive: boolean;
  required: boolean;
  missing: boolean;
  options: string[] | null;
  /** A change to this field is waiting for approval; `value` is still the official one. */
  pending?: boolean;
  pendingValue?: string | null;
  /** False when the school lets this field change straight away. */
  needsApproval?: boolean;
}

export interface ProfileFeedback {
  decision: "Approved" | "ChangesRequested";
  reason: string | null;
  decidedAt: string;
  decidedBy: string | null;
}

export type ChangeStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface ChangeLine {
  key: string;
  label: string;
  from: string | null;
  to: string | null;
  sensitive: boolean;
}

export interface ProfileChange {
  id: string;
  status: ChangeStatus;
  personType: Profile["personType"];
  personId: string;
  subjectName: string;
  subjectDetail: string | null;
  requesterName: string;
  requesterRole: string | null;
  changes: ChangeLine[];
  approverName: string | null;
  approverRule: "ClassTeacher" | "ReportingPerson" | "DepartmentHead" | "Administrator";
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  reviewerComment: string | null;
  canDecide: boolean;
}

export interface Profile {
  personType: "staff" | "student" | "guardian" | "account";
  personId: string;
  displayName: string;
  subtitle: string;
  relation: "self" | "child";
  status: ProfileStatus;
  locked: boolean;
  submittedAt: string | null;
  version: number;
  fields: ProfileField[];
  missingFields: string[];
  feedback: ProfileFeedback | null;
  /** "completion" while an imported person is completing the profile the office approves; "approval" for every later edit. */
  mode?: "completion" | "approval";
  pending?: ProfileChange | null;
  lastRejected?: ProfileChange | null;
  /** Who will approve a change, e.g. "Maya Test (ClassTeacher)". */
  approver?: string | null;
}

export interface ChangeHistoryItem {
  action: string;
  at: string;
  by: string | null;
  details: string | null;
}

export interface ChangeDetail {
  request: ProfileChange;
  history: ChangeHistoryItem[];
}

export interface ChangePage {
  items: ProfileChange[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
}

export type InboxTab = "pending" | "approved" | "rejected" | "all";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export const listMyProfiles = () => unwrap(academicHttpClient.get<Profile[]>("/api/my-profile"));

export const saveProfile = (profile: Pick<Profile, "personType" | "personId">, values: Record<string, string | null>) =>
  unwrap(academicHttpClient.put<Profile>(`/api/my-profile/${profile.personType}/${profile.personId}`, { values }));

export const submitProfile = (profile: Pick<Profile, "personType" | "personId">) =>
  unwrap(academicHttpClient.post<Profile>(`/api/my-profile/${profile.personType}/${profile.personId}/submit`));

// ── Profile change approvals ─────────────────────────────────────────────

export const listApprovals = (tab: InboxTab, search: string, page: number) =>
  unwrap(academicHttpClient.get<ChangePage>("/api/profile-approvals", { params: { tab, search: search || undefined, page, pageSize: 25 } }));

export const listMyRequests = () => unwrap(academicHttpClient.get<ProfileChange[]>("/api/profile-approvals/mine"));

export const getApproval = (id: string) => unwrap(academicHttpClient.get<ChangeDetail>(`/api/profile-approvals/${id}`));

export const approveChange = (id: string, comment: string) => unwrap(academicHttpClient.post<ChangeDetail>(`/api/profile-approvals/${id}/approve`, { comment: comment || null }));

export const rejectChange = (id: string, comment: string) => unwrap(academicHttpClient.post<ChangeDetail>(`/api/profile-approvals/${id}/reject`, { comment }));

export const cancelChange = (id: string) => unwrap(academicHttpClient.post<void>(`/api/profile-approvals/${id}/cancel`));
