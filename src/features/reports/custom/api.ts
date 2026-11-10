import axios from "axios";
import type { AxiosInstance } from "axios";
import { academicHttpClient, campusHttpClient, extractApiErrorMessage, financeHttpClient } from "@/lib/httpClient";
import { saveBlob } from "../library/api";
import type {
  AuditEntry, CustomReportDefinition, CustomReportDetail, CustomReportPage, CustomReportSummary, DatasetCatalog, DatasetDescriptor, FieldValues, ListScope, ReportService, ReportShare, ServiceAccess,
} from "./types";

const BASE = "/api/custom-reports";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    throw new Error(extractApiErrorMessage(err));
  }
}

async function blobError(err: unknown): Promise<Error> {
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

// ── Data sources: each service owns and runs its own; saved reports are kept by AcademicService ──
const CLIENTS: Record<ReportService, AxiosInstance> = { academic: academicHttpClient, finance: financeHttpClient, campus: campusHttpClient };
const clientFor = (service?: ReportService) => CLIENTS[service ?? "academic"] ?? academicHttpClient;

interface ServiceCatalog extends ServiceAccess {
  datasets: DatasetDescriptor[];
}

/** The data sources this login may use, merged across services. A service that is down is reported, not fatal. */
export async function getDatasets(): Promise<DatasetCatalog> {
  const entries = Object.entries(CLIENTS) as [ReportService, AxiosInstance][];
  const results = await Promise.allSettled(entries.map(async ([service, client]) => ({ service, data: await unwrap(client.get<ServiceCatalog>(`${BASE}/datasets`)) })));
  const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (ok.length === 0) {
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw failure?.reason instanceof Error ? failure.reason : new Error("The report data sources could not be loaded.");
  }
  return {
    datasets: ok.flatMap((r) => r.data.datasets.map((d) => ({ ...d, service: r.service }))).sort((a, b) => a.title.localeCompare(b.title)),
    access: Object.fromEntries(ok.map((r) => [r.service, { canExport: r.data.canExport, canPrint: r.data.canPrint, canSeeSensitive: r.data.canSeeSensitive }])),
    unavailable: entries.map(([s]) => s).filter((s) => !ok.some((r) => r.service === s)),
  };
}

const NO_ACCESS: ServiceAccess = { canExport: false, canPrint: false, canSeeSensitive: false };

/** What this login may do with the report data of the service that owns <paramref name="dataset"/>. */
export const accessFor = (catalog: DatasetCatalog, dataset?: DatasetDescriptor | null): ServiceAccess => catalog.access[dataset?.service ?? "academic"] ?? NO_ACCESS;

export const getFieldValues = (dataset: string, field: string, search?: string, signal?: AbortSignal, service?: ReportService) =>
  unwrap(clientFor(service).get<FieldValues>(`${BASE}/datasets/${encodeURIComponent(dataset)}/fields/${encodeURIComponent(field)}/values`, { params: { search: search || undefined }, signal }));

// ── Running ──
export const previewReport = (datasetKey: string, definition: CustomReportDefinition, page: number, pageSize: number, signal?: AbortSignal, purpose?: "print", service?: ReportService) =>
  unwrap(clientFor(service).post<CustomReportPage>(`${BASE}/preview`, { datasetKey, definition, page, pageSize }, { signal, params: { purpose } }));

export const runSavedReport = (id: string, page: number, pageSize: number, signal?: AbortSignal, purpose?: "print") =>
  unwrap(academicHttpClient.post<CustomReportPage>(`${BASE}/${id}/run`, { page, pageSize }, { signal, params: { purpose } }));

export type CustomExportFormat = "csv" | "xlsx";

/** Has the server build every matching row, from the unsaved builder state or a saved report, and saves the file. */
export async function downloadCustomExport(
  source: { kind: "draft"; datasetKey: string; definition: CustomReportDefinition; service?: ReportService; recordId?: string } | { kind: "saved"; id: string },
  format: CustomExportFormat,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const res = source.kind === "saved"
      ? await academicHttpClient.post<Blob>(`${BASE}/${source.id}/export`, null, { responseType: "blob", signal, params: { format } })
      : await clientFor(source.service).post<Blob>(`${BASE}/export`, { datasetKey: source.datasetKey, definition: source.definition, page: 1, pageSize: 25 }, { responseType: "blob", signal, params: { format } });
    const disposition = String(res.headers["content-disposition"] ?? "");
    const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `custom-report.${format}`;
    saveBlob(res.data, name);
    // A saved report on another service's data is run there; tell the service that keeps the report.
    if (source.kind === "draft" && source.recordId) await recordCustomRun(source.recordId, "exported").catch(() => undefined);
    return name;
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    throw await blobError(err);
  }
}

