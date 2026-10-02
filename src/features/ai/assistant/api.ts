import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { AssistantChatRequest, AssistantChatResponse, ConversationDetail, ConversationSummary } from "./types";

/** Without AiService (VITE_AI_MOCK=true) the UI stays usable and is visibly labelled as a demo. */
export const AI_MOCK_ENABLED = import.meta.env.VITE_AI_MOCK === "true";

const DEMO_REPLY =
  "The AI service is not connected yet, so I cannot look up real school data. Once it is, I will answer questions about timetable, attendance, fees, exams and notices using only what your account is allowed to see.";

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export async function sendAssistantMessage(req: AssistantChatRequest): Promise<AssistantChatResponse> {
  if (AI_MOCK_ENABLED) {
    return { conversationId: req.conversationId ?? "demo", reply: DEMO_REPLY, sources: [], demo: true };
  }
  return call(aiHttpClient.post<AssistantChatResponse>("api/ai/chat", req));
}

/** The signed-in user's own Ask School AI conversations, newest first. Study assistant chats are kept apart. */
export async function listConversations(take = 30): Promise<ConversationSummary[]> {
  if (AI_MOCK_ENABLED) return [];
  return call(aiHttpClient.get<ConversationSummary[]>("api/ai/conversations", { params: { feature: "chat", take } }));
}

export const getConversation = (id: string) => call(aiHttpClient.get<ConversationDetail>(`api/ai/conversations/${id}`));

export async function deleteConversation(id: string): Promise<void> {
  await call(aiHttpClient.delete<void>(`api/ai/conversations/${id}`));
}
