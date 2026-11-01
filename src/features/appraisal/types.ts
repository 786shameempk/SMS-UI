// Contract: AcademicService/docs/APPRAISAL.md. Every enum is a JSON string.

export type QuestionType = "Rating" | "MultipleChoice" | "YesNo" | "Comment" | "Strengths" | "ImprovementAreas" | "Achievements" | "NextGoals" | "Suggestion";
export type CycleStatus = "Draft" | "Configured" | "Published" | "InProgress" | "PendingReviews" | "UnderApproval" | "Finalized" | "Closed" | "Cancelled";
export type ParticipantStatus = "Selected" | "Collecting" | "Incomplete" | "ReadyForApproval" | "UnderApproval" | "Returned" | "Finalized" | "Withdrawn";
export type AssignmentStatus = "Pending" | "Draft" | "Submitted" | "Reopened" | "Cancelled";
export type GoalStatus = "Proposed" | "Agreed" | "InProgress" | "Achieved" | "Dropped";
export type ScoringMode = "numeric" | "qualitative";
export type ApprovalStageKey = "manager" | "department_head" | "principal" | "hr_finalize";
export type CriterionAudience = "all" | "teaching" | "non_teaching";

/** Reviewer groups; a school can add its own names (assigned by hand only). */
export type ReviewerGroup = string;
export type EmployeeCategory = string;

export interface CategoryRule {
  category: EmployeeCategory;
  included: boolean;
  required: boolean;
  frequency: string;
  selfAssessment: boolean;
  templateId?: string | null;
  employeeTypes?: string[];
}

export interface ReviewerRule {
  category: EmployeeCategory;
  group: ReviewerGroup;
  enabled: boolean;
  mandatory: boolean;
  minReviews: number;
  maxReviews: number;
  weight: number;
  anonymous: boolean;
  commentsRequired: boolean;
  deadlineOffsetDays: number;
  canViewPrevious: boolean;
  canViewResults: boolean;
}

export interface ScaleLevel {
  value: number;
  label: string;
  description?: string;
}

export interface ApprovalStage {
  key: ApprovalStageKey;
  enabled: boolean;
}

export interface CycleConfig {
  reviewerRules: ReviewerRule[];
  scale: ScaleLevel[];
  stages: ApprovalStage[];
  minAnonymousResponses: number;
  roundingDecimals: number;
  studentFeedbackScope: "per_teacher" | "per_subject";
  parentFeedbackScope: "per_teacher" | "per_child";
  allowMultipleGuardians: boolean;
  studentClassIds: string[];
  allowSelfApproval: boolean;
  allowResubmission: boolean;
  employeeSeesResults: boolean;
  employeeSeesComments: boolean;
  scoringMode: ScoringMode;
}

export interface Settings {
  categoryRules: CategoryRule[];
  reviewerRules: ReviewerRule[];
  scale: ScaleLevel[];
  stages: ApprovalStage[];
  custom: { employeeCategories?: string[]; reviewerGroups?: string[] };
  minAnonymousResponses: number;
  roundingDecimals: number;
  studentFeedbackScope: "per_teacher" | "per_subject";
  parentFeedbackScope: "per_teacher" | "per_child";
  allowMultipleGuardians: boolean;
  studentClassIds: string[];
  allowSelfApproval: boolean;
  allowResubmission: boolean;
  employeeSeesResults: boolean;
  employeeSeesComments: boolean;
  notifyAssignments: boolean;
  notifyDeadlines: boolean;
  notifyApprovals: boolean;
  notifyFinalized: boolean;
  retentionYears: number;
  rowVersion?: string;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  actorUserId?: string | null;
  at: string;
  details?: string | null;
}

// ── Question bank ───────────────────────────────────────────────────────────

export interface Criterion {
  id: string;
  name: string;
  description?: string | null;
  audience: CriterionAudience;
  weight: number;
  displayOrder: number;
  isActive: boolean;
  questionCount: number;
  rowVersion?: string;
}

export type CriterionValues = Omit<Criterion, "id" | "questionCount">;

export interface QuestionOption {
  value: string;
  label: string;
  score?: number | null;
}

export interface Question {
  id: string;
  criterionId: string;
  text: string;
  description?: string | null;
  type: QuestionType;
  required: boolean;
  scored: boolean;
  weight: number;
  allowNotApplicable: boolean;
  allowComment: boolean;
  employeeCategories: EmployeeCategory[];
  reviewerGroups: ReviewerGroup[];
  options: QuestionOption[];
  translations: Record<string, string>;
  displayOrder: number;
  isActive: boolean;
  confidential: boolean;
  rowVersion?: string;
}

