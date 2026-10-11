import { academicHttpClient, authHttpClient, campusHttpClient, engagementHttpClient, financeHttpClient } from "@/lib/httpClient";
import { toIsoDate } from "../dateRange";
import { fetchScopeSummary } from "../scopeApi";
import { getAcademicSummary, getFeeSummary, type AcademicSummary, type FeeSummary, type SummaryRange } from "../sources/summaryApi";
import type {
  AcademicsSummary,
  AdmissionsSummary,
  BranchComparisonRow,
  CampusSummary,
  EngagementSummary,
  FinanceSummary,
  HelpdeskSummary,
  HrSummary,
  TeacherSummary,
} from "./types";

/**
 * The dashboard tabs' aggregation endpoints. Like the Overview's two summaries, each is one request that the service
 * scopes to the caller's school and branch, refuses without access (403) and caches for a minute.
 */

const params = (range: SummaryRange) => ({ from: toIsoDate(range.start), to: toIsoDate(range.end), today: toIsoDate(new Date()) });

export const getAdmissionsSummary = async (range: SummaryRange) =>
  (await academicHttpClient.get<AdmissionsSummary>("/api/dashboard/admissions-summary", { params: params(range) })).data;

export const getHrSummary = async (range: SummaryRange) =>
  (await academicHttpClient.get<HrSummary>("/api/dashboard/hr-summary", { params: params(range) })).data;

export const getAcademicsSummary = async (range: SummaryRange) =>
  (await academicHttpClient.get<AcademicsSummary>("/api/dashboard/academics-summary", { params: params(range) })).data;

export const getTeacherSummary = async (range: SummaryRange) =>
  (await academicHttpClient.get<TeacherSummary>("/api/dashboard/teacher-summary", { params: params(range) })).data;

export const getFinanceSummary = async (range: SummaryRange) =>
  (await financeHttpClient.get<FinanceSummary>("/api/dashboard/finance-summary", { params: params(range) })).data;

export const getCampusSummary = async () =>
  (await campusHttpClient.get<CampusSummary>("/api/dashboard/campus-summary", { params: { today: toIsoDate(new Date()) } })).data;

export const getHelpdeskSummary = async (range: SummaryRange) =>
  (await campusHttpClient.get<HelpdeskSummary>("/api/dashboard/helpdesk-summary", { params: params(range) })).data;

export const getEngagementSummary = async (range: SummaryRange) =>
  (await engagementHttpClient.get<EngagementSummary>("/api/dashboard/engagement-summary", { params: params(range) })).data;

interface BranchRow {
  id: string;
  name: string;
  status: "Active" | "Inactive";
}

/** Each active branch's own headline numbers, side by side. Only for roles that cover every branch. */
export async function getBranchComparison(tenantId: string, range: SummaryRange): Promise<BranchComparisonRow[]> {
  const { data } = await authHttpClient.get<BranchRow[]>("/api/branches", { headers: { "X-Tenant-Id": tenantId } });
  const branches = data.filter((b) => b.status === "Active");
  return Promise.all(
    branches.map(async (b) => {
      const { metrics } = await fetchScopeSummary("segregated", tenantId, b.id, range);
      return { id: b.id, name: b.name, ...metrics };
    }),
  );
}

/**
 * What the Executive tab is made of. Each part is fetched on its own and may be missing: the principal sees fees
 * only if they can open Fees, and so on. `failed` lists the parts that errored for any reason other than access.
 */
export interface ExecutiveData {
  academic: AcademicSummary | null;
  fees: FeeSummary | null;
  academics: AcademicsSummary | null;
  admissions: AdmissionsSummary | null;
  hr: HrSummary | null;
  helpdesk: HelpdeskSummary | null;
  branches: BranchComparisonRow[] | null;
  failed: string[];
}

export async function getExecutiveData(range: SummaryRange, tenantId: string, includeBranches: boolean): Promise<ExecutiveData> {
  const parts = {
    academic: getAcademicSummary(range),
    fees: getFeeSummary(range),
    academics: getAcademicsSummary(range),
    admissions: getAdmissionsSummary(range),
    hr: getHrSummary(range),
    helpdesk: getHelpdeskSummary(range),
    branches: includeBranches ? getBranchComparison(tenantId, range) : Promise.resolve(null),
  };
  const names = Object.keys(parts) as Array<keyof typeof parts>;
  const settled = await Promise.allSettled(names.map((n) => parts[n]));
  const result: Record<string, unknown> = {};
  const failed: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") result[names[i]] = r.value;
    else {
      result[names[i]] = null;
      const status = (r.reason as { response?: { status?: number } } | undefined)?.response?.status;
      // 401/403/404: the role simply has no access to that part, which is not an error to report.
      if (status !== 401 && status !== 403 && status !== 404) failed.push(names[i]);
    }
  });
  if (settled.every((r) => r.status === "rejected") && failed.length > 0) throw new Error("Couldn't load the school's figures.");
  return { ...(result as unknown as Omit<ExecutiveData, "failed">), failed };
}
