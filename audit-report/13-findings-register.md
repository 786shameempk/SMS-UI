# 13 — Findings Register

Audit date: 2026-10-10. Read-only audit: no source, config or database was modified. Secret values are never reproduced; only locations are given.
Confidence: **Confirmed** = observed directly (file content, command output, live probe against the local demo stack). **Probable** = strongly indicated by code, not exercised. **Needs Verification** = could not be established from what was available.

| ID | Title | Severity | Confidence | Category |
|---|---|---|---|---|
| SS-001 | Secrets committed to git / shared JWT secret literals | High | Confirmed (presence); Needs Verification (prod reuse) | Security |
| SS-002 | Production compose defaults enable demo data and mock dashboards | High | Confirmed | Config / Data integrity |
| SS-003 | Module-entitlement fixes live only on unmerged branches; running containers not rebuilt | High | Confirmed | RBAC / Release |
| SS-004 | No login throttling; rate limiting exists only on a few endpoints | Medium | Probable | Security |
| SS-005 | Access and refresh tokens stored in web localStorage | Medium | Confirmed | Security |
| SS-006 | Production compose: `:latest` tags, no healthchecks/limits, unauthenticated Redis, one shared SQL login | Medium | Confirmed | DevOps |
| SS-007 | Missing CSP / X-Frame-Options / security headers at Caddy and nginx | Medium | Confirmed | Security |
| SS-008 | One symmetric JWT key shared by every service; no strength/placeholder guard at startup | Medium | Confirmed | Security |
| SS-009 | No EF global tenant query filters; isolation depends on per-query discipline | Medium | Probable | Multi-tenancy |
| SS-010 | Subscription has no expiry date; Trial never lapses automatically | Medium | Confirmed | Subscription |
| SS-011 | Unpaged list endpoints (e.g. `GET /api/students` returned all 300 rows) | Medium | Confirmed (one endpoint); Needs Verification (rest) | Performance |
| SS-012 | Sparse optimistic concurrency on financial/attendance writes | Medium | Probable | Data integrity |
| SS-013 | Decimal precision config not found for Engagement/Meeting; Campus has no concurrency tokens | Low | Needs Verification | Data integrity |
| SS-014 | `docker-image.yml` in SMS UI may publish without the test gate | Medium | Needs Verification | CI/CD |
| SS-015 | Rate limiter / HSTS absent on Academic, Finance, Campus, Engagement | Low | Confirmed | Security |
| SS-016 | Stale `deploy/azure back up/` copy of deployment files | Low | Confirmed | DevOps hygiene |
| SS-017 | Repos on divergent feature branches; MeetingService on `master` | Low | Confirmed | Release hygiene |
| SS-018 | Single `dangerouslySetInnerHTML` use (FaqSection) | Low | Confirmed | XSS surface |
| SS-019 | Homework `assigned/{studentId}` candidate IDOR — NOT reproduced | Informational | Confirmed (negative) | Multi-tenancy |
| SS-020 | Parent/student cross-student probes blocked on students, fees, homework | Informational | Confirmed (positive) | Multi-tenancy |
| SS-021 | Mobile tokens use Keychain/Keystore (SecureStore); web fallback is localStorage (dev only) | Informational | Confirmed | Mobile |
| SS-022 | First `dotnet test` run showed spurious failures that did not reproduce | Informational | Confirmed | Testing |

Counts (22 findings) — Critical 0, High 3, Medium 10, Low 5, Informational 4.
By confidence: Confirmed 17, Probable 3 (SS-004, SS-009, SS-012), Needs Verification 2 (SS-013, SS-014); SS-001's production reuse is also unverified.

---

## SS-001 — Secrets committed to git / shared JWT secret literals
- **Severity / Confidence:** High / Confirmed (presence); production reuse Needs Verification. Escalate to Critical if the committed values are what production runs.
- **Component:** AuthService, AcademicService, FinanceService, AiService, ApiGateway
- **Location:** `AuthService/.env` (tracked in git; contains a SQL SA password and a JWT secret — values redacted); `src/*.API/appsettings.json` `Jwt:Secret` in the five services above (identical fingerprint `f418aebb2b`).
- **Evidence:** `git ls-files` lists `.env`; the same Jwt:Secret fingerprint appears in five appsettings files.
- **Problem:** Anyone with repo read access (or any past clone) can mint valid JWTs for any tenant/role if the same secret is used in production.
- **Impact:** Full authentication bypass and cross-tenant takeover.
- **Verification (safe):** Compare the production secret's fingerprint (hash only) with `f418aebb2b`; `git log --all -- AuthService/.env`.
- **Fix:** Rotate the JWT secret and SA password; remove `.env` from tracking and history; load secrets from Azure Key Vault / environment only; add `.env` to `.gitignore`.
- **Validation:** Old tokens rejected after rotation; secret scanner (gitleaks) clean on history.
- **Dependencies:** SS-008.