export type QuestionValues = Omit<Question, "id">;

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  employeeCategories: EmployeeCategory[];
  questionIds: string[];
  latestVersion: number;
  isActive: boolean;
  scoringMode: ScoringMode;
  rowVersion?: string;
}

export type TemplateValues = Omit<Template, "id" | "latestVersion">;

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNo: number;
  createdAt?: string;
  scoringMode?: ScoringMode;
  snapshot?: { criteria: unknown[]; questions: unknown[]; scoringMode: ScoringMode };
}

// ── Cycles ──────────────────────────────────────────────────────────────────

export interface CycleSummary {
  id: string;
  name: string;
  academicYearId?: string | null;
  status: CycleStatus;
  appraisalType?: string | null;
  startDate: string;
  endDate: string;
  evaluationPeriod?: string | null;
  submissionDeadline?: string | null;
  participantCount?: number;
  scoringMode?: ScoringMode;
  rowVersion?: string;
}

export interface CycleDetail {
  summary: CycleSummary;
  templateVersionId?: string | null;
  templateName?: string | null;
  templateVersionNo?: number | null;
  eligibleDepartmentIds: string[];
  eligibleCategories: EmployeeCategory[];
  reviewOpenDate?: string | null;
  submissionDeadline?: string | null;
  managerDeadline?: string | null;
  approvalDeadline?: string | null;
  finalizationDate?: string | null;
  allowDuplicateParticipants: boolean;
  config: CycleConfig;
  frozen: boolean;
  retainUntil?: string | null;
}

export interface CycleValues {
  name: string;
  academicYearId?: string | null;
  startDate: string;
  endDate: string;
  evaluationPeriod: string;
  appraisalType: string;
  templateVersionId: string;
  eligibleDepartmentIds: string[];
  eligibleCategories: EmployeeCategory[];
  reviewOpenDate?: string | null;
  submissionDeadline?: string | null;
  managerDeadline?: string | null;
  approvalDeadline?: string | null;
  finalizationDate?: string | null;
  allowDuplicateParticipants: boolean;
  config?: CycleConfig;
  rowVersion?: string;
}

export interface CyclePreview {
  participants: number;
  questionCount: number;
  groups: { group: ReviewerGroup; assignments: number; participants: number; mandatory: boolean; minReviews: number }[];
  warnings: string[];
  blockers: string[];
}

export interface EligibleEmployee {
  staffId: string;
  name: string;
  employeeId: string;
  designation: string;
  category: EmployeeCategory;
  departmentId?: string | null;
  department?: string | null;
  hasLogin: boolean;
  alreadyInCycle: boolean;
  inAnotherCycle: boolean;
}

export interface Participant {
  id: string;
  cycleId: string;
  staffId: string;
  name: string;
  employeeId: string;
  category: EmployeeCategory;
  department?: string | null;
  status: ParticipantStatus;
  stageIndex: number;
  currentStage?: string | null;
  scoreComplete: boolean;
  scoreStatusNote?: string | null;
  assignmentsTotal: number;
  assignmentsSubmitted: number;
  assignmentsOverdue: number;
  releasedToEmployee: boolean;
  finalizedAt?: string | null;
  /** The calculated 0-100 overall score; only present once the score is complete and the caller may see scores. */
  overallScore?: number | null;
}

export interface ParticipantSelection {
  staffIds?: string[];
  departmentIds?: string[];
  allEligible?: boolean;
  categoryOverrides?: Record<string, EmployeeCategory>;
}

export interface Assignment {
  id: string;
  participantId: string;
  reviewerGroup: ReviewerGroup;
  reviewerName?: string | null;
  contextLabel?: string | null;
  source: "Automatic" | "Manual";
  status: AssignmentStatus;
  anonymous: boolean;
  deadline?: string | null;
  submittedAt?: string | null;
}

export interface ManualAssignment {
  participantId: string;
  reviewerGroup: ReviewerGroup;
  reviewerStaffId?: string;
  contextLabel?: string;
}

export interface GenerateResult {
  created: number;
  skipped: number;
  notes: string[];
}

export interface RosterEntry {
  assignmentId: string;
  reviewerGroup: ReviewerGroup;
  reviewerName: string;
  status: AssignmentStatus;
  submittedAt?: string | null;
}

// ── Results & approval ──────────────────────────────────────────────────────

export interface GroupResult {
  group: ReviewerGroup;
  status: string;
  reviews?: number;
  submitted?: number;
  score?: number | null;
  configuredWeight?: number;
  appliedWeight?: number | null;
}

export interface CategoryResult {
  category?: string;
  name?: string;
  score?: number | null;
}

export interface ResultComment {
  reviewerGroup: ReviewerGroup;
  question: string;
  text: string;
  reviewer?: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  targetDate?: string | null;
  status: GoalStatus;
  source?: string | null;
  followUpNote?: string | null;
}

