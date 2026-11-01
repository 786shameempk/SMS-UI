import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import type { Answer, ApprovalStageKey, AssignmentStatus, CycleStatus, FormQuestion, GoalStatus, ParticipantStatus, QuestionType, ReviewForm } from "./types";

import { useTranslation } from "react-i18next";

export const ALL = "__all";
export const NS = "appraisal";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

// ── Access ──────────────────────────────────────────────────────────────────

export interface AppraisalAccess {
  /** "Performance & Appraisal" is in the school's plan and the login can open it. */
  canView: boolean;
  /** Parents and students: only the feedback they were asked to give. */
  isFamily: boolean;
  canConfigure: boolean;
  canManageQuestions: boolean;
  canManageCycles: boolean;
  canPublish: boolean;
  canSelectParticipants: boolean;
  canAssignReviewers: boolean;
  /** Fill in reviews and self-assessments assigned to you. */
  canSubmit: boolean;
  canViewOwn: boolean;
  canViewTeam: boolean;
  canReviewReports: boolean;
  canApprove: boolean;
  canFinalize: boolean;
  canViewReports: boolean;
  canViewScores: boolean;
  canViewComments: boolean;
  canViewReviewerIdentity: boolean;
  canExport: boolean;
  canAmend: boolean;
  /** Anyone who sees cycles or other people's appraisals, as opposed to only their own. */
  seesCycles: boolean;
}

const NONE: Omit<AppraisalAccess, "canView" | "isFamily"> = {
  canConfigure: false,
  canManageQuestions: false,
  canManageCycles: false,
  canPublish: false,
  canSelectParticipants: false,
  canAssignReviewers: false,
  canSubmit: false,
  canViewOwn: false,
  canViewTeam: false,
  canReviewReports: false,
  canApprove: false,
  canFinalize: false,
  canViewReports: false,
  canViewScores: false,
  canViewComments: false,
  canViewReviewerIdentity: false,
  canExport: false,
  canAmend: false,
  seesCycles: false,
};

/**
 * What the signed-in user may do, from the module flag and the "Appraisal.*" staff actions in their session. A session from before staff
 * actions existed (no "Staff.Managed" marker) is judged by the module: everyone may submit and see their own appraisal, management stays
 * with school leaders - the same rule the server applies. The server enforces every action again; this only decides what to show.
 */
export function resolveAppraisalAccess(permissions: Record<string, boolean> | null | undefined, role: string | undefined): AppraisalAccess {
  const canView = Boolean(permissions?.appraisal);
  const isFamily = role === "parent" || role === "student";
  if (!canView) return { canView, isFamily, ...NONE };
  // A parent or student is never given a staff action, even if the token lists one; they only answer the feedback assigned to them.
  if (isFamily) return { canView, isFamily, ...NONE, canSubmit: true };

  const managed = Boolean(permissions?.["Staff.Managed"]);
  const leader = role === "admin" || role === "principal" || role === "superAdmin";
  const can = (action: string, elevated: boolean) => (managed ? Boolean(permissions?.[`Appraisal.${action}`]) : !elevated || leader);
  const access = {
    canConfigure: can("Configure", true),
    canManageQuestions: can("ManageQuestions", true),
    canManageCycles: can("ManageCycles", true),
    canPublish: can("Publish", true),
    canSelectParticipants: can("SelectParticipants", true),
    canAssignReviewers: can("AssignReviewers", true),
    canSubmit: can("Submit", false),
    canViewOwn: can("ViewOwn", false),
    canViewTeam: can("ViewTeam", true),
    canReviewReports: can("ReviewReports", true),
    canApprove: can("Approve", true),
    canFinalize: can("Finalize", true),
    canViewReports: can("ViewReports", true),
    canViewScores: can("ViewScores", true),
    canViewComments: can("ViewComments", true),
    canViewReviewerIdentity: can("ViewReviewerIdentity", true),
    canExport: can("Export", true),
    canAmend: can("Amend", true),
  };
  const seesCycles = access.canManageCycles || access.canSelectParticipants || access.canAssignReviewers || access.canViewTeam || access.canReviewReports || access.canApprove || access.canFinalize || access.canViewReports;
  return { canView, isFamily, ...access, seesCycles };
}

