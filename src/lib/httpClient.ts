import axios, { type AxiosInstance } from "axios";
import { useAuthStore } from "@/store/authStore";

/** Base URL of AuthService (see AuthService/src/AuthService.API). Configure via .env (see .env.example). */
export const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_URL ?? "https://localhost:44348/";

/** Base URL of AcademicService (see AcademicService/src/AcademicService.API). Configure via .env. */
export const ACADEMIC_API_BASE_URL = import.meta.env.VITE_ACADEMIC_API_URL ?? "http://localhost:5136/";

/** Base URL of FinanceService (see FinanceService/src/FinanceService.API). Configure via .env. */
export const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL ?? "http://localhost:5137/";

/** Base URL of CampusService (see CampusService/src/CampusService.API). Configure via .env. */
export const CAMPUS_API_BASE_URL = import.meta.env.VITE_CAMPUS_API_URL ?? "http://localhost:5139/";

/** Base URL of EngagementService (see EngagementService/src/EngagementService.API). Configure via .env. */
export const ENGAGEMENT_API_BASE_URL = import.meta.env.VITE_ENGAGEMENT_API_URL ?? "http://localhost:5140/";

/**
 * Every backend service beyond AuthService validates the same JWT but has no way to know an
 * Admin/SuperAdmin's *currently active* tenant/branch (that's a client-side switcher, not a JWT
 * claim - see AuthService/docs/MICROSERVICES_PLAN.md's claims contract). Sending both headers on
 * every request is harmless for everyone else: a locked-in user's own JWT claim always wins
 * server-side, so this can never be used to escalate.
 */
function createServiceHttpClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL, headers: { "Content-Type": "application/json" } });

  client.interceptors.request.use((config) => {
    const { token, activeTenantId, activeBranchId } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // A request may pin its own scope (the dashboard's per-school/per-branch breakdown fetches
    // every branch, not just the active one) — only fall back to the switcher's selection.
    if (!config.headers.has("X-Tenant-Id")) config.headers["X-Tenant-Id"] = activeTenantId;
    if (!config.headers.has("X-Branch-Id")) config.headers["X-Branch-Id"] = activeBranchId;
    return config;
  });

  return client;
}

export const authHttpClient = createServiceHttpClient(AUTH_API_BASE_URL);

export const academicHttpClient = createServiceHttpClient(ACADEMIC_API_BASE_URL);

export const financeHttpClient = createServiceHttpClient(FINANCE_API_BASE_URL);

export const campusHttpClient = createServiceHttpClient(CAMPUS_API_BASE_URL);

export const engagementHttpClient = createServiceHttpClient(ENGAGEMENT_API_BASE_URL);

/** AuthService's ExceptionHandlingMiddleware always responds with this shape on failure. */
export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  errors?: Record<string, string[]> | null;
  code?: string | null;
  traceId: string;
}

export function extractApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const problem = error.response?.data as ApiProblemDetails | undefined;
    const firstFieldError = problem?.errors && Object.values(problem.errors)[0]?.[0];
    if (firstFieldError) return firstFieldError;
    if (problem?.title) return problem.title;
    if (error.message) return error.message;
  }
  return fallback;
}

/** The HTTP status code of a failed request, or undefined if `error` isn't an Axios error with a response. */
export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