export type GoalValues = Pick<Goal, "title" | "description" | "targetDate" | "status" | "source" | "followUpNote">;

export interface ApprovalEntry {
  id: string;
  stage: string;
  decision: "Approved" | "Returned" | "Rejected" | "Finalized" | "Reopened";
  actorName: string;
  comment?: string | null;
  at: string;
}

export interface AppraisalResult {
  participantId: string;
  name: string;
  category: EmployeeCategory;
  department?: string | null;
  cycleName: string;
  status: ParticipantStatus;
  overallScore?: number | null;
  scoreComplete: boolean;
  scoreStatusNote?: string | null;
  scoredAt?: string | null;
  groups?: GroupResult[] | null;
  categories?: CategoryResult[] | null;
  comments?: ResultComment[] | null;
  scoresVisible: boolean;
  commentsVisible: boolean;
  finalRemarks?: string | null;
  goals: Goal[];
  history: ApprovalEntry[];
  scaleMax: number;
  scoringMode: ScoringMode;
  /** True once every approval stage has passed, so only finalizing is left. */
  atFinalizeStep?: boolean;
}

export interface MyAppraisal {
  participantId: string;
  cycleId: string;
  cycleName: string;
  status: ParticipantStatus;
  resultsReleased: boolean;
  overallScore?: number | null;
  finalizedAt?: string | null;
}

// ── Reviewer's side ─────────────────────────────────────────────────────────

export interface MyAssignment {
  id: string;
  cycleId: string;
  cycleName: string;
  reviewerGroup: ReviewerGroup;
  appraisee: string;
  context?: string | null;
  status: AssignmentStatus;
  deadline?: string | null;
  overdue: boolean;
  canEdit: boolean;
}

export interface FormQuestion {
  id: string;
  /** The section title: the server sends criterionName. */
  criterionName?: string | null;
  criterion?: string | null;
  text: string;
  description?: string | null;
  type: QuestionType;
  required: boolean;
  allowNotApplicable: boolean;
  allowComment: boolean;
  options?: QuestionOption[];
}

export interface Answer {
  questionId: string;
  rating?: number | null;
  notApplicable?: boolean;
  choice?: string | null;
  yesNo?: boolean | null;
  text?: string | null;
}

export interface ReviewForm {
  assignmentId: string;
  cycleName: string;
  reviewerGroup: ReviewerGroup;
  appraisee: string;
  context?: string | null;
  deadline?: string | null;
  anonymous: boolean;
  commentsRequired: boolean;
  canEdit: boolean;
  scale: ScaleLevel[];
  questions: FormQuestion[];
  draft: Answer[];
  allowResubmission: boolean;
}

// ── Dashboard & reports ─────────────────────────────────────────────────────

export interface Breakdown {
  key?: string;
  name?: string;
  label?: string;
  assigned?: number;
  completed?: number;
  /** What the server sends for each row: total assignments and how many are done. */
  total?: number;
  done?: number;
  pending?: number;
  overdue?: number;
  percent?: number;
  completion?: number;
  hidden?: boolean;
  [field: string]: unknown;
}

export interface DashboardData {
  /** What the server sends for the headline counts. */
  eligibleEmployees?: number;
  reviewsAssigned?: number;
  reviewsCompleted?: number;
  reviewsPending?: number;
  reviewsOverdue?: number;
  eligible?: number;
  participants?: number;
  assigned?: number;
  completed?: number;
  pending?: number;
  overdue?: number;
  completionPercent?: number;
  awaitingApproval?: number;
  finalized?: number;
  needsFollowUp?: number;
  byDepartment?: Breakdown[];
  byCategory?: Breakdown[];
  byReviewerGroup?: Breakdown[];
  /** People whose overall score is complete, their average (0-100) and how they spread across score bands. Absent when the caller may not see scores. */
  scored?: number;
  averageScore?: number | null;
  scoreBands?: Breakdown[] | null;
  [field: string]: unknown;
}

export interface DashboardFilters {
  cycleId?: string;
  departmentId?: string;
  category?: string;
}

export interface Report {
  key: string;
  title: string;
  generatedAt: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | boolean | null>[];
  notes: string[];
}

export interface ReportFilters {
  cycleId?: string;
  departmentId?: string;
  category?: string;
  from?: string;
  to?: string;
  columns?: string;
}

export interface ModerationValues {
  hide: boolean;
  note: string;
}

export interface CommentReview {
  reviewId: string;
  reviewerGroup: ReviewerGroup;
  hidden: boolean;
  comments: { question: string; text: string }[];
  note?: string | null;
}
