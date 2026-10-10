# 06 — Security and Multi-Tenancy

## Authentication and secrets
- SS-001: `AuthService/.env` tracked in git; `Jwt:Secret` literal in five `appsettings.json` (same fingerprint `f418aebb2b`). Values not reproduced here.
- SS-008: shared HS256 key; any service holding it can mint tokens.
- SS-004: no login/refresh/forgot-password rate limit found; lockout-on-failure unverified.
- SS-005: web tokens in localStorage.

## Transport and headers
- Caddy on-demand TLS gated by an AuthService domain-check (good). SS-007: no CSP / frame-ancestors / Referrer-Policy in Caddy or nginx.
- CORS allow-lists are explicit (no wildcard).

## Multi-tenant isolation
Design: `tenant_id` claim; `X-Tenant-Id` header only for superAdmin; `X-Branch-Id` only for all-branch roles. No EF global filters (SS-009).

Live probes (local demo stack, demo credentials, read-only GETs):
| Caller | Request | Result |
|---|---|---|
| parent | `GET /api/students/{non-child}` | 404 |
| parent | `GET /api/students` | 200, 4 rows (own children of 300) |
| parent | `GET /api/homework/assigned/{non-child}` | 200, 0 rows |
| parent | fee invoices filtered to non-child | 200, 0 rows |
| parent | attendance with `studentId` query | 405 (route not supported that way) |
| student | `GET /api/students/{other}` | 404 |
| student | homework / fee invoices for other student | 200, 0 rows |

Conclusion: no cross-student read was reproduced. Cross-tenant (school A reading school B) was **not** probed because only one demo tenant was used; this remains Needs Verification and should be covered by a two-tenant integration test suite.

## Not verified
AI embeddings/vector search tenant scoping and prompt injection (AiService), blob/file path tenancy and upload validation, Redis key prefixes, SSRF on outbound calls, password-reset token handling, audit logging, `dotnet list package --vulnerable`.
