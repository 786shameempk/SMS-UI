#!/bin/sh
# Runs at container start (nginx's /docker-entrypoint.d hook): writes the SPA's runtime API addresses into
# config.js from environment variables, so one image works in every environment without rebuilding.
#
#   APP_URL (marketing site: where Sign In sends people), AUTH_API_URL, ACADEMIC_API_URL, FINANCE_API_URL, CAMPUS_API_URL, ENGAGEMENT_API_URL, MEETING_API_URL, AI_API_URL
#   ALLOW_DEMO_DATA ("true" lets the dashboard show sample figures - never set it in production),
#   DASHBOARD_DATA_SOURCE ("mock" or "live": the dashboard default where demo data is allowed)
#
# Each must be reachable from the user's browser (a public URL, not a Docker service name). Unset or empty
# variables stay "", and the app then uses the addresses baked in at build time (VITE_* build args).
set -eu

# Escape backslashes and double quotes so a value can't break out of the JS string.
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

target=/usr/share/nginx/html/config.js
cat > "$target" <<EOF
window.__EDUCORE_CONFIG__ = {
  appUrl: "$(esc "${APP_URL:-}")",
  siteUrl: "$(esc "${SITE_URL:-}")",
  authApiUrl: "$(esc "${AUTH_API_URL:-}")",
  academicApiUrl: "$(esc "${ACADEMIC_API_URL:-}")",
  financeApiUrl: "$(esc "${FINANCE_API_URL:-}")",
  campusApiUrl: "$(esc "${CAMPUS_API_URL:-}")",
  engagementApiUrl: "$(esc "${ENGAGEMENT_API_URL:-}")",
  meetingApiUrl: "$(esc "${MEETING_API_URL:-}")",
  aiApiUrl: "$(esc "${AI_API_URL:-}")",
  allowDemoData: "$(esc "${ALLOW_DEMO_DATA:-}")",
  dashboardDataSource: "$(esc "${DASHBOARD_DATA_SOURCE:-}")",
};
EOF
echo "educore: wrote runtime API config to $target"
