import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

/**
 * Service base URLs, resolved in order:
 * 1. runtime config (public/config.js → window.__EDUCORE_CONFIG__) - set per deployment without rebuilding,
 *    e.g. by the Docker image's startup script;
 * 2. build-time VITE_* variables (.env locally, CI variables in a pipeline);
 * 3. the local development ports.
 * Empty strings count as "not set", so a blank config.js or an empty CI variable falls through.
 */
const runtimeConfig: Partial<Record<string, string>> =
  (typeof window !== "undefined" && (window as Window & { __EDUCORE_CONFIG__?: Record<string, string> }).__EDUCORE_CONFIG__) || {};

function resolveUrl(runtimeKey: string, buildTime: string | undefined, fallback: string): string {
  const value = runtimeConfig[runtimeKey]?.trim() || buildTime?.trim() || fallback;
  return value.endsWith("/") ? value : `${value}/`;
}

/** Base URL of AuthService (see AuthService/src/AuthService.API). */
export const AUTH_API_BASE_URL = resolveUrl("authApiUrl", import.meta.env.VITE_AUTH_API_URL, "https://localhost:44348/");

/**
 * Files (photos, documents, avatars) live in blob storage and are served by each service from short-lived signed
 * links the API returns relative to that service ("api/people-files/..."). Makes them absolute; data URLs (files not
 * moved yet, or a service without blob storage) and absolute URLs pass through unchanged.
 */
export function resolveFileUrl(url: string | null | undefined, serviceBaseUrl: string): string | undefined {
  if (!url) return undefined;
  if (/^(data:|blob:|https?:)/i.test(url)) return url;
  return new URL(url, serviceBaseUrl).toString();
}

/** Base URL of AcademicService (see AcademicService/src/AcademicService.API). */
export const ACADEMIC_API_BASE_URL = resolveUrl("academicApiUrl", import.meta.env.VITE_ACADEMIC_API_URL, "http://localhost:5136/");

/** Base URL of FinanceService (see FinanceService/src/FinanceService.API). */
export const FINANCE_API_BASE_URL = resolveUrl("financeApiUrl", import.meta.env.VITE_FINANCE_API_URL, "http://localhost:5137/");

/** Base URL of CampusService (see CampusService/src/CampusService.API). */
export const CAMPUS_API_BASE_URL = resolveUrl("campusApiUrl", import.meta.env.VITE_CAMPUS_API_URL, "http://localhost:5139/");

/** Base URL of EngagementService (see EngagementService/src/EngagementService.API). */
export const ENGAGEMENT_API_BASE_URL = resolveUrl("engagementApiUrl", import.meta.env.VITE_ENGAGEMENT_API_URL, "http://localhost:5140/");

/** Base URL of MeetingService (see MeetingService/src/MeetingService.API). */
export const MEETING_API_BASE_URL = resolveUrl("meetingApiUrl", import.meta.env.VITE_MEETING_API_URL, "http://localhost:5141/");

/**
 * Every backend service beyond AuthService validates the same JWT but has no way to know an
 * Admin/SuperAdmin's *currently active* tenant/branch (that's a client-side switcher, not a JWT
 * claim - see AuthService/docs/MICROSERVICES_PLAN.md's claims contract). Sending both headers on
 * every request is harmless for everyone else: a locked-in user's own JWT claim always wins
 * server-side, so this can never be used to escalate.
 */
/** Endpoints that must never trigger a refresh on 401 (a wrong password is a 401 too). */
const NO_REFRESH = /\/api\/auth\/(login|refresh-token|forgot-password|reset-password)/i;

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * One refresh at a time: when a burst of requests all get 401 together, they wait on the same renewal
 * instead of each spending the single-use (rotating) refresh token.
 */
let refreshInFlight: Promise<string | null> | null = null;

function renewAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    const { token, refreshToken, setTokens } = useAuthStore.getState();
    if (!token || !refreshToken) return null;
    try {
      // Plain axios, not a service client, so this call never passes through the 401 interceptor itself.
      const { data } = await axios.post<AuthResponse>(new URL("api/auth/refresh-token", AUTH_API_BASE_URL).toString(), {
        accessToken: token,
        refreshToken,
      });
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

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

  // An expired or revoked access token: renew once and replay the request. When renewal is not possible
  // the session ends, and the route guard (routes/ProtectedRoute.tsx) sends the user to the login page.
  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined;
    const signedIn = Boolean(useAuthStore.getState().token);
    if (error.response?.status !== 401 || !request || !signedIn || NO_REFRESH.test(request.url ?? "")) throw error;
    if (!request._retried) {
      request._retried = true;
      const fresh = await renewAccessToken();
      if (fresh) {
        request.headers.Authorization = `Bearer ${fresh}`;
        return client.request(request);
      }
    }
    useAuthStore.getState().clearAuth("expired");
    throw error;
  });

  return client;
}

export const authHttpClient = createServiceHttpClient(AUTH_API_BASE_URL);

export const academicHttpClient = createServiceHttpClient(ACADEMIC_API_BASE_URL);

export const financeHttpClient = createServiceHttpClient(FINANCE_API_BASE_URL);

export const campusHttpClient = createServiceHttpClient(CAMPUS_API_BASE_URL);

export const engagementHttpClient = createServiceHttpClient(ENGAGEMENT_API_BASE_URL);

export const meetingHttpClient = createServiceHttpClient(MEETING_API_BASE_URL);

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
    // No response at all: server down, offline, or blocked by CORS. Axios's own text ("Network Error",
    // "Request failed with status code 500") means nothing to a user, so say what happened instead.
    if (!error.response) return "We can't reach the server right now. Check your connection and try again.";
  }
  return fallback;
}

/** The HTTP status code of a failed request, or undefined if `error` isn't an Axios error with a response. */
export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
