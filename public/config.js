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
  authApiUrl: "",
  academicApiUrl: "",
  financeApiUrl: "",
  campusApiUrl: "",
  engagementApiUrl: "",
  meetingApiUrl: "",
};
