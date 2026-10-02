import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { UsageSummary } from "./types";

/** AI usage for the caller's school between two dates (yyyy-mm-dd, inclusive). Admins and principals only. */
export async function getAiUsage(from: string, to: string): Promise<UsageSummary> {
  try {
    return (await aiHttpClient.get<UsageSummary>("api/ai/usage", { params: { from, to } })).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}