export function useAppraisalAccess(): AppraisalAccess {
  const permissions = useAuthStore((s) => s.modulePermissions);
  const role = useAuthStore((s) => s.user?.role);
  return resolveAppraisalAccess(permissions as Record<string, boolean> | null | undefined, role);
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const CYCLE_STATUS: Record<CycleStatus, { label: string; variant: BadgeVariant }> = {
  Draft: { label: "Draft", variant: "neutral" },
  Configured: { label: "Configured", variant: "info" },
  Published: { label: "Published", variant: "info" },
  InProgress: { label: "In progress", variant: "brand" },
  PendingReviews: { label: "Pending reviews", variant: "warning" },
  UnderApproval: { label: "Under approval", variant: "warning" },
  Finalized: { label: "Finalized", variant: "success" },
  Closed: { label: "Closed", variant: "neutral" },
  Cancelled: { label: "Cancelled", variant: "danger" },
};

export const PARTICIPANT_STATUS: Record<ParticipantStatus, { label: string; variant: BadgeVariant }> = {
  Selected: { label: "Selected", variant: "neutral" },
  Collecting: { label: "Collecting feedback", variant: "info" },
  Incomplete: { label: "Incomplete", variant: "warning" },
  ReadyForApproval: { label: "Ready for approval", variant: "brand" },
  UnderApproval: { label: "Under approval", variant: "warning" },
  Returned: { label: "Returned", variant: "danger" },
  Finalized: { label: "Finalized", variant: "success" },
  Withdrawn: { label: "Withdrawn", variant: "neutral" },
};

export const ASSIGNMENT_STATUS: Record<AssignmentStatus, { label: string; variant: BadgeVariant }> = {
  Pending: { label: "Not started", variant: "neutral" },
  Draft: { label: "Draft saved", variant: "info" },
  Submitted: { label: "Submitted", variant: "success" },
  Reopened: { label: "Reopened", variant: "warning" },
  Cancelled: { label: "Cancelled", variant: "danger" },
};

export const GOAL_STATUS: Record<GoalStatus, string> = {
  Proposed: "Proposed",
  Agreed: "Agreed",
  InProgress: "In progress",
  Achieved: "Achieved",
  Dropped: "Dropped",
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  Rating: "Rating scale",
  MultipleChoice: "Multiple choice",
  YesNo: "Yes / No",
  Comment: "Written comment",
  Strengths: "Strengths",
  ImprovementAreas: "Areas for improvement",
  Achievements: "Achievement highlights",
  NextGoals: "Goals for next cycle",
  Suggestion: "Suggestion",
};

export const REVIEWER_GROUP_LABEL: Record<string, string> = {
  self: "Self-assessment",
  student: "Students",
  parent: "Parents or guardians",
  peer_teacher: "Fellow teachers",
  peer_non_teaching: "Non-teaching colleagues",
  department_head: "Department head",
  reporting_manager: "Reporting manager",
  principal: "Principal",
  vice_principal: "Vice principal",
  hr: "HR or administrator",
  management: "School management",
};

export const EMPLOYEE_CATEGORY_LABEL: Record<string, string> = {
  teacher: "Teachers",
  head_teacher: "Head teachers",
  department_head: "Department heads",
  principal: "Principal",
  vice_principal: "Vice principal",
  administrative: "Administrative staff",
  office: "Office staff",
  accounts: "Accounts and finance",
  library: "Library staff",
  laboratory: "Laboratory staff",
  it: "IT and technical",
  transport: "Transport staff",
  hostel_campus: "Hostel and campus",
  security: "Security staff",
  housekeeping: "Housekeeping and maintenance",
  other: "Other",
};

export const STAGE_LABEL: Record<ApprovalStageKey, string> = {
  manager: "Reporting manager",
  department_head: "Department head",
  principal: "Principal",
  hr_finalize: "HR / management finalization",
};

export const REPORT_LABEL: Record<string, string> = {
  "cycle-summary": "Appraisal cycle summary",
  "employee-wise": "Employee-wise appraisal",
  "department-wise": "Department-wise performance",
  "teaching-staff": "Teaching staff appraisal",
  "non-teaching-staff": "Non-teaching staff appraisal",
  "reviewer-response": "Reviewer-group response summary",
  "pending-overdue": "Pending and overdue reviews",
  "category-scores": "Category-wise scores",
  "development-goals": "Development goals",
  history: "Appraisal history",
  "approval-status": "Approval and finalization status",
  custom: "Custom report",
};

export const groupLabel = (group: string) => REVIEWER_GROUP_LABEL[group] ?? group;
export const categoryLabel = (category: string) => EMPLOYEE_CATEGORY_LABEL[category] ?? category;
export const options = <T extends string>(labels: Record<T, string>): Option<T>[] => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export function StatusBadge({ map, value, className }: { map: Record<string, { label: string; variant: BadgeVariant }>; value: string; className?: string }) {
  const { t } = useTranslation(NS);
  const s = map[value] ?? { label: value, variant: "neutral" as BadgeVariant };
  return (
    <Badge variant={s.variant} dot className={className}>
      {t(s.label)}
    </Badge>
  );
}

// ── Formatting ──────────────────────────────────────────────────────────────

export const formatDate = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const formatDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
export const pct = (n?: number | null) => (n === null || n === undefined ? "—" : `${n.toFixed(1).replace(/\.0$/, "")}%`);
/** Scores are stored 0-100; with a scale maximum they are shown on that scale (68.75 on a 5-point scale is 3.4 / 5). */
export const score = (n?: number | null, max?: number) => {
  if (n === null || n === undefined) return "—";
  const shown = max ? (n / 100) * max : n;
  const text = shown.toFixed(1).replace(/\.0$/, "");
  return max ? `${text} / ${max}` : text;
};

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Review form rules ───────────────────────────────────────────────────────

const TEXT_TYPES: QuestionType[] = ["Comment", "Strengths", "ImprovementAreas", "Achievements", "NextGoals", "Suggestion"];
export const isTextQuestion = (q: Pick<FormQuestion, "type">) => TEXT_TYPES.includes(q.type);

/** Whether the answer says something the server would count (a rating, a choice, a yes/no, text, or an explicit not-applicable). */
export function isAnswered(q: FormQuestion, a: Answer | undefined): boolean {
  if (!a) return false;
  if (a.notApplicable) return q.allowNotApplicable;
  switch (q.type) {
    case "Rating":
      return typeof a.rating === "number";
    case "MultipleChoice":
      return Boolean(a.choice);
    case "YesNo":
      return typeof a.yesNo === "boolean";
    default:
      return Boolean(a.text?.trim());
  }
}

export interface FormProblems {
  /** Question id -> why it can't be submitted yet. */
  questions: Record<string, string>;
  /** The form as a whole (for example written comments are required but none were given). */
  form?: string;
}

/** The checks the form can do before submitting; the server repeats them and decides. */
export function validateReview(form: Pick<ReviewForm, "questions" | "scale" | "commentsRequired">, answers: Answer[]): FormProblems {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const problems: FormProblems = { questions: {} };
  const values = new Set(form.scale.map((s) => s.value));
  for (const q of form.questions) {
    const a = byId.get(q.id);
    if (a?.notApplicable && !q.allowNotApplicable) problems.questions[q.id] = "Not applicable isn't allowed for this question";
    else if (q.required && !isAnswered(q, a)) problems.questions[q.id] = "This question needs an answer";
    else if (q.type === "Rating" && typeof a?.rating === "number" && values.size > 0 && !values.has(a.rating)) problems.questions[q.id] = "Pick a value from the scale";
    else if (q.type === "MultipleChoice" && a?.choice && q.options && !q.options.some((o) => o.value === a.choice)) problems.questions[q.id] = "Pick one of the listed choices";
  }
  if (form.commentsRequired && !answers.some((a) => a.text?.trim())) problems.form = "Please add at least one written comment";
  return problems;
}

export const hasProblems = (p: FormProblems) => Object.keys(p.questions).length > 0 || Boolean(p.form);

export function answeredCount(form: Pick<ReviewForm, "questions">, answers: Answer[]): { answered: number; total: number } {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  return { answered: form.questions.filter((q) => isAnswered(q, byId.get(q.id))).length, total: form.questions.length };
}

/** Replaces (or adds) one answer, dropping fields that no longer apply, e.g. a rating once "not applicable" is chosen. */
export function setAnswer(answers: Answer[], next: Answer): Answer[] {
  const rest = answers.filter((a) => a.questionId !== next.questionId);
  const empty = next.rating == null && !next.notApplicable && !next.choice && next.yesNo == null && !next.text?.trim();
  return empty ? rest : [...rest, next];
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function toastApiError(error: unknown) {
  const message = extractApiErrorMessage(error);
  toast.error(message, { id: `ap-${message}` });
}

/** A mutation that refreshes the module's queries, says what happened, and reports a server refusal in plain words. */
export function useApiMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { success?: string | ((r: TResult) => string); invalidate?: QueryKey[]; onSuccess?: (r: TResult) => void } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      for (const key of opts.invalidate ?? [["appraisal"]]) queryClient.invalidateQueries({ queryKey: key });
      const message = typeof opts.success === "function" ? opts.success(result) : opts.success;
      if (message) toast.success(message);
      opts.onSuccess?.(result);
    },
    onError: toastApiError,
  });
}

// ── Controls ────────────────────────────────────────────────────────────────

export function SelectField<T extends string>({
  id,
  value,
  onChange,
  items,
  placeholder,
  allLabel,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: T | undefined | null;
  onChange: (value: T | undefined) => void;
  items: Option<T>[];
  placeholder?: string;
  /** Adds a leading "all" choice that clears the value (for filters). */
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const { t } = useTranslation(NS);
  return (
    <Select value={value ?? (allLabel ? ALL : undefined)} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder ?? t("Select")} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