## SS-002 — Production compose defaults enable demo data and mock dashboards
- **Severity / Confidence:** High / Confirmed
- **Location:** `deploy/live/docker-compose.yml` (`ALLOW_DEMO_DATA`, `DASHBOARD_DATA_SOURCE` defaults true / mock); dev equivalent in `docker-compose.yml`.
- **Problem:** If the environment variables are not overridden, production dashboards can show mock figures and demo seeding paths stay enabled.
- **Impact:** Misleading financial/attendance numbers presented to real schools; demo seed risk.
- **Fix:** Default to `false` / `live`; fail startup if either is enabled outside Development.
- **Validation:** Production container reports live source; unit test on config guard.

## SS-003 — Entitlement fixes exist only on unmerged branches; containers not rebuilt
- **Severity / Confidence:** High / Confirmed
- **Location:** Branches `feature/module-entitlement` (AuthService, CampusService, FinanceService, EngagementService), `feature/help-guide` (AiService), `feature/help-center` (SMS UI). Default branches and the running local Docker containers do not include them.
- **Problem:** On the default branches, plan/role module checks in Campus, Finance and Engagement are incomplete: a tenant whose plan excludes a module, or a role without its matrix grant, can still call those APIs directly.
- **Impact:** Subscription bypass and role over-access at the API level (the UI route gate alone is not a control).
- **Fix:** Review, merge and deploy the branches together; rebuild images.
- **Validation:** Calling a non-entitled module endpoint with a valid token returns 403 on every service.
- **Dependencies:** SS-017.

## SS-004 — No login throttling; rate limiting only on leads, Meeting and AI
> **Update 2026-10-10 — remediated on the feature branches, verified locally.** Account lockout (5 failures, 30 minutes) already existed, so one account could not be guessed freely. Added: per-IP sliding limits on login (10/min), refresh (30/min) and register/forgot/reset/verify/resend (5/min), configurable under `RateLimiting`; trusted-proxy handling so the limiter and audit log see the real client behind Caddy; a clear 429 message in the UI. Live check: 13 wrong logins from one client gave ten 401s then 429s, another client was unaffected. Still open: limits on the other services, a distributed (Redis) limiter for multiple AuthService instances, and the account-lockout denial-of-service trade-off.
- **Severity / Confidence:** Medium / Probable
- **Location:** `AuthService/src/AuthService.API/Extensions/RateLimitingExtensions.cs` (only `public-leads`, 5/min/IP); `[EnableRateLimiting]` found only on LeadsController, MeetingsController, AiControllers/GenerationController. `SecuritySettings.AccountLockoutMinutes` exists.
- **Problem:** Login, refresh and password-reset have no explicit rate limit. Whether Identity lockout-on-failure is switched on was not confirmed.
- **Impact:** Credential stuffing / brute force; email-sending abuse.
- **Verification:** Review `SignInManager` `lockoutOnFailure` argument in IdentityService; test on a local account with a throwaway password.
- **Fix:** Per-IP and per-account limits on login/refresh/forgot-password; confirm lockout.

## SS-005 — Tokens in web localStorage
- **Severity / Confidence:** Medium / Confirmed
- **Location:** `src/store/authStore.ts` (zustand persist key `sms-auth`: access + refresh token).
- **Impact:** Any XSS reads long-lived refresh tokens. Mitigated by a very small XSS surface (SS-018).
- **Fix:** Refresh token in HttpOnly SameSite cookie, or shorten refresh lifetime with rotation/reuse detection.

## SS-006 — Production compose hardening gaps
- **Severity / Confidence:** Medium / Confirmed
- **Location:** `deploy/live/docker-compose.yml`.
- **Problem:** `:latest` tags (non-reproducible rollbacks); no healthchecks, restart ordering or resource limits; Redis without auth; one SQL login shared by all services.
- **Impact:** Failed deploys not detected, noisy-neighbour outages, blast radius if one service is compromised.
- **Fix:** Pin image digests/versions, add healthchecks and `depends_on: condition: service_healthy`, memory/CPU limits, Redis password/TLS, per-service SQL users.

## SS-007 — Missing browser security headers
- **Severity / Confidence:** Medium / Confirmed
- **Location:** `deploy/live/Caddyfile`, `nginx.conf` (no CSP, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy).
- **Fix:** Add CSP (including LiveKit/WebSocket origins), `frame-ancestors 'none'`, HSTS at Caddy.

## SS-008 — Shared symmetric JWT key, no startup guard
> **Update 2026-10-10 — code complete, verified locally; deployment pending.** AuthService can sign RS256 and publish `/.well-known/jwks.json`; the other seven services verify with a public key and can no longer mint tokens; all refuse to start with a missing, short or placeholder secret. Rollout is staged (see `AuthService/docs/JWT_KEY_ROLLOUT.md`). Live check of all three phases passed; after legacy was turned off, an old HS256 token got 401 from every service. **Not closed until production is rotated and `JWT_ACCEPT_LEGACY_HS256=false`.** SS-001 (the committed secret) must be rotated first.
- **Severity / Confidence:** Medium / Confirmed
- **Location:** `AuthService/src/AuthService.API/Extensions/AuthenticationServiceExtensions.cs`.
- **Problem:** Every service can mint tokens (HS256 shared key); no check for placeholder/short secret.
- **Fix:** Move to asymmetric signing (RS256/ES256, JWKS) with only AuthService holding the private key; add length/placeholder validation.

