# 12 — Prioritized Remediation Roadmap

Estimates are preliminary (engineer-days, one engineer) and exclude review/QA wait time. Nothing here has been started; the audit was read-only.

## P0 — before any further production release
| Task | Findings | Est. |
|---|---|---|
| Rotate JWT secret and SA password; purge `.env` from history; move secrets to Key Vault; add secret scan to CI | SS-001 | 1–2 d |
| Merge/release entitlement branches across Auth, Campus, Finance, Engagement, Ai, UI; rebuild images | SS-003 | 2–3 d incl. regression |
| Production compose: demo off, live dashboards, startup guard | SS-002 | 0.5 d |

## P1 — within 2–4 weeks
| Task | Findings | Est. |
|---|---|---|
| Login/refresh/forgot-password rate limits; verify lockout | SS-004, SS-015 | 1–2 d |
| Pin image versions, healthchecks, limits, Redis auth, per-service SQL users | SS-006 | 2–3 d |
| Security headers at Caddy/nginx | SS-007 | 0.5–1 d |
| Subscription expiry (`ValidUntil`) + enforcement | SS-010 | 2–3 d |
| Two-tenant isolation integration tests per controller | SS-009 | 4–6 d |
| Confirm UI image workflow test gate; add scan/lint stages | SS-014 | 1 d |

## P2 — within a quarter
| Task | Findings | Est. |
|---|---|---|
| Server-side paging + caps on list endpoints | SS-011 | 3–5 d |
| Row versions, unique constraints, idempotency on payments/invoices/attendance | SS-012, SS-013 | 4–6 d |
| Asymmetric JWT signing / JWKS | SS-008 | 3–4 d |
| Refresh token to HttpOnly cookie or rotation with reuse detection | SS-005 | 3–4 d |
| EF global tenant query filters | SS-009 | 4–5 d |
| Dedicated AI security pass (tenant scoping, prompt injection, cost caps) | file 08 | 3–5 d |

## P3 — hygiene
Remove stale `deploy/azure back up/` (SS-016); consolidate branches (SS-017); review the single raw-HTML render (SS-018); add explicit ownership check to homework `assigned/{studentId}` (SS-019); document SS-022 (don't run concurrent test processes); load testing and backup-restore drill.

## Gaps this audit left (suggested follow-up audits)
Mobile build/run and offline sync tests; blob storage tenancy; Redis key scoping; email/LiveKit failure drills; per-module E2E for the 39 modules; package vulnerability scan for .NET.
