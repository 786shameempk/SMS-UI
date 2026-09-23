import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  AssignedHomeworkRow,
  DiscussionComment,
  DiscussionCommentFormValues,
  Homework,
  HomeworkFormValues,
  HomeworkStatus,
  HomeworkSubmission,
  LearningProgressRow,
  LearningResource,
  LearningResourceFormValues,
  Quiz,
  QuizAttempt,
  QuizFormValues,
  ResourceType,
  SubmissionStatus,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// AcademicService's enums serialize as PascalCase; SMS UI's types use lowercase/snake_case unions.

const HOMEWORK_STATUS_TO_API: Record<HomeworkStatus, string> = { draft: "Draft", published: "Published" };
const HOMEWORK_STATUS_FROM_API: Record<string, HomeworkStatus> = { Draft: "draft", Published: "published" };

const SUBMISSION_STATUS_FROM_API: Record<string, SubmissionStatus> = {
  NotSubmitted: "not_submitted",
  Submitted: "submitted",
  Graded: "graded",
  ResubmitRequested: "resubmit_requested",
};

const RESOURCE_TYPE_TO_API: Record<ResourceType, string> = {
  video: "Video",
  notes: "Notes",
  pdf: "Pdf",
  ppt: "Ppt",
  quiz: "Quiz",
  discussion: "Discussion",
};
const RESOURCE_TYPE_FROM_API: Record<string, ResourceType> = {
  Video: "video",
  Notes: "notes",
  Pdf: "pdf",
  Ppt: "ppt",
  Quiz: "quiz",
  Discussion: "discussion",
};

// ── API response shapes (AcademicService DTOs) ──────────────────────────────

interface ApiHomework {
  id: string;
  tenantId: string;
  branchId: string;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  sectionId: string | null;
  staffId: string;
  assignedDate: string;
  dueDate: string;
  attachmentNote: string | null;
  status: string;
}

interface ApiHomeworkSubmission {
  id: string;
  tenantId: string;
  branchId: string;
  homeworkId: string;
  studentId: string;
  submittedAt: string | null;
  content: string;
  status: string;
  grade: string | null;
  feedback: string | null;
}

interface ApiAssignedHomeworkRow {
  homework: ApiHomework;
  submission: ApiHomeworkSubmission;
}

interface ApiLearningResource {
  id: string;
  tenantId: string;
  branchId: string;
  subjectId: string;
  classId: string;
  title: string;
  type: string;
  url: string | null;
  description: string | null;
  createdByStaffId: string;
  quizId: string | null;
  createdAt: string;
}

interface ApiQuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

interface ApiQuiz {
  id: string;
  tenantId: string;
  branchId: string;
  subjectId: string;
  classId: string;
  title: string;
  questions: ApiQuizQuestion[];
}

interface ApiQuizAttempt {
  id: string;
  tenantId: string;
  branchId: string;
  quizId: string;
  studentId: string;
  score: number;
  submittedAt: string;
}

interface ApiDiscussionComment {
  id: string;
  tenantId: string;
  branchId: string;
  resourceId: string;
  authorName: string;
  authorRole: string;
  text: string;
  postedAt: string;
}

interface ApiLearningProgressRow {
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  homeworkAssignedCount: number;
  homeworkSubmittedOnTimeCount: number;
  homeworkSubmittedOnTimePct: number;
  resourceCount: number;
  resourceViewedCount: number;
  resourceViewedPct: number;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const mapHomework = (dto: ApiHomework): Homework => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  title: dto.title,
  description: dto.description,
  subjectId: dto.subjectId,
  classId: dto.classId,
  sectionId: dto.sectionId ?? undefined,
  staffId: dto.staffId,
  assignedDate: dto.assignedDate,
  dueDate: dto.dueDate,
  attachmentNote: dto.attachmentNote ?? undefined,
  status: HOMEWORK_STATUS_FROM_API[dto.status] ?? "draft",
});

const mapSubmission = (dto: ApiHomeworkSubmission): HomeworkSubmission => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  homeworkId: dto.homeworkId,
  studentId: dto.studentId,
  submittedAt: dto.submittedAt ?? undefined,
  content: dto.content,
  status: SUBMISSION_STATUS_FROM_API[dto.status] ?? "not_submitted",
  grade: dto.grade ?? undefined,
  feedback: dto.feedback ?? undefined,
});

const mapResource = (dto: ApiLearningResource): LearningResource => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  subjectId: dto.subjectId,
  classId: dto.classId,
  title: dto.title,
  type: RESOURCE_TYPE_FROM_API[dto.type] ?? "notes",
  url: dto.url ?? undefined,
  description: dto.description ?? undefined,
  createdByStaffId: dto.createdByStaffId,
  quizId: dto.quizId ?? undefined,
  createdAt: dto.createdAt,
});