## SS-009 — No EF global tenant filters
- **Severity / Confidence:** Medium / Probable (design risk; no leak found in probes)
- **Location:** Application handlers across services use helper filters (`VisibleTo`, `TenantContext.Scoped`).
- **Problem:** A new query that forgets the helper leaks across tenants; some handlers load by id then check tenant afterwards.
- **Fix:** Add `HasQueryFilter` on tenant-owned entities; integration tests with two tenants for each controller.

## SS-010 — Subscription has no expiry
- **Severity / Confidence:** Medium / Confirmed
- **Problem:** Tenant status is Trial/Active/Suspended/Cancelled with no end date, so lapsed trials/subscriptions are only enforced by manual status change.
- **Fix:** Add `ValidUntil`; enforce in token issue and a daily job.

## SS-011 — Unpaged list endpoints
- **Severity / Confidence:** Medium / Confirmed for `GET /api/students` (300 rows returned in one response for admin); AcademicService has ~96 `ToListAsync` against ~24 `Take/Skip` usages (grep count, not proof of unpaged endpoints).
- **Impact:** Latency and memory grow with school size; large PDF/export paths at risk.
- **Fix:** Server-side paging with caps; load test before claiming capacity (none was run).

## SS-012 — Sparse optimistic concurrency
- **Severity / Confidence:** Medium / Probable
- **Evidence:** grep counts of `IsRowVersion/ConcurrencyToken/[Timestamp]`: Academic 4, Finance 3, Campus 0, Engagement 0, Meeting 3, Auth 22, Ai 9.
- **Problem:** Concurrent payment posting, invoice edits or attendance updates may overwrite each other. Transaction boundaries on payment flows were not individually traced.
- **Fix:** Row versions on invoices, payments, receipts, attendance; unique constraints for receipt/invoice numbers; idempotency keys on payment posts.

## SS-013 — Decimal precision / concurrency in some services
- **Severity / Confidence:** Low / Needs Verification
- **Evidence:** `HasPrecision` matches: Academic 129, Finance 136, Campus 97, Auth 15, Ai 15, Engagement 0, Meeting 0 (may be configured by conventions or hold no money columns).
- **Fix:** Confirm Engagement/Meeting money columns; set a model-wide decimal convention.

## SS-014 — Possible untested image publishing
- **Severity / Confidence:** Medium / Needs Verification
- **Location:** `.github/workflows/docker-image.yml` vs `docker-publish.yml` in SMS UI. Backend `docker-publish.yml` workflows gate publish on tests; no lint, vulnerability scan or deploy step exists anywhere.

## SS-015 — Rate limiter / HSTS absent in four services
- **Severity / Confidence:** Low / Confirmed (grep for `AddRateLimiter`, `UseHsts`: none in Academic, Finance, Campus, Engagement, ApiGateway). TLS is terminated at Caddy, so HSTS belongs there.

## SS-016 — Stale deployment copy
- **Severity / Confidence:** Low / Confirmed — `deploy/azure back up/`. Risk of deploying outdated config; remove or archive.

## SS-017 — Divergent branches
- **Severity / Confidence:** Low / Confirmed — AuthService/Finance/Campus/Engagement on `feature/module-entitlement`, AcademicService on `feature/bus-tracking-and-student-mapping`, AiService on `feature/help-guide`, SMS UI on `feature/help-center`, MeetingService on `master`. Test results in file 10 apply to those branches.

## SS-018 — One `dangerouslySetInnerHTML`
- **Severity / Confidence:** Low / Confirmed — `src/features/marketing/components/FaqSection.tsx`. Confirm content is static/trusted.

## SS-019 — Homework `assigned/{studentId}` candidate IDOR
- **Severity / Confidence:** Informational / Confirmed negative.
- **Evidence:** Handler loads the student by id without an ownership check, but a live probe (local demo data) with a parent token against a student who is not their child returned 200 with 0 rows; student token likewise. Data is not leaked because homework is filtered by class/branch.
- **Note:** Still add an explicit ownership check so the endpoint does not return an empty-but-200 "valid" response for other students.

## SS-020 — Cross-student probes (positive result)
Parent token → another student: `GET /api/students/{id}` 404; `GET /api/students` returned only the 4 own children; fee invoices for another student 0 rows. Student token → another student: 404 / 0 rows. Attendance with `studentId` query returned 405 (route not supported that way). Demo data only; production not touched.

## SS-021 — Mobile token storage
`SMS Mobile/packages/auth/src/storage.ts` uses expo-secure-store (Keychain/Keystore), chunked; web fallback to localStorage is intended for dev preview only. Mobile apps (staff, student, teacher) were inspected structurally only.

## SS-022 — Spurious test failures on first run
AuthService first run: 405 failed / 261 passed; AcademicService: "No test available". Both ran while another test process was building the same projects. Re-runs passed (666/666 and 590/590). Treat as run overlap, not defects; do not run test processes concurrently on the same repo.
