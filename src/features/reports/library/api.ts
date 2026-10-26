import axios from "axios";
import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { ReportDescriptor, ReportPage, ReportQuery, ReportRow, ReportSummaryItem } from "./types";

/** Only filters with a value are sent; empty ones mean "no filter". */
function body(query: ReportQuery) {
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(query.filters)) if (value !== "") filters[key] = value;
  return { filters, page: query.page, pageSize: query.pageSize, sortBy: query.sortBy, sortDirection: query.sortDirection, search: query.search || undefined };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    throw new Error(extractApiErrorMessage(err));
  }
}

/** The reports this login may use: the server applies the school's plan, the role and sensitivity rules. */
export function listReportCatalog(): Promise<ReportDescriptor[]> {
  return unwrap(academicHttpClient.get<ReportDescriptor[]>("/api/reports"));
}

export function runReport(reportKey: string, query: ReportQuery, signal?: AbortSignal): Promise<ReportPage> {
  return unwrap(academicHttpClient.post<ReportPage>(`/api/reports/${encodeURIComponent(reportKey)}/query`, body(query), { signal }));
}

export const ALL_PAGES_SIZE = 200;

export interface AllRows {
  rows: ReportRow[];
  total: number;
  summary: ReportSummaryItem[];
}

/**
 * Every row matching the filters: it walks all pages (200 at a time) until the server's total is reached, with no
 * row limit, and reports progress. The same sort is used throughout, so no row repeats or goes missing.
 */
export async function fetchAllRows(
  reportKey: string,
  query: Omit<ReportQuery, "page" | "pageSize">,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<AllRows> {
  const rows: ReportRow[] = [];
  let page = 1;
  for (;;) {
    const result = await runReport(reportKey, { ...query, page, pageSize: ALL_PAGES_SIZE }, signal);
    rows.push(...result.rows);
    onProgress?.(rows.length, result.total);
    if (page >= result.totalPages || result.rows.length === 0) return { rows, total: result.total, summary: result.summary };
    page++;
  }
}

async function errorFromBlob(err: unknown): Promise<Error> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const json = JSON.parse(await err.response.data.text()) as { title?: string; errors?: Record<string, string[]> | null };
      const detail = json.errors ? Object.values(json.errors).flat().join(" ") : "";
      return new Error([json.title, detail].filter(Boolean).join(" "));
    } catch {
      /* fall through */
    }
  }
  return new Error(extractApiErrorMessage(err));
}

/** Streams every matching row from the server as CSV and saves it; returns the file name used. */
export async function downloadReportCsv(reportKey: string, query: Omit<ReportQuery, "page" | "pageSize">, signal?: AbortSignal): Promise<string> {
  try {
    const res = await academicHttpClient.post<Blob>(
      `/api/reports/${encodeURIComponent(reportKey)}/export`,
      body({ ...query, page: 1, pageSize: 25 }),
      { responseType: "blob", signal },
    );
    const disposition = String(res.headers["content-disposition"] ?? "");
    const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `${reportKey}.csv`;
    saveBlob(res.data, name);
    return name;
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    throw await errorFromBlob(err);
  }
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
