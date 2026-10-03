import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { GenerationResult } from "../generation/types";
import type { LearningProfileInterpretation, ObservedLearningProfile } from "./types";

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

/** What the school's records show (rule-based; no AI, no quota). Parents and students may omit studentId when there is one. */
export const getLearningProfile = (studentId?: string) =>
  call(aiHttpClient.get<ObservedLearningProfile>("api/ai/learning-profile", { params: { studentId } }));

/** The observed profile plus an AI explanation written for whoever asks (student, parent or staff). */
export const interpretLearningProfile = (studentId?: string) =>
  call(aiHttpClient.post<GenerationResult<LearningProfileInterpretation>>("api/ai/learning-profile/interpret", { studentId }));