/** Largest number of rows fetched into the browser for a printout; bigger reports go to CSV or Excel, which stream on the server. */
export const PRINT_ROW_LIMIT = 5000;

/** Every row (up to the print limit) for the print layout, 200 at a time with the same ordering throughout. */
export async function fetchPrintRows(
  fetchPage: (page: number, pageSize: number) => Promise<CustomReportPage>,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ first: CustomReportPage; rows: CustomReportPage["rows"] }> {
  const rows: CustomReportPage["rows"] = [];
  let first: CustomReportPage | undefined;
  for (let page = 1; ; page++) {
    const result = await fetchPage(page, 200);
    first ??= result;
    if (result.total > PRINT_ROW_LIMIT) throw new Error(`This report has ${result.total.toLocaleString()} records, which is too many to print at once. Narrow the filters, or export it as CSV or Excel.`);
    rows.push(...result.rows);
    onProgress?.(rows.length, result.total);
    if (page >= result.totalPages || result.rows.length === 0) return { first, rows };
  }
}

// ── Saved reports ──
export interface SaveRequest {
  name: string;
  description?: string | null;
  datasetKey: string;
  definition: CustomReportDefinition;
}

export const listCustomReports = (scope: ListScope = "all") => unwrap(academicHttpClient.get<CustomReportSummary[]>(BASE, { params: { scope } }));
export const getCustomReport = (id: string) => unwrap(academicHttpClient.get<CustomReportDetail>(`${BASE}/${id}`));
export const createCustomReport = (body: SaveRequest) => unwrap(academicHttpClient.post<CustomReportDetail>(BASE, body));
export const updateCustomReport = (id: string, body: SaveRequest) => unwrap(academicHttpClient.put<CustomReportDetail>(`${BASE}/${id}`, body));
export const renameCustomReport = (id: string, name: string, description?: string | null) => unwrap(academicHttpClient.patch<CustomReportDetail>(`${BASE}/${id}/rename`, { name, description }));
export const duplicateCustomReport = (id: string) => unwrap(academicHttpClient.post<CustomReportDetail>(`${BASE}/${id}/duplicate`));
export const deleteCustomReport = (id: string) => unwrap(academicHttpClient.delete<void>(`${BASE}/${id}`));
export const setCustomFavourite = (id: string, on: boolean) => unwrap(on ? academicHttpClient.put<void>(`${BASE}/${id}/favourite`) : academicHttpClient.delete<void>(`${BASE}/${id}/favourite`));
export const setCustomDefault = (id: string, on: boolean) => unwrap(on ? academicHttpClient.put<void>(`${BASE}/${id}/default`) : academicHttpClient.delete<void>(`${BASE}/${id}/default`));
export const shareCustomReport = (id: string, visibility: "Private" | "Shared", shares: ReportShare[]) => unwrap(academicHttpClient.put<CustomReportDetail>(`${BASE}/${id}/sharing`, { visibility, shares }));
/** For a saved report run by another service: records the run (last generated, run count, history) where the report is kept. */
export const recordCustomRun = (id: string, kind: "run" | "exported") => unwrap(academicHttpClient.post<void>(`${BASE}/${id}/record-run`, null, { params: { kind } }));
export const getCustomReportHistory = (id: string) => unwrap(academicHttpClient.get<AuditEntry[]>(`${BASE}/${id}/history`));
