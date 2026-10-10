# 10 — Testing and Build Results

All commands run locally on 2026-10-10 against the branches listed. Results are copied from real output.

| Repo / branch | Command | Result |
|---|---|---|
| SMS UI / feature/help-center | `npm run typecheck:test` | exit 0, no errors |
| SMS UI | `npx vitest run` | Tests 879 passed (879); duration 97.41 s |
| SMS UI | `npm audit --omit=dev` | found 0 vulnerabilities |
| AuthService / feature/module-entitlement | `dotnet test` | Passed 666, Failed 0 (re-run). First run: Failed 405 / Passed 261 (see note) |
| AcademicService / feature/bus-tracking-and-student-mapping | `dotnet test` | Passed 590, Failed 0 (re-run). First run: "No test is available" (see note) |
| FinanceService / feature/module-entitlement | `dotnet test` | Passed 177, Failed 0 |
| CampusService / feature/module-entitlement | `dotnet test` | Passed 339, Skipped 2, Failed 0 |
| EngagementService / feature/module-entitlement | `dotnet test` | Passed 216, Failed 0 |
| MeetingService / master | `dotnet test` | Passed 128, Failed 0 |
| AiService / feature/help-guide | `dotnet test` | Passed 224, Failed 0 |

**Note on first-run anomalies (SS-022):** a background `dotnet test` loop and a foreground run were building the same projects at the same time. The AuthService and AcademicService failures did not reproduce when run alone. Cause inferred from overlap, not proven.

## Not run
UI lint and `npm run build`; `test:coverage`; ApiGateway tests; mobile jest; `dotnet list package --vulnerable`; container scans; E2E/Playwright flows; any load test. No coverage percentages are claimed.

## Live probes
Read-only HTTP GETs against the local Docker demo stack with demo accounts (file 06). Production was not contacted.
