import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { ContentAction, ContentItem, ContentKind, ContentStatus, ContentSummary, CreateContentRequest } from "./types";

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export const CONTENT_KEY = ["ai", "content"] as const;

export const listContent = (filters: { status?: ContentStatus; kind?: ContentKind; mine?: boolean } = {}) =>
  call(aiHttpClient.get<ContentSummary[]>("api/ai/content", { params: filters }));

export const getContent = (id: string) => call(aiHttpClient.get<ContentItem>(`api/ai/content/${id}`));

/** Saves a draft for review. Nothing is sent to anyone until it is approved and published. */
export const createContent = (body: CreateContentRequest) => call(aiHttpClient.post<ContentItem>("api/ai/content", body));

export const updateContent = (id: string, body: { version: number; title: string; body: string; audience?: string | null }) =>
  call(aiHttpClient.put<ContentItem>(`api/ai/content/${id}`, body));

/** Asks the server to apply a workflow action; it re-checks role, status and version (409 when stale). */
export const transitionContent = (id: string, action: ContentAction, version: number, comment?: string) =>
  call(aiHttpClient.post<ContentItem>(`api/ai/content/${id}/transitions`, { action, version, comment }));

export async function deleteContent(id: string): Promise<void> {
  await call(aiHttpClient.delete<void>(`api/ai/content/${id}`));
}
