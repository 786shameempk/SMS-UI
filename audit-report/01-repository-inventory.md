# 01 — Repository Inventory

Root: `E:\Personal`. Counts come from file-system scans on 2026-10-10 (controllers = files matching `*Controller*.cs`).

| Repo | Role | Branch audited | Controllers | Unit tests (run result) |
|---|---|---|---|---|
| SMS UI | React/TS/Vite SPA, 39 feature folders, 131 test files | feature/help-center | – | 879 passed |
| AuthService | Identity, tenants, plans, role matrix, JWT | feature/module-entitlement | 16 | 666 passed |
| AcademicService | Students, attendance, homework, exams, timetable | feature/bus-tracking-and-student-mapping | 27 | 590 passed |
| FinanceService | Fees, invoices, payments, accounting, payroll | feature/module-entitlement | 11 | 177 passed |
| CampusService | Transport, hostel, library, inventory, visitors, health | feature/module-entitlement | 35 | 339 passed, 2 skipped |
| EngagementService | Communication, surveys, talents, notifications | feature/module-entitlement | 11 | 216 passed |
| MeetingService | Online classes / meetings (LiveKit) | master | 2 | 128 passed |
| AiService | Ask School AI, generation, indexing | feature/help-guide | 8 | 224 passed |
| ApiGateway | YARP gateway | not inspected for branch | – | no test run |
| SMS Mobile | Monorepo: apps staff/student/teacher; packages api, auth, live, monitoring, push, ui | feature/bus-tracking-and-student-mapping (as reported by `git branch`) | – | not run |
| Html, SMS_supportings | Static/marketing and supporting assets | not audited | – | – |

## Deployment assets (SMS UI repo)
- `docker-compose.yml` (dev stack), `deploy/live/docker-compose.yml` + `Caddyfile` (production), `deploy/azure back up/` (stale copy), `nginx.conf`.
- GitHub Actions: `docker-publish.yml`, `docker-image.yml` (UI); `docker-publish.yml` per backend.

## Technology
.NET 10 (`net10.0`) services, SQL Server / Azure SQL, Redis, LiveKit (+egress), Azurite/Azure Blob, Caddy with on-demand TLS, YARP gateway, vitest + jsdom, Playwright-core for screenshots.

## Notes
- Scope marker: Html, SMS_supportings and the ApiGateway tests were not audited.
- Test counts are from the actual runs in file 10, not attribute greps.
