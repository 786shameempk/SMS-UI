import http from "k6/http";
import { check, fail } from "k6";
import { URLS, TENANT_ID, BRANCH_ID, USERS } from "./config.js";

// Access tokens live 15 minutes (AuthService AccessTokenExpirationMinutes); sign in again before that.
const TOKEN_TTL_MS = 12 * 60 * 1000;

// k6 gives each virtual user its own copy of module state, so this is a per-VU session.
// A user may carry its own tenantId/branchId (seeded multi-school accounts); otherwise the configured defaults apply.
const session = { role: null, token: null, issuedAt: 0, tenant: TENANT_ID, branch: BRANCH_ID };

export function pickUser(role) {
  const list = USERS[role];
  if (!list || list.length === 0) fail(`users.json has no "${role}" accounts`);
  return list[(__VU - 1) % list.length];
}

export function login(user) {
  const res = http.post(`${URLS.auth}/api/auth/login`, JSON.stringify({ email: user.email, password: user.password }), {
    headers: { "Content-Type": "application/json" },
    tags: { service: "auth", name: "POST /api/auth/login" },
  });
  const ok = check(res, { "login 200": (r) => r.status === 200 });
  return ok ? res.json("accessToken") : null;
}

/** Signs this VU in as `role`, reusing the token until it is close to expiry. */
export function ensureSession(role) {
  if (session.role === role && session.token && Date.now() - session.issuedAt < TOKEN_TTL_MS) return;
  const user = pickUser(role);
  const token = login(user);
  if (!token) fail(`login failed for role ${role}`);
  Object.assign(session, { role, token, issuedAt: Date.now(), tenant: user.tenantId ?? TENANT_ID, branch: user.branchId ?? BRANCH_ID });
}

/**
 * Authenticated GET against one service. `name` groups URLs with ids/dates into one metric row
 * (e.g. "/api/attendance/reports/daily/{date}"), so the summary stays readable.
 */
export function get(service, path, name = path) {
  const res = http.get(`${URLS[service]}${path}`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      "X-Tenant-Id": session.tenant,
      "X-Branch-Id": session.branch,
    },
    tags: { service, name: `GET ${name}` },
  });
  check(res, { [`${service} ${name} 200`]: (r) => r.status === 200 });
  if (res.status === 401) session.token = null; // force a fresh login on the next iteration
  return res;
}

/** The rows of a paged response ({ items, totalCount, ... }), or [] when the call failed. */
export function pageItems(res) {
  if (res.status !== 200) return [];
  try {
    const items = res.json("items");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

/** Parses a JSON array body, or [] when the call failed. */
export function list(res) {
  if (res.status !== 200) return [];
  try {
    const body = res.json();
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}
