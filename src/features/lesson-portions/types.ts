// Types for AcademicService's /api/portions endpoints (Lesson / Portion Management). Enums are the API's own PascalCase strings
// (the server serialises them by name), dates are "yyyy-mm-dd" and `rowVersion` is the opaque concurrency token to send back on edits.

export type CurriculumBoard = "Cbse" | "Icse" | "KeralaState" | "InternationalBaccalaureate" | "Cambridge" | "Other";
export type SyllabusStatus = "Draft" | "Published" | "Archived";
export type ProgressStatus = "NotStarted" | "InProgress" | "Completed" | "Delayed";
export type ChapterStatus = "NotStarted" | "InProgress" | "Delayed" | "Completed";
export type PortionRisk = "OnTrack" | "AtRisk" | "Behind" | "Overdue" | "Complete";
export type LessonPlanType = "Weekly" | "Monthly" | "TermWise" | "Annual";
export type ApprovalStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "RevisionRequested";
export type ApprovalAction = "Submitted" | "Approved" | "Rejected" | "RevisionRequested" | "Revised";
export type ResourceKind = "Textbook" | "Reference" | "Notes" | "Presentation" | "Worksheet" | "Link" | "Other";
export type CompletionMode = "Periods" | "Topics" | "Chapters" | "Weighted";

export interface Paged<T> {
  items: T[];
  totalCount: number;
}

// ── Curriculum & syllabus ───────────────────────────────────────────────────

export interface Curriculum {
  id: string;
  name: string;
  board: CurriculumBoard;
  description?: string | null;
  isActive: boolean;
  syllabusCount: number;
  rowVersion?: string | null;
}

export interface CurriculumValues {
  name: string;
  board: CurriculumBoard;
  description?: string;
  isActive: boolean;
  rowVersion?: string | null;
}

export interface SyllabusSummary {
  id: string;
  curriculumId: string;
  curriculumName: string;
  academicYearId?: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  version: number;
  title: string;
  status: SyllabusStatus;
  startDate?: string | null;
  completionDeadline?: string | null;
  isTemplate: boolean;
  templateName?: string | null;
  chapterCount: number;
  topicCount: number;
  plannedPeriods: number;
  rowVersion?: string | null;
}

export interface SyllabusValues {
  curriculumId: string;
  academicYearId?: string | null;
  classId: string;
  subjectId: string;
  title: string;
  startDate?: string | null;
  completionDeadline?: string | null;
  textbooks?: string;
  referenceMaterials?: string;
  learningObjectives?: string;
  isTemplate?: boolean;
  templateName?: string;
  rowVersion?: string | null;
}

export interface Topic {
  id: string;
  chapterId: string;
  parentTopicId?: string | null;
  sequence: number;
  title: string;
  plannedPeriods: number;
  weight: number;
  learningObjectives?: string | null;
  rowVersion?: string | null;
}

export interface Chapter {
  id: string;
  sequence: number;
  title: string;
  code?: string | null;
  plannedPeriods: number;
  weight: number;
  termId?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  learningObjectives?: string | null;
  rowVersion?: string | null;
  topics: Topic[];
}

export interface SyllabusDetail {
  summary: SyllabusSummary;
  textbooks?: string | null;
  referenceMaterials?: string | null;
  learningObjectives?: string | null;
  chapters: Chapter[];
  resources: Resource[];
}

export interface ChapterValues {
  title: string;
  code?: string;
  plannedPeriods: number;
  weight: number;
  termId?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  learningObjectives?: string;
  rowVersion?: string | null;
}

export interface TopicValues {
  title: string;
  parentTopicId?: string | null;
  plannedPeriods: number;
  weight: number;
  learningObjectives?: string;
  rowVersion?: string | null;
}

export interface ImportRow {
  chapter: string;
  topic?: string;
  subtopic?: string;
  periods?: number;
  deadline?: string;
  objectives?: string;
}

export interface ImportResult {
  chaptersCreated: number;
  topicsCreated: number;
  warnings: string[];
}

export interface Resource {
  id: string;
  syllabusPlanId?: string | null;
  syllabusChapterId?: string | null;
  syllabusTopicId?: string | null;
  lessonPlanId?: string | null;
  kind: ResourceKind;
  title: string;
  url?: string | null;
  studyMaterialId?: string | null;
  note?: string | null;
  visibleToFamilies: boolean;
  rowVersion?: string | null;
}

