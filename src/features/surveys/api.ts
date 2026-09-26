import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import type {
  QuestionResult,
  QuestionType,
  RecordResponseFormValues,
  RespondentRow,
  RespondentType,
  Survey,
  SurveyAudience,
  SurveyFormValues,
  SurveyResponse,
  SurveyResultsSummary,
  SurveyRow,
  SurveysReportsSummary,
  SurveyStatus,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// EngagementService's enums serialize as PascalCase; see docs/MICROSERVICES_PLAN.md.

const QUESTION_TYPE_TO_API: Record<QuestionType, string> = { rating: "Rating", multiple_choice: "MultipleChoice", yes_no: "YesNo", text: "Text" };
const QUESTION_TYPE_FROM_API: Record<string, QuestionType> = { Rating: "rating", MultipleChoice: "multiple_choice", YesNo: "yes_no", Text: "text" };

const STATUS_TO_API: Record<SurveyStatus, string> = { draft: "Draft", published: "Published", closed: "Closed" };
const STATUS_FROM_API: Record<string, SurveyStatus> = { Draft: "draft", Published: "published", Closed: "closed" };

const AUDIENCE_TO_API: Record<SurveyAudience, string> = { students: "Students", parents: "Parents", staff: "Staff", all: "All" };
const AUDIENCE_FROM_API: Record<string, SurveyAudience> = { Students: "students", Parents: "parents", Staff: "staff", All: "all" };

const RESPONDENT_TO_API: Record<RespondentType, string> = { student: "Student", staff: "Staff", parent: "Parent", anonymous: "Anonymous" };
const RESPONDENT_FROM_API: Record<string, RespondentType> = { Student: "student", Staff: "staff", Parent: "parent", Anonymous: "anonymous" };

// ── API response shapes (EngagementService DTOs) ────────────────────────────

interface ApiQuestion {
  id: string;
  text: string;
  type: string;
  options: string[];
  required: boolean;
}

interface ApiSurvey {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  audience: string;
  status: string;
  anonymousAllowed: boolean;
  opensAt: string;
  closesAt: string | null;
  createdByStaffId: string | null;
  createdAt: string;
  questions: ApiQuestion[];
  responseCount: number;
}

interface ApiResponse {
  id: string;
  tenantId: string;
  surveyId: string;
  respondentType: string;
  respondentStudentId: string | null;
  respondentStaffId: string | null;
  respondentName: string | null;
  submittedAt: string;
  answers: Array<{ questionId: string; value: string }>;
}

interface ApiQuestionResult {
  questionId: string;
  questionText: string;
  type: string;
  required: boolean;
  answeredCount: number;
  ratingAverage: number | null;
  ratingDistribution: Array<{ value: number; count: number }> | null;
  choiceCounts: Array<{ option: string; count: number }> | null;
  yesCount: number | null;
  noCount: number | null;
  textResponses: string[] | null;
}

interface ApiResults {
  survey: ApiSurvey;
  responseCount: number;
  questionResults: ApiQuestionResult[];
}

interface ApiReportsSummary {
  totalSurveys: number;
  publishedSurveys: number;
  totalResponses: number;
  avgResponsesPerSurvey: number;
  responsesByAudience: Array<{ audience: string; count: number }>;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function mapSurvey(s: ApiSurvey): Survey {
  return {
    id: s.id,
    tenantId: s.tenantId,
    title: s.title,
    description: s.description ?? undefined,
    audience: AUDIENCE_FROM_API[s.audience],
    status: STATUS_FROM_API[s.status],
    anonymousAllowed: s.anonymousAllowed,
    opensAt: s.opensAt,
    closesAt: s.closesAt ?? undefined,
    createdByStaffId: s.createdByStaffId ?? undefined,
    createdAt: s.createdAt,
    questions: s.questions.map((q) => {
      const type = QUESTION_TYPE_FROM_API[q.type];
      return { id: q.id, text: q.text, type, options: type === "multiple_choice" ? q.options : undefined, required: q.required };
    }),
  };
}

function mapResponse(r: ApiResponse): SurveyResponse {
  return {
    id: r.id,
    tenantId: r.tenantId,
    surveyId: r.surveyId,
    respondentType: RESPONDENT_FROM_API[r.respondentType],
    respondentStudentId: r.respondentStudentId ?? undefined,
    respondentStaffId: r.respondentStaffId ?? undefined,
    respondentName: r.respondentName ?? undefined,
    submittedAt: r.submittedAt,
    answers: r.answers,
  };
}

function mapQuestionResult(q: ApiQuestionResult): QuestionResult {
  return {
    questionId: q.questionId,
    questionText: q.questionText,
    type: QUESTION_TYPE_FROM_API[q.type],
    required: q.required,
    answeredCount: q.answeredCount,
    ratingAverage: q.ratingAverage ?? undefined,
    ratingDistribution: q.ratingDistribution ?? undefined,
    choiceCounts: q.choiceCounts ?? undefined,
    yesCount: q.yesCount ?? undefined,
    noCount: q.noCount ?? undefined,
    textResponses: q.textResponses ?? undefined,
  };
}

async function joinContext(): Promise<{ studentById: Map<string, Student>; staffById: Map<string, StaffMember> }> {
  const [students, staff] = await Promise.all([listStudents(), listStaff()]);
  return {
    studentById: new Map(students.map((s) => [s.id, s] as const)),
    staffById: new Map(staff.map((s) => [s.id, s] as const)),
  };
}

function respondentLabel(response: SurveyResponse, studentById: Map<string, Student>, staffById: Map<string, StaffMember>): string {
  if (response.respondentType === "student") {
    const s = response.respondentStudentId ? studentById.get(response.respondentStudentId) : undefined;
    return s ? `${s.firstName} ${s.lastName} (${s.className} - ${s.section})` : "Unknown student";
  }
  if (response.respondentType === "staff") {
    const s = response.respondentStaffId ? staffById.get(response.respondentStaffId) : undefined;
    return s ? `${s.firstName} ${s.lastName} (${s.designation})` : "Unknown staff";
  }
  if (response.respondentType === "parent") {
    const child = response.respondentStudentId ? studentById.get(response.respondentStudentId) : undefined;
    const base = response.respondentName?.trim() || "Parent/Guardian";
    return child ? `${base} (parent of ${child.firstName} ${child.lastName})` : base;
  }
  return "Anonymous";
}

// ── Surveys ──────────────────────────────────────────────────────────────

export async function listSurveys(status?: SurveyStatus): Promise<SurveyRow[]> {
  const [surveys, { staffById }] = await Promise.all([
    unwrap(engagementHttpClient.get<ApiSurvey[]>("api/Surveys", { params: status ? { status: STATUS_TO_API[status] } : undefined })),
    joinContext(),
  ]);
  return surveys.map((s): SurveyRow => ({
    ...mapSurvey(s),
    responseCount: s.responseCount,
    createdBy: s.createdByStaffId ? staffById.get(s.createdByStaffId) : undefined,
  }));
}

export async function getSurvey(id: string): Promise<Survey> {
  return mapSurvey(await unwrap(engagementHttpClient.get<ApiSurvey>(`api/Surveys/${id}`)));
}

export async function createSurvey(values: SurveyFormValues): Promise<Survey> {
  return mapSurvey(
    await unwrap(
      engagementHttpClient.post<ApiSurvey>("api/Surveys", {
        title: values.title,
        description: values.description?.trim() || null,
        audience: AUDIENCE_TO_API[values.audience],
        anonymousAllowed: values.anonymousAllowed,
        opensAt: values.opensAt,
        closesAt: values.closesAt || null,
        createdByStaffId: values.createdByStaffId || null,
        questions: values.questions.map((q) => ({
          text: q.text,
          type: QUESTION_TYPE_TO_API[q.type],
          options: q.options ?? null,
          required: q.required,
        })),
      }),
    ),
  );
}

export async function publishSurvey(id: string): Promise<Survey> {
  return mapSurvey(await unwrap(engagementHttpClient.post<ApiSurvey>(`api/Surveys/${id}/publish`)));
}

export async function closeSurvey(id: string): Promise<Survey> {
  return mapSurvey(await unwrap(engagementHttpClient.post<ApiSurvey>(`api/Surveys/${id}/close`)));
}

/** Its questions and responses are deleted with it. */
export async function deleteSurvey(id: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/Surveys/${id}`));
}

// ── Responses ────────────────────────────────────────────────────────────

export async function listResponses(surveyId: string): Promise<RespondentRow[]> {
  const [responses, { studentById, staffById }] = await Promise.all([
    unwrap(engagementHttpClient.get<ApiResponse[]>(`api/Surveys/${surveyId}/responses`)),
    joinContext(),
  ]);
  return responses.map(mapResponse).map(
    (r): RespondentRow => ({
      ...r,
      respondentStudent: r.respondentStudentId ? studentById.get(r.respondentStudentId) : undefined,
      respondentStaff: r.respondentStaffId ? staffById.get(r.respondentStaffId) : undefined,
      respondentLabel: respondentLabel(r, studentById, staffById),
    }),
  );
}

export async function recordResponse(values: RecordResponseFormValues): Promise<SurveyResponse> {
  return mapResponse(
    await unwrap(
      engagementHttpClient.post<ApiResponse>("api/SurveyResponses", {
        surveyId: values.surveyId,
        respondentType: RESPONDENT_TO_API[values.respondentType],
        respondentStudentId: values.respondentStudentId || null,
        respondentStaffId: values.respondentStaffId || null,
        respondentName: values.respondentName || null,
        answers: values.answers,
      }),
    ),
  );
}

export async function deleteResponse(id: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/SurveyResponses/${id}`));
}

// ── Results & reports ────────────────────────────────────────────────────

export async function getSurveyResults(surveyId: string): Promise<SurveyResultsSummary> {
  const results = await unwrap(engagementHttpClient.get<ApiResults>(`api/Surveys/${surveyId}/results`));
  return {
    survey: mapSurvey(results.survey),
    responseCount: results.responseCount,
    questionResults: results.questionResults.map(mapQuestionResult),
  };
}

export async function getSurveysReportsSummary(): Promise<SurveysReportsSummary> {
  const summary = await unwrap(engagementHttpClient.get<ApiReportsSummary>("api/Surveys/reports-summary"));
  return {
    ...summary,
    responsesByAudience: summary.responsesByAudience.map((a) => ({ audience: AUDIENCE_FROM_API[a.audience], count: a.count })),
  };
}
