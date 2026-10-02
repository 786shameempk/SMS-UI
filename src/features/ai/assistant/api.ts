import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { AssistantChatRequest, AssistantChatResponse } from "./types";

/** AiService is not deployed yet; this keeps the UI usable (and visibly labelled as a demo) until it is. */
export const AI_MOCK_ENABLED = import.meta.env.VITE_AI_MOCK === "true";

const DEMO_REPLY =
  "The AI service is not connected yet, so I cannot look up real school data. Once it is, I will answer questions about timetable, attendance, fees, exams and notices using only what your account is allowed to see.";

export async function sendAssistantMessage(req: AssistantChatRequest): Promise<AssistantChatResponse> {
  if (AI_MOCK_ENABLED) {
    return { conversationId: req.conversationId ?? "demo", reply: DEMO_REPLY, sources: [], demo: true };
  }
  try {
    const { data } = await aiHttpClient.post<AssistantChatResponse>("api/ai/chat", req);
    return data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}
