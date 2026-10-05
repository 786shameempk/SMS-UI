/*
 * Runtime API addresses for EduCore (loaded by index.html before the app).
 *
 * Leave a value empty ("") to use the build-time VITE_* variable instead, which in turn falls back to the
 * local development ports. So this file changes nothing unless you fill it in.
 *
 * - Docker image: this file is rewritten when the container starts, from the AUTH_API_URL, ACADEMIC_API_URL,
 *   FINANCE_API_URL, CAMPUS_API_URL, ENGAGEMENT_API_URL and MEETING_API_URL environment variables
 *   (see docker/40-educore-config.sh), so one image works in every environment.
 * - Static hosting (Azure Static Web Apps, etc.): set the VITE_* variables at build time, or replace this
 *   file in the deployed output.
 *
 * Each URL must be reachable from the user's browser and end with a slash, e.g. "https://api.example.com/auth/".
 */
window.__EDUCORE_CONFIG__ = {
  // Public address of the application (login etc.) when it runs on a different host than this site, e.g.
  // "https://demo.sms-schoolsphere.com". Empty = same origin.
  appUrl: "",
  // Public address of the marketing site (landing page) when the application runs on a different host, e.g.
  // "https://sms-schoolsphere.com" - where the login page's "Back to website" goes. Empty = same origin.
  siteUrl: "",
  authApiUrl: "",
  academicApiUrl: "",
  financeApiUrl: "",
  campusApiUrl: "",
  engagementApiUrl: "",
  meetingApiUrl: "",
  aiApiUrl: "",
  // Dashboard sample figures. "true" allows them (never in production); dashboardDataSource picks the default.
  allowDemoData: "",
  dashboardDataSource: "",
  // Schools are reached at {subdomain}.tenantBaseDomain (greenvalley.sms-schoolsphere.com). Empty = sms-schoolsphere.com.
  tenantBaseDomain: "",
  // Comma-separated subdomains of tenantBaseDomain that are the platform itself, not a school (e.g. "www,demo"). Empty = "www".
  platformSubdomains: "",
};
