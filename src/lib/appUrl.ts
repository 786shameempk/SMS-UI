/**
 * Where the signed-in application lives. On the public site the marketing page (sms-schoolsphere.com) and the
 * app (demo.sms-schoolsphere.com) are different hosts, so Sign In must be a full-page link to the app host.
 * Resolved like the API URLs: runtime config.js (appUrl), then VITE_APP_URL, then "" = same origin (local dev).
 */
const runtimeConfig: Partial<Record<string, string>> =
  (typeof window !== "undefined" && (window as Window & { __EDUCORE_CONFIG__?: Record<string, string> }).__EDUCORE_CONFIG__) || {};

export const APP_URL = (runtimeConfig.appUrl?.trim() || import.meta.env.VITE_APP_URL?.trim() || "").replace(/\/+$/, "");

/** True when the app is on another origin than this page, so a router <Link> can't reach it. */
export const isAppOnOtherOrigin = APP_URL !== "" && (typeof window === "undefined" || APP_URL !== window.location.origin);

export function appHref(path: string): string {
  return `${APP_URL}${path}`;
}

/**
 * The public marketing site (landing page), e.g. "https://sms-schoolsphere.com", when the app runs on another host.
 * Resolved like APP_URL: runtime config.js (siteUrl), then VITE_SITE_URL, then "" = same origin.
 */
export const SITE_URL = (runtimeConfig.siteUrl?.trim() || import.meta.env.VITE_SITE_URL?.trim() || "").replace(/\/+$/, "");

/** True when the marketing site is on another origin than this page, so "Back to website" must be a full link. */
export const isSiteOnOtherOrigin = SITE_URL !== "" && (typeof window === "undefined" || SITE_URL !== window.location.origin);

export function siteHref(path: string): string {
  return `${SITE_URL}${path}`;
}