export interface ResourceValues {
  syllabusPlanId?: string | null;
  syllabusChapterId?: string | null;
  syllabusTopicId?: string | null;
  lessonPlanId?: string | null;
  kind: ResourceKind;
  title: string;
  url?: string;
  studyMaterialId?: string | null;
  note?: string;
  visibleToFamilies: boolean;
  rowVersion?: string | null;
}

// ── Lesson plans ────────────────────────────────────────────────────────────

export interface LessonPlanTopic {
  id: string;
  syllabusTopicId: string;
  topicTitle: string;
  chapterTitle: string;
  sequence: number;
  plannedDate?: string | null;
  plannedPeriods: number;
}

export interface ApprovalEntry {
  id: string;
  action: ApprovalAction;
  actorUserId?: string | null;
  comment?: string | null;
  at: string;
  revision: number;
}

export interface LessonPlan {
  id: string;
  staffId: string;
  teacherName?: string | null;
  classId: string;
  className: string;
  sectionId?: string | null;
  sectionName?: string | null;
  subjectId: string;
  subjectName: string;
  academicYearId?: string | null;
  termId?: string | null;
  syllabusPlanId?: string | null;
  title: string;
  description: string;
  planType: LessonPlanType;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  allocatedPeriods: number;
  approvalStatus: ApprovalStatus;
  revision: number;
  isAiGenerated: boolean;
  topicCount: number;
  rowVersion?: string | null;
  topics?: LessonPlanTopic[] | null;
  history?: ApprovalEntry[] | null;
}

export interface LessonPlanTopicInput {
  syllabusTopicId: string;
  plannedDate?: string | null;
  plannedPeriods: number;
}

export interface LessonPlanValues {
  staffId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  academicYearId?: string | null;
  termId?: string | null;
  syllabusPlanId?: string | null;
  title: string;
  description: string;
  planType: LessonPlanType;
  plannedStartDate: string;
  plannedEndDate: string;
  allocatedPeriods: number;
  topics: LessonPlanTopicInput[];
  isAiGenerated?: boolean;
  changeNote?: string;
  rowVersion?: string | null;
}

