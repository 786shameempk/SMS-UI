import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  Answer,
  ApprovalEntry,
  Assignment,
  AuditEntry,
  CommentReview,
  Criterion,
  CriterionValues,
  CycleDetail,
  CyclePreview,
  CycleStatus,
  CycleSummary,
  CycleValues,
  DashboardData,
  DashboardFilters,
  EligibleEmployee,
  GenerateResult,
  Goal,
  GoalValues,
  ManualAssignment,
  ModerationValues,
  MyAppraisal,
  MyAssignment,
  Participant,
  ParticipantSelection,
  ParticipantStatus,
  Question,
  QuestionValues,
  Report,
  ReportFilters,
  AppraisalResult,
  ReviewForm,
  RosterEntry,
  Settings,
  Template,
  TemplateValues,
  TemplateVersion,
} from "./types";

const BASE = "api/appraisal";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

/** Drops empty filters so they don't reach the server as "undefined" / empty strings. */
export function clean(params?: object): Record<string, unknown> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const get = <T>(path: string, params?: object) => unwrap(academicHttpClient.get<T>(`${BASE}/${path}`, { params: clean(params) }));
const post = <T>(path: string, body?: unknown, params?: object) => unwrap(academicHttpClient.post<T>(`${BASE}/${path}`, body ?? {}, { params: clean(params) }));
const put = <T>(path: string, body: unknown) => unwrap(academicHttpClient.put<T>(`${BASE}/${path}`, body));
const del = (path: string, params?: object) => unwrap(academicHttpClient.delete(`${BASE}/${path}`, { params: clean(params) })).then(() => undefined);

// ── Settings & audit ────────────────────────────────────────────────────────

export const getSettings = () => get<Settings>("settings");
export const updateSettings = (v: Settings) => put<Settings>("settings", v);
export const listAudit = (filters: { entityType?: string; entityId?: string; page?: number; pageSize?: number } = {}) => get<AuditEntry[]>("settings/audit", filters);

// ── Question bank ───────────────────────────────────────────────────────────

export const listCriteria = () => get<Criterion[]>("criteria");
export const createCriterion = (v: CriterionValues) => post<Criterion>("criteria", v);
export const updateCriterion = (id: string, v: CriterionValues) => put<Criterion>(`criteria/${id}`, v);
export const deleteCriterion = (id: string) => del(`criteria/${id}`);

export const listQuestions = (filters: { criterionId?: string; includeInactive?: boolean } = {}) => get<Question[]>("questions", filters);
export const createQuestion = (v: QuestionValues) => post<Question>("questions", v);
export const updateQuestion = (id: string, v: QuestionValues) => put<Question>(`questions/${id}`, v);
export const deleteQuestion = (id: string) => del(`questions/${id}`);
export const reorderQuestions = (ids: string[]) => post<void>("questions/reorder", ids);

export const listTemplates = () => get<Template[]>("templates");
export const createTemplate = (v: TemplateValues) => post<Template>("templates", v);
export const updateTemplate = (id: string, v: TemplateValues) => put<Template>(`templates/${id}`, v);
export const publishTemplateVersion = (id: string) => post<TemplateVersion>(`templates/${id}/versions`);
export const listTemplateVersions = (id: string) => get<TemplateVersion[]>(`templates/${id}/versions`);
export const getTemplateVersion = (versionId: string) => get<TemplateVersion>(`templates/versions/${versionId}`);

// ── Cycles ──────────────────────────────────────────────────────────────────

export const listCycles = (filters: { status?: CycleStatus; academicYearId?: string } = {}) => get<CycleSummary[]>("cycles", filters);
export const getCycle = (id: string) => get<CycleDetail>(`cycles/${id}`);
export const createCycle = (v: CycleValues) => post<CycleDetail>("cycles", v);
export const updateCycle = (id: string, v: CycleValues) => put<CycleDetail>(`cycles/${id}`, v);
export const deleteCycle = (id: string) => del(`cycles/${id}`);
export const previewCycle = (id: string) => get<CyclePreview>(`cycles/${id}/preview`);
export const publishCycle = (id: string) => post<CycleDetail>(`cycles/${id}/publish`);
export const closeCycle = (id: string) => post<CycleDetail>(`cycles/${id}/close`);
export const cancelCycle = (id: string) => post<CycleDetail>(`cycles/${id}/cancel`);
export const recalculateCycle = (id: string) => post<{ recalculated: number }>(`cycles/${id}/recalculate`);

export interface DatesAmendment {
  reason: string;
  submissionDeadline?: string;
  managerDeadline?: string;
  approvalDeadline?: string;
  finalizationDate?: string;
  reviewOpenDate?: string;
}
export const amendCycleDates = (id: string, v: DatesAmendment) => post<CycleDetail>(`cycles/${id}/amend`, v);
export const amendCycleScoring = (id: string, v: { reason: string; weights: { category: string; group: string; weight: number }[] }) => post<CycleDetail>(`cycles/${id}/amend-scoring`, v);

