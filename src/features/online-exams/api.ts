import { academicHttpClient, extractApiErrorMessage, getApiErrorStatus } from "@/lib/httpClient";
import type {
  AnswerInput,
  AssignableStudent,
  AttemptReview,
  AttemptSession,
  AuthoringOptions,
  EvaluationInput,
  EvaluationQueueItem,
  ExamAnalysis,
  ExamFilters,
  ExamResults,
  MyOnlineExam,
  MyResult,
  OnlineExamDashboard,
  OnlineExamDetail,
  OnlineExamInput,
  OnlineExamListItem,
  QuestionBankInput,
  QuestionBankItem,
  QuestionFilters,
  QuestionImportResult,
  SubmitResult,
} from "./types";

/** An API error that keeps its HTTP status, so screens can tell "time's up" (409) from a network failure. */
export class OnlineExamApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new OnlineExamApiError(extractApiErrorMessage(err), getApiErrorStatus(err));
  }
}

const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null));

// ── Question bank ──

export const listQuestions = (filters: QuestionFilters = {}) =>
  unwrap(academicHttpClient.get<QuestionBankItem[]>("/api/question-bank", { params: clean(filters) }));

export const listQuestionTopics = (subjectId?: string) =>
  unwrap(academicHttpClient.get<string[]>("/api/question-bank/topics", { params: clean({ subjectId }) }));

export const createQuestion = (input: QuestionBankInput) => unwrap(academicHttpClient.post<QuestionBankItem>("/api/question-bank", input));

export const updateQuestion = (id: string, input: QuestionBankInput) =>
  unwrap(academicHttpClient.put<QuestionBankItem>(`/api/question-bank/${id}`, input));

export const duplicateQuestion = (id: string) => unwrap(academicHttpClient.post<QuestionBankItem>(`/api/question-bank/${id}/duplicate`));

export const deleteQuestions = (ids: string[]) => unwrap(academicHttpClient.post<number>("/api/question-bank/bulk-delete", { ids }));

export const importQuestions = (questions: QuestionBankInput[]) =>
  unwrap(academicHttpClient.post<QuestionImportResult>("/api/question-bank/import", questions));

// ── Exams (staff) ──

export const getOnlineExamDashboard = () => unwrap(academicHttpClient.get<OnlineExamDashboard>("/api/online-exams/dashboard"));

export const listOnlineExams = (filters: ExamFilters = {}) =>
  unwrap(academicHttpClient.get<OnlineExamListItem[]>("/api/online-exams", { params: clean(filters) }));

export const getOnlineExam = (id: string) => unwrap(academicHttpClient.get<OnlineExamDetail>(`/api/online-exams/${id}`));

export const listAssignableStudents = (classId?: string) =>
  unwrap(academicHttpClient.get<AssignableStudent[]>("/api/online-exams/assignable-students", { params: clean({ classId }) }));

export const getAuthoringOptions = () => unwrap(academicHttpClient.get<AuthoringOptions>("/api/online-exams/authoring-options"));

export const createOnlineExam = (input: OnlineExamInput) => unwrap(academicHttpClient.post<OnlineExamDetail>("/api/online-exams", input));

export const updateOnlineExam = (id: string, input: OnlineExamInput) =>
  unwrap(academicHttpClient.put<OnlineExamDetail>(`/api/online-exams/${id}`, input));

export const deleteOnlineExam = (id: string) => unwrap(academicHttpClient.delete<void>(`/api/online-exams/${id}`));

export const duplicateOnlineExam = (id: string) => unwrap(academicHttpClient.post<OnlineExamDetail>(`/api/online-exams/${id}/duplicate`));

export const scheduleOnlineExam = (id: string, startNow = false) =>
  unwrap(academicHttpClient.post<OnlineExamDetail>(`/api/online-exams/${id}/schedule`, { startNow }));

export const cancelOnlineExam = (id: string, reason?: string) =>
  unwrap(academicHttpClient.post<OnlineExamDetail>(`/api/online-exams/${id}/cancel`, { reason: reason ?? null }));

export const publishExamResults = (id: string) => unwrap(academicHttpClient.post<OnlineExamDetail>(`/api/online-exams/${id}/publish-results`));

export const getExamResults = (id: string) => unwrap(academicHttpClient.get<ExamResults>(`/api/online-exams/${id}/results`));

export const getExamAnalysis = (id: string) => unwrap(academicHttpClient.get<ExamAnalysis>(`/api/online-exams/${id}/analysis`));

export const getEvaluationQueue = () => unwrap(academicHttpClient.get<EvaluationQueueItem[]>("/api/online-exams/evaluations"));

export const getAttemptReview = (examId: string, attemptId: string) =>
  unwrap(academicHttpClient.get<AttemptReview>(`/api/online-exams/${examId}/attempts/${attemptId}`));

export const saveEvaluations = (examId: string, attemptId: string, evaluations: EvaluationInput[]) =>
  unwrap(academicHttpClient.put<AttemptReview>(`/api/online-exams/${examId}/attempts/${attemptId}/evaluations`, evaluations));

// ── Student ──

export const listMyExams = () => unwrap(academicHttpClient.get<MyOnlineExam[]>("/api/online-exams/my"));

export const startExam = (id: string) => unwrap(academicHttpClient.post<AttemptSession>(`/api/online-exams/${id}/start`));

export const getExamSession = (id: string) => unwrap(academicHttpClient.get<AttemptSession>(`/api/online-exams/${id}/session`));

export const saveAnswers = (id: string, answers: AnswerInput[]) =>
  unwrap(academicHttpClient.post<{ saved: number; serverNowUtc: string; deadlineUtc: string }>(`/api/online-exams/${id}/answers`, answers));

export const submitExam = (id: string, answers: AnswerInput[]) =>
  unwrap(academicHttpClient.post<SubmitResult>(`/api/online-exams/${id}/submit`, { answers }));

export const getMyResult = (id: string) => unwrap(academicHttpClient.get<MyResult>(`/api/online-exams/${id}/my-result`));