const mapQuiz = (dto: ApiQuiz): Quiz => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  subjectId: dto.subjectId,
  classId: dto.classId,
  title: dto.title,
  questions: dto.questions.map((q) => ({ id: q.id, text: q.text, options: q.options, correctIndex: q.correctIndex })),
});

const mapAttempt = (dto: ApiQuizAttempt): QuizAttempt => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  quizId: dto.quizId,
  studentId: dto.studentId,
  score: dto.score,
  submittedAt: dto.submittedAt,
});

const mapComment = (dto: ApiDiscussionComment): DiscussionComment => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  resourceId: dto.resourceId,
  authorName: dto.authorName,
  authorRole: dto.authorRole,
  text: dto.text,
  postedAt: dto.postedAt,
});

const mapProgressRow = (dto: ApiLearningProgressRow): LearningProgressRow => ({
  studentId: dto.studentId,
  studentName: dto.studentName,
  className: dto.className,
  section: dto.section,
  homeworkAssignedCount: dto.homeworkAssignedCount,
  homeworkSubmittedOnTimeCount: dto.homeworkSubmittedOnTimeCount,
  homeworkSubmittedOnTimePct: dto.homeworkSubmittedOnTimePct,
  resourceCount: dto.resourceCount,
  resourceViewedCount: dto.resourceViewedCount,
  resourceViewedPct: dto.resourceViewedPct,
});

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Homework ─────────────────────────────────────────────────────────────

export async function listHomework(): Promise<Homework[]> {
  const homework = await unwrap(academicHttpClient.get<ApiHomework[]>("/api/homework"));
  return homework.map(mapHomework);
}

/** Not used by any current screen (kept for API parity with the mock); composed from listHomework()
 *  rather than a dedicated backend endpoint since nothing calls it yet. */
export async function getHomework(id: string): Promise<Homework> {
  const all = await listHomework();
  const found = all.find((h) => h.id === id);
  if (!found) throw new Error("Homework not found");
  return found;
}

export async function createHomework(values: HomeworkFormValues): Promise<Homework> {
  const homework = await unwrap(
    academicHttpClient.post<ApiHomework>("/api/homework", {
      ...values,
      sectionId: values.sectionId ?? null,
      attachmentNote: values.attachmentNote ?? null,
      status: HOMEWORK_STATUS_TO_API[values.status],
    }),
  );
  return mapHomework(homework);
}

export async function updateHomework(id: string, values: HomeworkFormValues): Promise<Homework> {
  const homework = await unwrap(
    academicHttpClient.put<ApiHomework>(`/api/homework/${id}`, {
      ...values,
      sectionId: values.sectionId ?? null,
      attachmentNote: values.attachmentNote ?? null,
      status: HOMEWORK_STATUS_TO_API[values.status],
    }),
  );
  return mapHomework(homework);
}

export async function deleteHomework(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/homework/${id}`));
}

// ── Submissions ──────────────────────────────────────────────────────────

export async function listSubmissionsForHomework(homeworkId: string): Promise<HomeworkSubmission[]> {
  const submissions = await unwrap(academicHttpClient.get<ApiHomeworkSubmission[]>(`/api/homework/${homeworkId}/submissions`));
  return submissions.map(mapSubmission);
}

export async function listAssignedHomework(studentId: string): Promise<AssignedHomeworkRow[]> {
  const rows = await unwrap(academicHttpClient.get<ApiAssignedHomeworkRow[]>(`/api/homework/assigned/${studentId}`));
  return rows.map((r) => ({ homework: mapHomework(r.homework), submission: mapSubmission(r.submission) }));
}

export async function submitHomework(homeworkId: string, studentId: string, content: string): Promise<HomeworkSubmission> {
  const submission = await unwrap(
    academicHttpClient.post<ApiHomeworkSubmission>(`/api/homework/${homeworkId}/submit`, { studentId, content }),
  );
  return mapSubmission(submission);
}

export async function gradeSubmission(submissionId: string, grade: string | number, feedback?: string): Promise<HomeworkSubmission> {
  const submission = await unwrap(
    academicHttpClient.post<ApiHomeworkSubmission>(`/api/homework/submissions/${submissionId}/grade`, {
      grade: String(grade),
      feedback: feedback ?? null,
    }),
  );
  return mapSubmission(submission);
}

export async function requestResubmission(submissionId: string, feedback: string): Promise<HomeworkSubmission> {
  const submission = await unwrap(
    academicHttpClient.post<ApiHomeworkSubmission>(`/api/homework/submissions/${submissionId}/request-resubmission`, { feedback }),
  );
  return mapSubmission(submission);
}

// ── Learning resources ───────────────────────────────────────────────────

export async function listLearningResources(): Promise<LearningResource[]> {
  const resources = await unwrap(academicHttpClient.get<ApiLearningResource[]>("/api/learning/resources"));
  return resources.map(mapResource);
}

export async function createLearningResource(values: LearningResourceFormValues): Promise<LearningResource> {
  const resource = await unwrap(
    academicHttpClient.post<ApiLearningResource>("/api/learning/resources", {
      ...values,
      type: RESOURCE_TYPE_TO_API[values.type],
      url: values.url ?? null,
      description: values.description ?? null,
    }),
  );
  return mapResource(resource);
}

export async function updateLearningResource(id: string, values: LearningResourceFormValues): Promise<LearningResource> {
  const resource = await unwrap(
    academicHttpClient.put<ApiLearningResource>(`/api/learning/resources/${id}`, {
      ...values,
      type: RESOURCE_TYPE_TO_API[values.type],
      url: values.url ?? null,
      description: values.description ?? null,
    }),
  );
  return mapResource(resource);
}

export async function deleteLearningResource(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/learning/resources/${id}`));
}

