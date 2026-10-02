import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { AI_MOCK_ENABLED } from "../assistant/api";
import type {
  ExamPaper,
  ExamRequest,
  GeneratedQuestionSet,
  GenerationResult,
  Homework,
  HomeworkRequest,
  LessonPlan,
  LessonPlanRequest,
  QuestionsRequest,
  Worksheet,
  WorksheetRequest,
} from "./types";

async function generate<TBody, TResult>(path: string, body: TBody): Promise<GenerationResult<TResult>> {
  // Generators need a real model: unlike chat, canned placeholder content here would look like real exam material.
  if (AI_MOCK_ENABLED) throw new Error("AI generation is switched off in demo mode. Connect the AI service to use it.");
  try {
    return (await aiHttpClient.post<GenerationResult<TResult>>(path, body)).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export const generateQuestions = (body: QuestionsRequest) => generate<QuestionsRequest, GeneratedQuestionSet>("api/ai/generate-questions", body);
export const generateExam = (body: ExamRequest) => generate<ExamRequest, ExamPaper>("api/ai/generate-exam", body);
export const generateWorksheet = (body: WorksheetRequest) => generate<WorksheetRequest, Worksheet>("api/ai/generate-worksheet", body);
export const generateLessonPlan = (body: LessonPlanRequest) => generate<LessonPlanRequest, LessonPlan>("api/ai/generate-lesson-plan", body);
export const generateHomework = (body: HomeworkRequest) => generate<HomeworkRequest, Homework>("api/ai/generate-homework", body);
