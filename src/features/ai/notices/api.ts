import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { AI_MOCK_ENABLED } from "../assistant/api";
import type { GenerationResult } from "../generation/types";
import type { DraftNoticeRequest, NoticeDraft, RewriteRequest } from "./types";

async function post<T>(path: string, body: unknown): Promise<GenerationResult<T>> {
  if (AI_MOCK_ENABLED) throw new Error("AI drafting is switched off in demo mode. Connect the AI service to use it.");
  try {
    return (await aiHttpClient.post<GenerationResult<T>>(path, body)).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export const draftNotice = (body: DraftNoticeRequest) => post<NoticeDraft>("api/ai/notices/draft", body);

/** Improve grammar, change tone/length, or translate. Translation is open to every role; the rest is for staff. */
export const rewriteContent = (body: RewriteRequest) => post<{ text: string }>("api/ai/content/rewrite", body);
