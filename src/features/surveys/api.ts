import { mockDelay } from "@/utils/mockDelay";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { buildSeedSurveyData } from "./mock";
import type {
  QuestionResult,
  RecordResponseFormValues,
  RespondentRow,
  Survey,
  SurveyAudience,
  SurveyFormValues,
  SurveyQuestion,
  SurveyResponse,
  SurveyResultsSummary,
  SurveyRow,
  SurveysReportsSummary,
  SurveyStatus,
} from "./types";

const SURVEYS_KEY = "sms-mock-surveys";
const RESPONSES_KEY = "sms-mock-surveys-responses";
const SEEDED_KEY = "sms-mock-surveys-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let surveys = loadJson<Survey[]>(SURVEYS_KEY, []);
let responses = loadJson<SurveyResponse[]>(RESPONSES_KEY, []);

function persistSurveys() {
  saveJson(SURVEYS_KEY, surveys);
}
function persistResponses() {
  saveJson(RESPONSES_KEY, responses);
}

function requireSurvey(id: string): Survey {
  const found = surveys.find((s) => s.id === id);
  if (!found) throw new Error("Survey not found");
  return found;
}

/**
 * Surveys/questions/responses are entirely this module's own data — it only reads real
 * students/staff to resolve who a response belongs to (or who created a survey), same
 * read-only join convention as every other module this session. No new staff designation or
 * cross-module write is needed here.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (surveys.length === 0 && responses.length === 0) {
    const [students, staff] = await Promise.all([listStudents(), listStaff()]);
    const seeded = buildSeedSurveyData(students, staff);
    surveys = seeded.surveys;
    responses = seeded.responses;
    persistSurveys();
    persistResponses();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Surveys & Feedback seed failed", err);
});

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
  await seedPromise;
  const { staffById } = await joinContext();
  const rows = surveys
    .filter((s) => !status || s.status === status)
    .map((s): SurveyRow => ({
      ...s,
      responseCount: responses.filter((r) => r.surveyId === s.id).length,
      createdBy: s.createdByStaffId ? staffById.get(s.createdByStaffId) : undefined,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return mockDelay(rows, 350);
}

export async function getSurvey(id: string): Promise<Survey> {
  await seedPromise;
  return mockDelay(requireSurvey(id), 250);
}

export async function createSurvey(values: SurveyFormValues): Promise<Survey> {
  await seedPromise;
  const questions: SurveyQuestion[] = values.questions.map((q) => ({ id: genId("q"), ...q }));
  const survey: Survey = {
    id: genId("survey"),
    title: values.title,
    description: values.description,
    audience: values.audience,
    status: "draft",
    anonymousAllowed: values.anonymousAllowed,
    opensAt: values.opensAt,
    closesAt: values.closesAt,
    createdByStaffId: values.createdByStaffId,
    createdAt: new Date().toISOString(),
    questions,
  };
  surveys = [survey, ...surveys];
  persistSurveys();
  return mockDelay(survey, 400);
}

export async function publishSurvey(id: string): Promise<Survey> {
  await seedPromise;
  const survey = requireSurvey(id);
  if (survey.status !== "draft") throw new Error("Only a draft survey can be published");
  const updated: Survey = { ...survey, status: "published" };
  surveys = surveys.map((s) => (s.id === id ? updated : s));
  persistSurveys();
  return mockDelay(updated, 300);
}

export async function closeSurvey(id: string): Promise<Survey> {
  await seedPromise;
  const survey = requireSurvey(id);
  if (survey.status !== "published") throw new Error("Only a published survey can be closed");
  const updated: Survey = { ...survey, status: "closed" };
  surveys = surveys.map((s) => (s.id === id ? updated : s));
  persistSurveys();
  return mockDelay(updated, 300);
}

export async function deleteSurvey(id: string): Promise<void> {
  await seedPromise;
  requireSurvey(id);
  surveys = surveys.filter((s) => s.id !== id);
  responses = responses.filter((r) => r.surveyId !== id);
  persistSurveys();
  persistResponses();
  return mockDelay(undefined, 300);
}

// ── Responses ────────────────────────────────────────────────────────────

export async function listResponses(surveyId: string): Promise<RespondentRow[]> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  const rows = responses
    .filter((r) => r.surveyId === surveyId)
    .map(
      (r): RespondentRow => ({
        ...r,
        respondentStudent: r.respondentStudentId ? studentById.get(r.respondentStudentId) : undefined,
        respondentStaff: r.respondentStaffId ? staffById.get(r.respondentStaffId) : undefined,
        respondentLabel: respondentLabel(r, studentById, staffById),
      }),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return mockDelay(rows, 350);
}

export async function recordResponse(values: RecordResponseFormValues): Promise<SurveyResponse> {
  await seedPromise;
  const survey = requireSurvey(values.surveyId);
  if (survey.status !== "published") throw new Error("This survey isn't open for responses right now");
  if (values.respondentType === "anonymous" && !survey.anonymousAllowed) throw new Error("This survey doesn't accept anonymous responses");

  const missingRequired = survey.questions.some((q) => q.required && !values.answers.find((a) => a.questionId === q.id)?.value.trim());
  if (missingRequired) throw new Error("Please answer all required questions");

  const response: SurveyResponse = {
    id: genId("resp"),
    surveyId: values.surveyId,
    respondentType: values.respondentType,
    respondentStudentId: values.respondentType === "student" || values.respondentType === "parent" ? values.respondentStudentId : undefined,
    respondentStaffId: values.respondentType === "staff" ? values.respondentStaffId : undefined,
    respondentName: values.respondentType === "parent" ? values.respondentName?.trim() : undefined,
    submittedAt: new Date().toISOString(),
    answers: values.answers.filter((a) => a.value.trim().length > 0),
  };
  responses = [response, ...responses];
  persistResponses();
  return mockDelay(response, 400);
}

export async function deleteResponse(id: string): Promise<void> {
  await seedPromise;
  const found = responses.find((r) => r.id === id);
  if (!found) throw new Error("Response not found");
  responses = responses.filter((r) => r.id !== id);
  persistResponses();
  return mockDelay(undefined, 300);
}

// ── Results & reports ────────────────────────────────────────────────────

export async function getSurveyResults(surveyId: string): Promise<SurveyResultsSummary> {
  await seedPromise;
  const survey = requireSurvey(surveyId);
  const surveyResponses = responses.filter((r) => r.surveyId === surveyId);

  const questionResults: QuestionResult[] = survey.questions.map((question) => {
    const answersForQuestion = surveyResponses
      .map((r) => r.answers.find((a) => a.questionId === question.id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    const base = { questionId: question.id, questionText: question.text, type: question.type, required: question.required, answeredCount: answersForQuestion.length };

    if (question.type === "rating") {
      const values = answersForQuestion.map((a) => Number(a.value)).filter((n) => !Number.isNaN(n));
      const distribution = [1, 2, 3, 4, 5].map((value) => ({ value, count: values.filter((v) => v === value).length }));
      const average = values.length === 0 ? 0 : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
      return { ...base, ratingAverage: average, ratingDistribution: distribution };
    }
    if (question.type === "multiple_choice") {
      const counts = (question.options ?? []).map((option) => ({ option, count: answersForQuestion.filter((a) => a.value === option).length }));
      return { ...base, choiceCounts: counts };
    }
    if (question.type === "yes_no") {
      return {
        ...base,
        yesCount: answersForQuestion.filter((a) => a.value === "yes").length,
        noCount: answersForQuestion.filter((a) => a.value === "no").length,
      };
    }
    return { ...base, textResponses: answersForQuestion.map((a) => a.value) };
  });

  return mockDelay({ survey, responseCount: surveyResponses.length, questionResults }, 350);
}

export async function getSurveysReportsSummary(): Promise<SurveysReportsSummary> {
  await seedPromise;
  const totalSurveys = surveys.length;
  const publishedSurveys = surveys.filter((s) => s.status === "published").length;
  const totalResponses = responses.length;
  const avgResponsesPerSurvey = totalSurveys === 0 ? 0 : Math.round((totalResponses / totalSurveys) * 10) / 10;

  const audienceCounts = new Map<string, number>();
  for (const response of responses) {
    const survey = surveys.find((s) => s.id === response.surveyId);
    if (!survey) continue;
    audienceCounts.set(survey.audience, (audienceCounts.get(survey.audience) ?? 0) + 1);
  }
  const responsesByAudience = Array.from(audienceCounts.entries()).map(([audience, count]) => ({ audience: audience as SurveyAudience, count }));

  return mockDelay({ totalSurveys, publishedSurveys, totalResponses, avgResponsesPerSurvey, responsesByAudience }, 300);
}
