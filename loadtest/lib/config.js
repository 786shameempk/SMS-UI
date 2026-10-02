// Shared settings for every k6 script. Override anything with `-e NAME=value` on the k6 command line.

export const URLS = {
  auth: __ENV.AUTH_URL || "http://localhost:5118",
  academic: __ENV.ACADEMIC_URL || "http://localhost:5136",
  finance: __ENV.FINANCE_URL || "http://localhost:5137",
  campus: __ENV.CAMPUS_URL || "http://localhost:5139",
  engagement: __ENV.ENGAGEMENT_URL || "http://localhost:5140",
  meeting: __ENV.MEETING_URL || "http://localhost:5141",
};

// Same scope headers the UI sends (src/lib/httpClient.ts); a locked-in user's JWT claim wins server-side.
export const TENANT_ID = __ENV.TENANT_ID || "tenant-educore";
export const BRANCH_ID = __ENV.BRANCH_ID || `${TENANT_ID}-main`;

// Test accounts per role, from users.json (copy users.example.json). Several accounts per role spread the load
// across users, so per-user caching on the server doesn't flatter the results.
export const USERS = JSON.parse(open(__ENV.USERS_FILE || "../users.json"));

// Load shapes, picked with `-e PROFILE=...`. `target` is concurrent virtual users at the end of each stage.
const PROFILES = {
  smoke: [
    { duration: "5s", target: 2 },
    { duration: "40s", target: 2 },
  ],
  load: [
    { duration: "1m", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  stress: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 400 },
    { duration: "1m", target: 0 },
  ],
  soak: [
    { duration: "2m", target: 40 },
    { duration: "60m", target: 40 },
    { duration: "2m", target: 0 },
  ],
};

export const PROFILE = __ENV.PROFILE || "smoke";

export function stages(scale = 1) {
  const shape = PROFILES[PROFILE];
  if (!shape) throw new Error(`Unknown PROFILE "${PROFILE}" - use one of: ${Object.keys(PROFILES).join(", ")}`);
  return shape.map((s) => ({ duration: s.duration, target: Math.max(s.target ? 1 : 0, Math.round(s.target * scale)) }));
}

// Pass/fail gates. k6 exits non-zero when one is crossed, so these also work in CI.
export const THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<800", "p(99)<2000"],
  checks: ["rate>0.99"],
  "http_req_duration{service:auth}": ["p(95)<1500"], // password hashing is slow by design
};
