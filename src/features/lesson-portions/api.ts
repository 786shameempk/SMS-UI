import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  AdminDashboard,
  AuditEntry,
  BulkProgressValues,
  CalendarDay,
  Capacity,
  CatchUpPlan,
  Chapter,
  ChapterValues,
  CorrectionValues,
  Curriculum,
  CurriculumValues,
  DelayedSubject,
  ExamCoverage,
  ExamPortionInput,
  ExamPortionSet,
  FamilyOverview,
  HistoryEntry,
  ImportResult,
  ImportRow,
  LessonPlan,
  LessonPlanFilters,
  LessonPlanValues,
  NotificationPreferences,
  Paged,
  PendingChapter,
  PendingUpdate,
  PortionFilters,
  PortionSettings,
  ProgressTopic,
  ProgressUpdateValues,
  RescheduleValues,
  Resource,
  ResourceValues,
  SectionSyllabus,
  SubjectDrillDown,
  SubjectStatus,
  SyllabusDetail,
  SyllabusStatus,
  SyllabusSummary,
  SyllabusValues,
  TeacherDashboard,
  TeacherProgress,
  TeachingClass,
  Topic,
  TopicValues,
} from "./types";

const BASE = "api/portions";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const get = <T>(path: string, params?: object) => unwrap(academicHttpClient.get<T>(`${BASE}/${path}`, { params: clean(params) }));
const post = <T>(path: string, body?: unknown) => unwrap(academicHttpClient.post<T>(`${BASE}/${path}`, body ?? {}));
const put = <T>(path: string, body: unknown) => unwrap(academicHttpClient.put<T>(`${BASE}/${path}`, body));
const del = (path: string) => unwrap(academicHttpClient.delete(`${BASE}/${path}`)).then(() => undefined);

/** Drops empty filters so they don't reach the server as "undefined" / empty strings. */
function clean(params?: object): Record<string, unknown> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

// ── Curricula ───────────────────────────────────────────────────────────────

export const listCurricula = () => get<Curriculum[]>("curricula");
export const createCurriculum = (v: CurriculumValues) => post<Curriculum>("curricula", v);
export const updateCurriculum = (id: string, v: CurriculumValues) => put<Curriculum>(`curricula/${id}`, v);
export const deleteCurriculum = (id: string) => del(`curricula/${id}`);

// ── Syllabi ─────────────────────────────────────────────────────────────────

