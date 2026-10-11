import { officeHttp } from "./http";
import type { Paged } from "../types";
import type { Alert, AlertSummary, MaintenanceResult, OfficeCompany, OfficeDashboard, OfficeSettingsView, ReportInfo, ReportTable } from "../opsTypes";

const clean = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== "all" && v !== null));

export const getDashboard = async (q: { from?: string; to?: string; planId?: string }) => (await officeHttp.get<OfficeDashboard>("dashboard", { params: clean(q) })).data;

export const listAlerts = async (q: { status?: string; severity?: string; kind?: string; assignedTo?: string; page?: number; pageSize?: number }) =>
  (await officeHttp.get<Paged<Alert>>("alerts", { params: clean(q) })).data;
export const alertSummary = async () => (await officeHttp.get<AlertSummary>("alerts/summary")).data;
export const acknowledgeAlert = async (id: string) => (await officeHttp.post<Alert>(`alerts/${id}/acknowledge`)).data;
export const assignAlert = async (id: string, userId: string | null) => (await officeHttp.put<Alert>(`alerts/${id}/assignee`, { userId })).data;
export const resolveAlert = async (id: string, note: string) => (await officeHttp.post<Alert>(`alerts/${id}/resolve`, { note })).data;
export const scanAlerts = async () => (await officeHttp.post<{ raised: number; refreshed: number; autoResolved: number }>("alerts/scan")).data;

export const listReports = async () => (await officeHttp.get<ReportInfo[]>("reports")).data;
export const runReport = async (key: string, q: { from?: string; to?: string }) => (await officeHttp.get<ReportTable>(`reports/${key}`, { params: clean(q) })).data;
/** The CSV is behind the bearer token, so it is fetched and saved from memory rather than linked. */
export const downloadReportCsv = async (key: string, q: { from?: string; to?: string }) => (await officeHttp.get<Blob>(`reports/${key}/csv`, { params: clean(q), responseType: "blob" })).data;

export const getOfficeSettings = async () => (await officeHttp.get<OfficeSettingsView>("settings")).data;
export const updateCompany = async (body: OfficeCompany) => (await officeHttp.put<OfficeSettingsView>("settings/company", body)).data;
export const runMaintenanceNow = async () => (await officeHttp.post<MaintenanceResult>("settings/jobs/run")).data;
