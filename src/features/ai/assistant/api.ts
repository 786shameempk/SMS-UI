import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { AssistantChatRequest, AssistantChatResponse, AssistantMode, ConversationDetail, ConversationSummary, ProposedAction } from "./types";

/** Chat endpoint of each assistant (the analytics one is admin-only on the server). */
export const CHAT_PATHS: Record<AssistantMode, string> = { chat: "api/ai/chat", analytics: "api/ai/analytics/chat" };

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

export async function sendAssistantMessage(req: AssistantChatRequest, mode: AssistantMode = "chat"): Promise<AssistantChatResponse> {
  if (AI_MOCK_ENABLED) {
    return { conversationId: req.conversationId ?? "demo", reply: DEMO_REPLY, sources: [], demo: true };
  }
  return call(aiHttpClient.post<AssistantChatResponse>(CHAT_PATHS[mode], req));
}

/** The signed-in user's own conversations with one assistant, newest first. Study assistant chats are kept apart. */
export async function listConversations(take = 30, feature: AssistantMode = "chat"): Promise<ConversationSummary[]> {
  if (AI_MOCK_ENABLED) return [];
  return call(aiHttpClient.get<ConversationSummary[]>("api/ai/conversations", { params: { feature, take } }));
}

/** Runs an action the assistant prepared, after the server checks access again. Returns the outcome message as summary. */
export const confirmAction = (id: string) => call(aiHttpClient.post<ProposedAction>(`api/ai/actions/${id}/confirm`));

export const cancelAction = (id: string) => call(aiHttpClient.post<ProposedAction>(`api/ai/actions/${id}/cancel`));

export const getConversation = (id: string) => call(aiHttpClient.get<ConversationDetail>(`api/ai/conversations/${id}`));

export async function deleteConversation(id: string): Promise<void> {
  await call(aiHttpClient.delete<void>(`api/ai/conversations/${id}`));
}
