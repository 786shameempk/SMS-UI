# 04 — Backend Audit

## Architecture
Clean-architecture services (API / Application / Domain / Infrastructure), MediatR-style handlers, per-service JWT validation with a shared key, CORS from `Cors:AllowedOrigins`, direct browser-to-service calls plus a YARP gateway.

## Observations (evidence-based)
| Area | Observation | Ref |
|---|---|---|
| Authentication | HS256 symmetric key shared by Auth, Academic, Finance, Ai, Gateway; no strength/placeholder check | SS-001, SS-008 |
| CORS | Allow-list from config on every service, `AllowCredentials`; correct pattern (no wildcard) | – |
| Rate limiting | Only Auth (leads), Meeting (join/upload/chat), Ai (`ai` policy); none on Academic/Finance/Campus/Engagement | SS-004, SS-015 |
| HTTPS | `UseHttpsRedirection` everywhere; TLS ends at Caddy; no HSTS in app | SS-015 |
| Tenant resolution | `tenant_id` claim; `X-Tenant-Id` honoured only for superAdmin; `X-Branch-Id` only for all-branch roles (`CampusService/.../CurrentUserService.cs`) | positive |
| Tenant filtering | Helper-based; no global query filters | SS-009 |
| Authorization | Academic: policy provider; Campus: `RequiresModule/RequiresPermission/FamilyAllowed` + `ModuleAccessFilter`; Finance: `FinanceAccessFilter`; Engagement: policies + `ModuleAccessFilter`; Ai: `IAiTool` audiences | SS-003 |
| Code markers | 0 `TODO/FIXME/NotImplementedException` found across service and UI sources | positive |
| Dockerfiles | All run `USER $APP_UID`; Academic/Engagement/Meeting briefly switch to root for an install step then back | Informational |

## Handler sample reviewed
- `GetAssignedHomeworkQueryHandler` / `GetSubmissionsForHomework…`: tenant/branch applied to homework, student looked up by id with no ownership check; live probe returned 0 rows for others (SS-019).
- `TalentEngagementCommands.cs`: looks up the record, then checks tenant (acceptable).

## Not verified
DI lifetimes, cancellation-token propagation, sync-over-async, HttpClient timeouts/Polly, exception/log PII scrubbing, background-job idempotency, ApiGateway route table review.
