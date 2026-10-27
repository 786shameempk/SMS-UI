import axios from "axios";
import type { AxiosInstance } from "axios";
import { academicHttpClient, campusHttpClient, engagementHttpClient, extractApiErrorMessage, financeHttpClient, meetingHttpClient } from "@/lib/httpClient";
import type { ReportAccess, ReportDescriptor, ReportPage, ReportQuery, ReportRow, ReportSummaryItem } from "./types";

/** Only filters with a value are sent; empty ones mean "no filter". */
function body(query: ReportQuery) {
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(query.filters)) if (value !== "") filters[key] = value;
  return { filters, page: query.page, pageSize: query.pageSize, sortBy: query.sortBy, sortDirection: query.sortDirection, search: query.search || undefined, purpose: query.purpose };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    throw new Error(extractApiErrorMessage(err));
  }
}

/**
 * The services that own report data, and their clients. Each lists only the reports its own plan, permission and
 * tenant/branch rules allow, and runs and exports them itself: add a service here when it gets a /api/reports endpoint.
 */
const REPORT_SERVICES: Record<string, AxiosInstance> = {
  academic: academicHttpClient,
  finance: financeHttpClient,
  campus: campusHttpClient,
  engagement: engagementHttpClient,
  meeting: meetingHttpClient,
};

const DEFAULT_SERVICE = "academic";

function clientFor(service: string | undefined): AxiosInstance {
  return REPORT_SERVICES[service ?? DEFAULT_SERVICE] ?? academicHttpClient;
}

export interface ReportCatalog {
  reports: ReportDescriptor[];
  /** Per service: the actions this login may take. */
  access: Record<string, ReportAccess>;
}

const NO_ACCESS: ReportAccess = { canExport: false, canPrint: false, canSeeSensitive: false, canSeeAllBranches: false };

/**
 * The reports this login may use, merged across services. A service that can't be reached is left out so one service
 * being down never empties the library; if every service fails, the first error is shown.
 */
export async function listReportCatalog(): Promise<ReportCatalog> {
  const results = await Promise.allSettled(
    Object.entries(REPORT_SERVICES).map(async ([service, client]) => {
      const reports = await unwrap(client.get<ReportDescriptor[]>("/api/reports"));
      const access = await unwrap(client.get<ReportAccess>("/api/reports/access")).catch(() => NO_ACCESS);
      return { service, reports: reports.map((r) => ({ ...r, service })), access };
    }),
  );
  const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (ok.length === 0) {
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failure) throw failure.reason instanceof Error ? failure.reason : new Error("The report list could not be loaded.");
  }
  return {
    reports: ok.flatMap((r) => r.reports),
    access: Object.fromEntries(ok.map((r) => [r.service, r.access])),
  };
}

export function runReport(reportKey: string, query: ReportQuery, signal?: AbortSignal, service?: string): Promise<ReportPage> {
  return unwrap(clientFor(service).post<ReportPage>(`/api/reports/${encodeURIComponent(reportKey)}/query`, body(query), { signal }));
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
  service?: string,
): Promise<AllRows> {
  const rows: ReportRow[] = [];
  let page = 1;
  for (;;) {
    const result = await runReport(reportKey, { ...query, page, pageSize: ALL_PAGES_SIZE }, signal, service);
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

export type ExportFormat = "csv" | "xlsx";

/**
 * Has the server build every matching row as a file and saves it; returns the file name used. CSV streams with no size limit;
 * an Excel workbook has Summary and Data sheets and is refused by the server (with a message) when it would be too large.
 */
export async function downloadReportExport(
  reportKey: string,
  query: Omit<ReportQuery, "page" | "pageSize">,
  format: ExportFormat,
  signal?: AbortSignal,
  service?: string,
): Promise<string> {
  try {
    const res = await clientFor(service).post<Blob>(
      `/api/reports/${encodeURIComponent(reportKey)}/export`,
      body({ ...query, page: 1, pageSize: 25 }),
      { responseType: "blob", signal, params: { format } },
    );
    const disposition = String(res.headers["content-disposition"] ?? "");
    const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `${reportKey}.${format}`;
    saveBlob(res.data, name);
    return name;
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    throw await errorFromBlob(err);
  }
}

export const downloadReportCsv = (reportKey: string, query: Omit<ReportQuery, "page" | "pageSize">, signal?: AbortSignal, service?: string) =>
  downloadReportExport(reportKey, query, "csv", signal, service);

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
