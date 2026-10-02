import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { AI_MOCK_ENABLED } from "../assistant/api";
import type { BatchRemarkItem, RemarkStyle, ReportCardRemarkBatchRequest, ReportCardRemarkBatchResult } from "./types";

/** Students per request. AiService writes them one after another (max 10), so small chunks keep each request quick and show progress. */
export const REMARK_CHUNK_SIZE = 5;

/** Errors after which more requests cannot succeed today, so the rest of the class is not sent. */
const STOPPING_CODES = new Set(["AI_QUOTA_EXCEEDED", "AI_RATE_LIMIT", "AI_NOT_CONFIGURED"]);

export async function generateReportCardRemarks(body: ReportCardRemarkBatchRequest): Promise<ReportCardRemarkBatchResult> {
  if (AI_MOCK_ENABLED) throw new Error("AI generation is switched off in demo mode. Connect the AI service to use it.");
  try {
    return (await aiHttpClient.post<ReportCardRemarkBatchResult>("api/ai/report-card-remarks/batch", body)).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const failed = (studentId: string, error: string, errorCode: string | null = null): BatchRemarkItem => ({ studentId, remark: null, basedOn: [], errorCode, error });

/**
 * Drafts remarks for a whole class in chunks, reporting every finished chunk. A failed request or a usage limit stops
 * the run; the students not reached are returned with that reason, so the teacher sees exactly who still needs one.
 */
export async function draftClassRemarks(
  examId: string,
  studentIds: string[],
  style: RemarkStyle,
  { onProgress, shouldStop }: { onProgress?: (items: BatchRemarkItem[]) => void; shouldStop?: () => boolean } = {},
): Promise<BatchRemarkItem[]> {
  const items: BatchRemarkItem[] = [];
  let stopReason: { error: string; code: string | null } | null = null;

  for (let i = 0; i < studentIds.length; i += REMARK_CHUNK_SIZE) {
    const chunk = studentIds.slice(i, i + REMARK_CHUNK_SIZE);
    if (!stopReason && shouldStop?.()) stopReason = { error: "Stopped before this student was reached.", code: "STOPPED" };
    if (stopReason) {
      items.push(...chunk.map((id) => failed(id, stopReason!.error, stopReason!.code)));
      continue;
    }
    try {
      const result = await generateReportCardRemarks({ examId, students: chunk.map((studentId) => ({ studentId })), ...style });
      items.push(...result.items);
      const stopping = result.items.find((it) => it.errorCode && STOPPING_CODES.has(it.errorCode));
      if (stopping) stopReason = { error: stopping.error ?? "AI limit reached.", code: stopping.errorCode };
    } catch (err) {
      stopReason = { error: err instanceof Error ? err.message : "The AI service could not be reached.", code: null };
      items.push(...chunk.map((id) => failed(id, stopReason!.error)));
    }
    onProgress?.([...items]);
  }
  return items;
}
