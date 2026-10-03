import { AI_API_BASE_URL, authorizedFetch } from "@/lib/httpClient";
import { readServerSentEvents } from "@/lib/sse";
import { AI_MOCK_ENABLED, CHAT_PATHS } from "./api";
import type { AssistantChatRequest, AssistantChatResponse, AssistantMode, AssistantSource, ProposedAction } from "./types";

/** Events of POST api/ai/chat/stream, in the order the server sends them. `done.reply` is the authoritative final text. */
export type AssistantStreamEvent =
  | { type: "start"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "reset" }
  | { type: "lookup"; source: string }
  | { type: "done"; conversationId: string; reply: string; sources: AssistantSource[]; actions?: ProposedAction[] };

/** Raised when the answer fails; `partial` is what had already arrived (shown so the user does not lose it). */
export class AssistantStreamError extends Error {
  readonly code: string | null;
  readonly partial: string;
  readonly conversationId: string | undefined;

  constructor(message: string, code: string | null, partial: string, conversationId: string | undefined) {
    super(message);
    this.code = code;
    this.partial = partial;
    this.conversationId = conversationId;
  }
}

const DEMO_REPLY =
  "The AI service is not connected yet, so I cannot look up real school data. Once it is, I will answer using only what your account is allowed to see.";

async function problemMessage(response: Response): Promise<{ message: string; code: string | null }> {
  try {
    const body = (await response.json()) as { title?: string; errorCode?: string; errors?: Record<string, string[]> };
    const field = body.errors && Object.values(body.errors)[0]?.[0];
    return { message: field ?? body.title ?? "Something went wrong. Please try again.", code: body.errorCode ?? null };
  } catch {
    return { message: response.status === 429 ? "Too many requests. Please wait a moment and try again." : "Something went wrong. Please try again.", code: null };
  }
}

/**
 * Asks School AI and streams the answer. `onEvent` sees every event as it arrives; the promise resolves with the final
 * saved answer. Abort `signal` to stop generating (the server cancels the provider call too).
 */
export async function streamAssistantMessage(
  req: AssistantChatRequest,
  onEvent: (e: AssistantStreamEvent) => void,
  signal?: AbortSignal,
  mode: AssistantMode = "chat",
): Promise<AssistantChatResponse> {
  if (AI_MOCK_ENABLED) {
    const conversationId = req.conversationId ?? "demo";
    onEvent({ type: "start", conversationId });
    for (const word of DEMO_REPLY.split(" ")) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      await new Promise((r) => setTimeout(r, 15));
      onEvent({ type: "delta", text: `${word} ` });
    }
    onEvent({ type: "done", conversationId, reply: DEMO_REPLY, sources: [] });
    return { conversationId, reply: DEMO_REPLY, sources: [], demo: true };
  }

  let response: Response;
  try {
    response = await authorizedFetch(AI_API_BASE_URL, `${CHAT_PATHS[mode]}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(req),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new AssistantStreamError("Couldn't reach the AI service. Check your connection and try again.", null, "", req.conversationId);
  }
  if (!response.ok) {
    const { message, code } = await problemMessage(response);
    throw new AssistantStreamError(message, code, "", req.conversationId);
  }

  let partial = "";
  let conversationId = req.conversationId;
  let result: AssistantChatResponse | null = null;
  let failure: { message: string; code: string | null } | null = null;

  try {
    await readServerSentEvents(response, (name, raw) => {
      const data = JSON.parse(raw) as Record<string, unknown>;
      switch (name) {
        case "start":
          conversationId = String(data.conversationId);
          onEvent({ type: "start", conversationId });
          break;
        case "delta":
          partial += String(data.text);
          onEvent({ type: "delta", text: String(data.text) });
          break;
        case "reset":
          partial = "";
          onEvent({ type: "reset" });
          break;
        case "lookup":
          onEvent({ type: "lookup", source: String(data.source) });
          break;
        case "done": {
          const done = {
            type: "done" as const,
            conversationId: String(data.conversationId),
            reply: String(data.reply),
            sources: (data.sources ?? []) as AssistantSource[],
            actions: (data.actions ?? []) as ProposedAction[],
          };
          result = { conversationId: done.conversationId, reply: done.reply, sources: done.sources, actions: done.actions };
          onEvent(done);
          break;
        }
        case "error":
          failure = { message: String(data.message ?? "Something went wrong. Please try again."), code: (data.errorCode as string) ?? null };
          break;
      }
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new AssistantStreamError("The connection was interrupted before the answer finished.", null, partial, conversationId);
  }

  if (failure) throw new AssistantStreamError((failure as { message: string }).message, (failure as { code: string | null }).code, partial, conversationId);
  if (!result) throw new AssistantStreamError("The answer ended unexpectedly. Please try again.", null, partial, conversationId);
  return result;
}