export interface LessonPlanFilters {
  academicYearId?: string;
  termId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  staffId?: string;
  status?: ApprovalStatus;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CalendarLesson {
  lessonPlanId: string;
  lessonPlanTopicId: string;
  syllabusTopicId: string;
  date: string;
  topicTitle: string;
  chapterTitle: string;
  plannedPeriods: number;
  subjectName: string;
  className: string;
  sectionName?: string | null;
  teacherName?: string | null;
  status: ProgressStatus;
}

export interface CalendarDay {
  date: string;
  noTeachingReason?: string | null;
  lessons: CalendarLesson[];
}

export interface Capacity {
  availablePeriods: number;
  requiredPeriods: number;
  realistic: boolean;
  periodsPerWeek: number;
  noTeachingDays: string[];
}

export interface RescheduleValues {
  topics: LessonPlanTopicInput[];
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  reason: string;
  rowVersion?: string | null;
}

// ── Teaching progress ───────────────────────────────────────────────────────

export interface ProgressTopic {
  topicId: string;
  chapterId: string;
  parentTopicId?: string | null;
  title: string;
  sequence: number;
  plannedPeriods: number;
  status: ProgressStatus;
  progressId?: string | null;
  taughtOn?: string | null;
  periodsUsed: number;
  notes?: string | null;
  homework?: string | null;
  observations?: string | null;
  delayReason?: string | null;
  nextLessonDate?: string | null;
  rowVersion?: string | null;
  plannedDate?: string | null;
}

export interface ProgressChapter {
  chapterId: string;
  sequence: number;
  title: string;
  deadline?: string | null;
  status: ChapterStatus;
  percent: number;
  overdue: boolean;
  topics: ProgressTopic[];
}

export interface ChapterResult {
  chapterId: string;
  status: ChapterStatus;
  totalTopics: number;
  completedTopics: number;
  percent: number;
  plannedPeriods: number;
  remainingPeriods: number;
  overdue: boolean;
}

export interface Completion {
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  delayedChapters: number;
  pendingChapters: number;
  totalTopics: number;
  completedTopics: number;
  plannedPeriods: number;
  remainingPeriods: number;
  chapterPercent: number;
  topicPercent: number;
  periodPercent: number;
  weightedPercent: number;
  percent: number;
  chapters: ChapterResult[];
}

export interface SectionSyllabus {
  syllabusPlanId: string;
  syllabusTitle: string;
  sectionId: string;
  className: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  syllabusStatus: SyllabusStatus;
  canUpdate: boolean;
  completion: Completion;
  plannedPercent?: number | null;
  chapters: ProgressChapter[];
}

export interface TeachingClass {
  syllabusPlanId: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  syllabusTitle: string;
  percent: number;
  plannedPercent?: number | null;
  risk: PortionRisk;
  lastUpdatedOn?: string | null;
  pendingUpdates: number;
}

export interface ProgressUpdateValues {
  sectionId: string;
  syllabusTopicId: string;
  status: ProgressStatus;
  taughtOn?: string | null;
  periodsUsed: number;
  notes?: string;
  homework?: string;
  observations?: string;
  delayReason?: string;
  nextLessonDate?: string | null;
  lessonPlanId?: string | null;
  rowVersion?: string | null;
}

export interface BulkProgressValues {
  sectionId: string;
  topicIds: string[];
  status: ProgressStatus;
  taughtOn?: string | null;
  periodsUsed: number;
}

export interface CorrectionValues {
  status: ProgressStatus;
  taughtOn?: string | null;
  periodsUsed: number;
  reason: string;
  rowVersion?: string | null;
}

export interface HistoryEntry {
  id: string;
  fromStatus?: ProgressStatus | null;
  toStatus: ProgressStatus;
  taughtOn?: string | null;
  periodsUsed: number;
  changedByUserId?: string | null;
  changedAt: string;
  reason?: string | null;
  isCorrection: boolean;
}

export interface PendingUpdate {
  lessonPlanId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  syllabusTopicId: string;
  topicTitle: string;
  plannedDate: string;
  daysLate: number;
}

// ── Analytics ───────────────────────────────────────────────────────────────

export interface PortionFilters {
  academicYearId?: string;
  termId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  staffId?: string;
  from?: string;
  to?: string;
}

export interface SubjectStatus {
  syllabusPlanId: string;
  syllabusTitle: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  staffId?: string | null;
  teacherName?: string | null;
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  pendingChapters: number;
  delayedChapters: number;
  totalTopics: number;
  completedTopics: number;
  percent: number;
  chapterPercent: number;
  plannedPercent?: number | null;
  variance?: number | null;
  risk: PortionRisk;
  deadline?: string | null;
  forecast?: string | null;
  remainingPeriods: number;
  availablePeriods?: number | null;
  lastUpdatedOn?: string | null;
}

export interface ClassProgress {
  classId: string;
  className: string;
  subjects: number;
  percent: number;
  plannedPercent?: number | null;
  behindCount: number;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  classes: number;
  percent: number;
  plannedPercent?: number | null;
  behindCount: number;
}

export interface TeacherProgress {
  staffId?: string | null;
  teacherName: string;
  assignments: number;
  percent: number;
  plannedPercent?: number | null;
  behindCount: number;
  topicsCompleted: number;
  topicsCompletedInRange: number;
  periodsUsed: number;
  lastUpdatedOn?: string | null;
  pendingUpdates: number;
}

export interface TrendPoint {
  weekStart: string;
  topicsCompleted: number;
  periodsUsed: number;
}

export interface UpcomingDeadline {
  syllabusPlanId: string;
  subjectName: string;
  className: string;
  chapterTitle: string;
  deadline: string;
  daysLeft: number;
  chapterPercent: number;
  sectionName?: string | null;
}

export interface TodayLesson {
  lessonPlanId: string;
  lessonPlanTopicId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  subjectName: string;
  topicTitle: string;
  chapterTitle: string;
  plannedPeriods: number;
  status: ProgressStatus;
}

export interface TeacherDashboard {
  today: TodayLesson[];
  pendingUpdates: PendingUpdate[];
  completedThisWeek: number;
  deadlines: UpcomingDeadline[];
  delayed: SubjectStatus[];
  subjects: SubjectStatus[];
  trend: TrendPoint[];
}

export interface SchoolSummary {
  subjects: number;
  chapters: number;
  topics: number;
  percent: number;
  plannedPercent?: number | null;
  behindCount: number;
  atRiskCount: number;
  overdueCount: number;
  completeCount: number;
}

export interface TermForecast {
  termId?: string | null;
  termName: string;
  endDate?: string | null;
  expectedPercent: number;
  onTrack: number;
  total: number;
  likelyIncomplete: number;
}

export interface AdminDashboard {
  summary: SchoolSummary;
  classes: ClassProgress[];
  subjects: SubjectProgress[];
  behind: SubjectStatus[];
  classesAtRisk: ClassProgress[];
  teachers: TeacherProgress[];
  trend: TrendPoint[];
  deadlines: UpcomingDeadline[];
  forecast: TermForecast[];
}

export interface PendingChapter {
  syllabusPlanId: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName?: string | null;
  chapterId: string;
  chapterTitle: string;
  deadline?: string | null;
  status: ChapterStatus;
  percent: number;
  pendingTopics: number;
  remainingPeriods: number;
  overdue: boolean;
}

export interface DelayedSubject {
  status: SubjectStatus;
  correctiveAction: string;
  pendingTopics: number;
  weeksLeft: number;
}

export interface PendingTopic {
  topicId: string;
  title: string;
  chapterTitle: string;
  status: ProgressStatus;
  plannedPeriods: number;
}

export interface CatchUpItem {
  topicId: string;
  topicTitle: string;
  chapterTitle: string;
  date: string;
  periods: number;
}

export interface CatchUpPlan {
  pendingTopics: number;
  pendingPeriods: number;
  availablePeriods: number;
  from?: string | null;
  to?: string | null;
  items: CatchUpItem[];
  unscheduled: string[];
  summary: string;
}

export interface SubjectDrillDown {
  status: SubjectStatus;
  chapters: PendingChapter[];
  pendingTopics: PendingTopic[];
  otherSections: SubjectStatus[];
  catchUp?: CatchUpPlan | null;
}

// ── Examination portions ────────────────────────────────────────────────────

export interface ExamPortion {
  id: string;
  subjectId: string;
  subjectName: string;
  syllabusChapterId: string;
  chapterTitle: string;
  syllabusTopicId?: string | null;
  topicTitle?: string | null;
  note?: string | null;
  isPublished: boolean;
}

export interface ExamPortionSet {
  examId: string;
  examName: string;
  classId: string;
  isPublished: boolean;
  publishedAt?: string | null;
  portions: ExamPortion[];
}

export interface ExamPortionInput {
  subjectId: string;
  syllabusChapterId: string;
  syllabusTopicId?: string | null;
  note?: string;
}

export interface UntaughtTopic {
  topicId: string;
  topicTitle: string;
  chapterTitle: string;
  sectionName?: string | null;
  status: ProgressStatus;
}

export interface ExamCoverage {
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  portionTopics: number;
  taughtTopics: number;
  coveragePercent: number;
  untaught: UntaughtTopic[];
  isPublished: boolean;
}

// ── Settings, notifications, audit ──────────────────────────────────────────

export interface PortionSettings {
  requirePlanApproval: boolean;
  familyViewEnabled: boolean;
  showHomeworkToFamilies: boolean;
  showExamSyllabusToFamilies: boolean;
  completionMode: CompletionMode;
  behindThresholdPercent: number;
  missingUpdateAfterDays: number;
  deadlineReminderDays: number;
  notifyDeadlines: boolean;
  notifyOverduePlans: boolean;
  notifyMissingUpdates: boolean;
  notifyBehindTarget: boolean;
  notifyRevisions: boolean;
  notifyApprovals: boolean;
  rowVersion?: string | null;
}

export interface NotificationPreferences {
  mutedTypes: string[];
  availableTypes: string[];
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  at: string;
  details?: string | null;
}

// ── Parent & student view ───────────────────────────────────────────────────

export interface FamilyTopic {
  id: string;
  title: string;
  status: ProgressStatus;
  homework?: string | null;
  taughtOn?: string | null;
  resources: Resource[];
}

export interface FamilyChapter {
  id: string;
  title: string;
  status: ChapterStatus;
  percent: number;
  topics: FamilyTopic[];
}

export interface FamilySubject {
  syllabusPlanId: string;
  subjectId: string;
  subjectName: string;
  percent: number;
  completedChapters: number;
  totalChapters: number;
  currentTopic?: string | null;
  upcomingTopics: string[];
  chapters: FamilyChapter[];
}

export interface FamilyExamSubject {
  subjectId: string;
  subjectName: string;
  chapters: string[];
  topics: string[];
}

export interface FamilyExam {
  examId: string;
  examName: string;
  startDate: string;
  endDate: string;
  subjects: FamilyExamSubject[];
}

export interface FamilyOverview {
  enabled: boolean;
  studentId: string;
  studentName: string;
  className: string;
  sectionName: string;
  subjects: FamilySubject[];
  exams: FamilyExam[];
}