// ── Quizzes ──────────────────────────────────────────────────────────────

export async function listQuizzes(): Promise<Quiz[]> {
  const quizzes = await unwrap(academicHttpClient.get<ApiQuiz[]>("/api/learning/quizzes"));
  return quizzes.map(mapQuiz);
}

/** Not used by any current screen (kept for API parity with the mock); composed from listQuizzes()
 *  rather than a dedicated backend endpoint since nothing calls it yet. */
export async function getQuiz(id: string): Promise<Quiz> {
  const all = await listQuizzes();
  const found = all.find((q) => q.id === id);
  if (!found) throw new Error("Quiz not found");
  return found;
}

export async function createQuiz(values: QuizFormValues, createdByStaffId: string): Promise<Quiz> {
  const quiz = await unwrap(
    academicHttpClient.post<ApiQuiz>("/api/learning/quizzes", {
      subjectId: values.subjectId,
      classId: values.classId,
      title: values.title,
      questions: values.questions.map((q) => ({ text: q.text, options: q.options, correctIndex: q.correctIndex })),
      createdByStaffId,
    }),
  );
  return mapQuiz(quiz);
}

export async function deleteQuiz(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/learning/quizzes/${id}`));
}

export async function listQuizAttempts(quizId?: string): Promise<QuizAttempt[]> {
  const attempts = await unwrap(academicHttpClient.get<ApiQuizAttempt[]>("/api/learning/quizzes/attempts", { params: { quizId } }));
  return attempts.map(mapAttempt);
}

export async function submitQuizAttempt(quizId: string, studentId: string, answers: number[]): Promise<QuizAttempt> {
  const attempt = await unwrap(
    academicHttpClient.post<ApiQuizAttempt>(`/api/learning/quizzes/${quizId}/attempts`, { studentId, answers }),
  );
  return mapAttempt(attempt);
}

// ── Discussion comments ──────────────────────────────────────────────────

export async function listDiscussionComments(resourceId: string): Promise<DiscussionComment[]> {
  const comments = await unwrap(academicHttpClient.get<ApiDiscussionComment[]>(`/api/learning/resources/${resourceId}/comments`));
  return comments.map(mapComment);
}

export async function addDiscussionComment(resourceId: string, values: DiscussionCommentFormValues): Promise<DiscussionComment> {
  const comment = await unwrap(
    academicHttpClient.post<ApiDiscussionComment>(`/api/learning/resources/${resourceId}/comments`, values),
  );
  return mapComment(comment);
}

// ── Resource views ───────────────────────────────────────────────────────

export async function getViewedResourceIds(studentId: string): Promise<string[]> {
  return unwrap(academicHttpClient.get<string[]>(`/api/learning/views/${studentId}`));
}

export async function markResourceViewed(studentId: string, resourceId: string): Promise<void> {
  await unwrap(academicHttpClient.post<void>("/api/learning/views", { studentId, resourceId }));
}

// ── Progress overview ────────────────────────────────────────────────────

export async function getLearningProgress(): Promise<LearningProgressRow[]> {
  const rows = await unwrap(academicHttpClient.get<ApiLearningProgressRow[]>("/api/learning/progress"));
  return rows.map(mapProgressRow);
}