export const listEligible = (cycleId: string, filters: { search?: string; departmentId?: string } = {}) => get<EligibleEmployee[]>(`cycles/${cycleId}/eligible`, filters);
export const listParticipants = (cycleId: string, filters: { status?: ParticipantStatus; search?: string } = {}) => get<Participant[]>(`cycles/${cycleId}/participants`, filters);
export const addParticipants = (cycleId: string, v: ParticipantSelection) => post<Participant[]>(`cycles/${cycleId}/participants`, v);
export const removeParticipant = (cycleId: string, participantId: string, reason?: string) => del(`cycles/${cycleId}/participants/${participantId}`, { reason });
export const generateAssignments = (cycleId: string, participantId?: string) => post<GenerateResult>(`cycles/${cycleId}/assignments/generate`, undefined, { participantId });
export const addAssignment = (cycleId: string, v: ManualAssignment) => post<Assignment>(`cycles/${cycleId}/assignments`, v);

// ── Participants: roster, results, approval ─────────────────────────────────

export const listAssignments = (participantId: string) => get<Assignment[]>(`participants/${participantId}/assignments`);
export const getRoster = (participantId: string) => get<RosterEntry[]>(`participants/${participantId}/roster`);
export const getResult = (participantId: string) => get<AppraisalResult>(`participants/${participantId}/result`);
export const getApprovalHistory = (participantId: string) => get<ApprovalEntry[]>(`participants/${participantId}/history`);
export const listCommentReviews = (participantId: string) => get<CommentReview[]>(`participants/${participantId}/comment-reviews`);
export const moderateReview = (participantId: string, reviewId: string, v: ModerationValues) => post<void>(`participants/${participantId}/reviews/${reviewId}/moderate`, v);
export const submitForApproval = (participantId: string) => post<void>(`participants/${participantId}/submit-for-approval`);
export const approveParticipant = (participantId: string, comment?: string) => post<void>(`participants/${participantId}/approve`, { comment });
export const returnParticipant = (participantId: string, comment: string) => post<void>(`participants/${participantId}/return`, { comment });
export const rejectParticipant = (participantId: string, comment: string) => post<void>(`participants/${participantId}/reject`, { comment });
export const finalizeParticipant = (participantId: string, v: { remarks?: string; releaseToEmployee: boolean }) => post<void>(`participants/${participantId}/finalize`, v);
export const releaseParticipant = (participantId: string, release: boolean) => post<void>(`participants/${participantId}/release`, undefined, { release });
export const reopenParticipant = (participantId: string, reason: string) => post<void>(`participants/${participantId}/reopen`, { reason });

export const listGoals = (participantId: string) => get<Goal[]>(`participants/${participantId}/goals`);
export const addGoal = (participantId: string, v: GoalValues) => post<Goal>(`participants/${participantId}/goals`, v);
export const updateGoal = (id: string, v: Partial<GoalValues>) => put<Goal>(`goals/${id}`, v);
export const deleteGoal = (id: string) => del(`goals/${id}`);

export const cancelAssignment = (id: string, reason?: string) => post<void>(`assignments/${id}/cancel`, undefined, { reason });
export const reassignAssignment = (id: string, v: { reviewerStaffId?: string; reason: string }) => post<Assignment>(`assignments/${id}/reassign`, v);
export const reopenAssignment = (id: string, reason?: string) => post<void>(`assignments/${id}/reopen`, undefined, { reason });

export const listMyAppraisals = () => get<MyAppraisal[]>("mine");

// ── Dashboard & reports ─────────────────────────────────────────────────────

export const getDashboard = (filters: DashboardFilters = {}) => get<DashboardData>("dashboard", filters);
export const listReportKeys = () => get<string[]>("reports");
export const getReport = (key: string, filters: ReportFilters = {}) => get<Report>(`reports/${key}`, filters);

/** The report as a CSV file; the server audits the export and defuses formula-looking cells. */
export async function downloadReportCsv(key: string, filters: ReportFilters = {}): Promise<Blob> {
  try {
    const { data } = await academicHttpClient.get<Blob>(`${BASE}/reports/${key}/csv`, { params: clean(filters), responseType: "blob" });
    return data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Reviewer's side ─────────────────────────────────────────────────────────

export const listMyReviews = (includeSubmitted = false) => get<MyAssignment[]>("reviews/mine", { includeSubmitted: includeSubmitted ? true : undefined });
export const getReviewForm = (assignmentId: string) => get<ReviewForm>(`reviews/${assignmentId}`);
export const saveDraft = (assignmentId: string, answers: Answer[]) => put<void>(`reviews/${assignmentId}/draft`, { answers });
export const discardDraft = (assignmentId: string) => del(`reviews/${assignmentId}/draft`);
export const submitReview = (assignmentId: string, answers: Answer[]) => post<void>(`reviews/${assignmentId}/submit`, { answers });