export interface SyllabusFilters {
  academicYearId?: string;
  classId?: string;
  subjectId?: string;
  curriculumId?: string;
  status?: SyllabusStatus;
  templates?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const listSyllabi = (f: SyllabusFilters = {}) => get<Paged<SyllabusSummary>>("syllabi", f);
export const getSyllabus = (id: string) => get<SyllabusDetail>(`syllabi/${id}`);
export const createSyllabus = (v: SyllabusValues) => post<SyllabusSummary>("syllabi", v);
export const updateSyllabus = (id: string, v: SyllabusValues) => put<SyllabusSummary>(`syllabi/${id}`, v);
export const deleteSyllabus = (id: string) => del(`syllabi/${id}`);
export const publishSyllabus = (id: string) => post<SyllabusSummary>(`syllabi/${id}/publish`);
export const archiveSyllabus = (id: string) => post<SyllabusSummary>(`syllabi/${id}/archive`);
export const newSyllabusVersion = (id: string) => post<SyllabusSummary>(`syllabi/${id}/new-version`);
export const saveSyllabusAsTemplate = (id: string, name: string) => post<SyllabusSummary>(`syllabi/${id}/save-as-template`, { name });
export const syllabusFromTemplate = (v: { templateId: string; academicYearId: string; classIds: string[]; startDate?: string | null; completionDeadline?: string | null }) =>
  post<SyllabusSummary[]>("syllabi/from-template", v);
export const importSyllabus = (id: string, rows: ImportRow[], replaceExisting: boolean) => post<ImportResult>(`syllabi/${id}/import`, { rows, replaceExisting });

export const addChapter = (planId: string, v: ChapterValues) => post<Chapter>(`syllabi/${planId}/chapters`, v);
export const updateChapter = (id: string, v: ChapterValues) => put<Chapter>(`chapters/${id}`, v);
export const deleteChapter = (id: string) => del(`chapters/${id}`);
export const reorderChapters = (planId: string, orderedIds: string[]) => post<void>(`syllabi/${planId}/chapters/reorder`, { orderedIds });
export const addTopic = (chapterId: string, v: TopicValues) => post<Topic>(`chapters/${chapterId}/topics`, v);
export const updateTopic = (id: string, v: TopicValues) => put<Topic>(`topics/${id}`, v);
export const deleteTopic = (id: string) => del(`topics/${id}`);
export const reorderTopics = (chapterId: string, orderedIds: string[]) => post<void>(`chapters/${chapterId}/topics/reorder`, { orderedIds });

// ── Resources ───────────────────────────────────────────────────────────────

export interface ResourceFilters {
  syllabusPlanId?: string;
  chapterId?: string;
  topicId?: string;
  lessonPlanId?: string;
  search?: string;
}

export const listResources = (f: ResourceFilters = {}) => get<Resource[]>("resources", f);
export const createResource = (v: ResourceValues) => post<Resource>("resources", v);
export const updateResource = (id: string, v: ResourceValues) => put<Resource>(`resources/${id}`, v);
export const deleteResource = (id: string) => del(`resources/${id}`);

// ── Lesson plans ────────────────────────────────────────────────────────────

export const listLessonPlans = (f: LessonPlanFilters = {}) => get<Paged<LessonPlan>>("lesson-plans", f);
export const getLessonPlan = (id: string) => get<LessonPlan>(`lesson-plans/${id}`);
export const createLessonPlan = (v: LessonPlanValues) => post<LessonPlan>("lesson-plans", v);
export const updateLessonPlan = (id: string, v: LessonPlanValues) => put<LessonPlan>(`lesson-plans/${id}`, v);
export const deleteLessonPlan = (id: string) => del(`lesson-plans/${id}`);
export const submitLessonPlan = (id: string, rowVersion?: string | null, comment?: string) => post<LessonPlan>(`lesson-plans/${id}/submit`, { comment, rowVersion });
export const approveLessonPlan = (id: string, comment?: string, rowVersion?: string | null) => post<LessonPlan>(`lesson-plans/${id}/approve`, { comment, rowVersion });
export const rejectLessonPlan = (id: string, comment: string, rowVersion?: string | null) => post<LessonPlan>(`lesson-plans/${id}/reject`, { comment, rowVersion });
export const requestPlanRevision = (id: string, comment: string, rowVersion?: string | null) => post<LessonPlan>(`lesson-plans/${id}/request-revision`, { comment, rowVersion });
export const rescheduleLessonPlan = (id: string, v: RescheduleValues) => post<LessonPlan>(`lesson-plans/${id}/reschedule`, v);
export const lessonPlanHistory = (id: string) => get<AuditEntry[]>(`lesson-plans/${id}/history`);
export const pendingApprovals = () => get<LessonPlan[]>("lesson-plans/pending-approval");
export const pendingUpdates = (staffId?: string) => get<PendingUpdate[]>("lesson-plans/pending-updates", { staffId });
export const planCalendar = (from: string, to: string, f: Pick<PortionFilters, "classId" | "sectionId" | "subjectId" | "staffId"> = {}) =>
  get<CalendarDay[]>("lesson-plans/calendar", { from, to, ...f });
export const planCapacity = (p: { sectionId: string; subjectId: string; from: string; to: string; requiredPeriods: number }) => get<Capacity>("lesson-plans/capacity", p);

// ── Teaching progress ───────────────────────────────────────────────────────

export const myTeachingClasses = () => get<TeachingClass[]>("progress/my-classes");
export const sectionSyllabus = (planId: string, sectionId: string) => get<SectionSyllabus>(`progress/syllabus/${planId}/sections/${sectionId}`);
export const updateProgress = (v: ProgressUpdateValues) => put<ProgressTopic>("progress", v);
export const bulkProgress = (v: BulkProgressValues) => post<{ updated: number }>("progress/bulk", v);
export const correctProgress = (id: string, v: CorrectionValues) => post<ProgressTopic>(`progress/${id}/correct`, v);
export const progressHistory = (id: string) => get<HistoryEntry[]>(`progress/${id}/history`);

// ── Dashboards & reports ────────────────────────────────────────────────────

export const teacherDashboard = (f: PortionFilters = {}) => get<TeacherDashboard>("dashboard/teacher", f);
export const adminDashboard = (f: PortionFilters = {}) => get<AdminDashboard>("dashboard/admin", f);
export const completionReport = (f: PortionFilters = {}) => get<SubjectStatus[]>("reports/completion", f);
export const teacherReport = (f: PortionFilters = {}) => get<TeacherProgress[]>("reports/teachers", f);
export const pendingChaptersReport = (f: PortionFilters = {}) => get<PendingChapter[]>("reports/pending-chapters", f);
export const delayedReport = (f: PortionFilters = {}) => get<DelayedSubject[]>("reports/delayed", f);
export const subjectDrillDown = (planId: string, sectionId: string) => get<SubjectDrillDown>(`reports/subjects/${planId}/sections/${sectionId}`);
export const catchUpPlan = (planId: string, sectionId: string) => get<CatchUpPlan>("suggestions/catch-up", { planId, sectionId });
export const examCoverageReport = (classId?: string) => get<ExamCoverage[]>("reports/exam-coverage", { classId });

// ── Examination portions ────────────────────────────────────────────────────

export const getExamPortions = (examId: string) => get<ExamPortionSet>(`exams/${examId}/portions`);
export const setExamPortions = (examId: string, portions: ExamPortionInput[]) => put<ExamPortionSet>(`exams/${examId}/portions`, { portions });
export const publishExamPortions = (examId: string) => post<ExamPortionSet>(`exams/${examId}/portions/publish`);
export const unpublishExamPortions = (examId: string) => post<ExamPortionSet>(`exams/${examId}/portions/unpublish`);
export const examCoverage = (examId: string) => get<ExamCoverage[]>(`exams/${examId}/coverage`);
export const examRevisionPlan = (examId: string, subjectId: string, sectionId?: string) => get<CatchUpPlan>(`exams/${examId}/revision-plan`, { subjectId, sectionId });

// ── Settings ────────────────────────────────────────────────────────────────

export const getPortionSettings = () => get<PortionSettings>("settings");
export const savePortionSettings = (v: PortionSettings) => put<PortionSettings>("settings", v);
export const getNotificationPreferences = () => get<NotificationPreferences>("settings/notification-preferences");
export const saveNotificationPreferences = (mutedTypes: string[]) => put<NotificationPreferences>("settings/notification-preferences", { mutedTypes });
export const listAudit = (f: { entityType?: string; entityId?: string; page?: number; pageSize?: number } = {}) => get<Paged<AuditEntry>>("settings/audit", f);

// ── Parent & student ────────────────────────────────────────────────────────

export const familyOverview = (studentId?: string) => get<FamilyOverview[]>("family/overview", { studentId });
