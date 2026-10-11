import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { AUTH_API_BASE_URL } from "@/lib/httpClient";
import type { OfficeAuthResult } from "../types";

/**
 * The office portal's own HTTP client. It is deliberately separate from the school clients: it never sends the school
 * token or tenant headers, and the school clients never see the office token.
 *
 * Where the tokens live:
 *  - the ACCESS token is kept only in this module's memory (never localStorage/sessionStorage), so a script injected
 *    into the page cannot read it back from storage and it disappears on reload;
 *  - the REFRESH token is an HttpOnly cookie the browser sends only to /api/office/auth, so JavaScript cannot read it
 *    at all. A reload restores the session by calling refresh, which needs that cookie.
 */
export const OFFICE_API_BASE_URL = new URL("api/office/", AUTH_API_BASE_URL).toString();

let accessToken: string | null = null;
let onSignedOut: (() => void) | null = null;

export const getOfficeToken = () => accessToken;
export const setOfficeToken = (token: string | null) => {
  accessToken = token;
};
/** The store registers how to react when the session can no longer be renewed. */
export const setOfficeSignedOutHandler = (handler: (() => void) | null) => {
  onSignedOut = handler;
};

/** A header a cross-site page cannot add; the API requires it on the cookie-driven endpoints (CSRF guard). */
const CSRF_HEADER = { "X-Office-Request": "1" } as const;

export const officeHttp = axios.create({ baseURL: OFFICE_API_BASE_URL, withCredentials: true, timeout: 30_000 });

// Calls that must never trigger a refresh-and-retry (they are the refresh, or sign-in steps that legitimately answer 401).
const NO_REFRESH = /^auth\/(login|refresh|logout|mfa\/|password\/(change-required|forgot|reset)|invite\/)/;

officeHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<OfficeAuthResult | null> | null = null;

/** One refresh at a time, however many requests found the token expired together. Resolves null when the session is over. */
export function refreshOfficeSession(): Promise<OfficeAuthResult | null> {
  refreshing ??= axios
    .post<OfficeAuthResult>(new URL("auth/refresh", OFFICE_API_BASE_URL).toString(), null, { withCredentials: true, headers: CSRF_HEADER, timeout: 15_000 })
    .then((r) => {
      accessToken = r.data.accessToken ?? null;
      return r.data;
    })
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

officeHttp.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && config && !config._retried && !NO_REFRESH.test(config.url ?? "")) {
      config._retried = true;
      const renewed = await refreshOfficeSession();
      if (renewed?.accessToken) {
        config.headers.Authorization = `Bearer ${renewed.accessToken}`;
        return officeHttp(config);
      }
      onSignedOut?.();
    }
    return Promise.reject(error);
  },
);

/** Calls for the endpoints that rely on the refresh cookie and so need the CSRF header. */
export const withCsrf = { headers: CSRF_HEADER } as const;
