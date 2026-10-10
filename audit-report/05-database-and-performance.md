# 05 — Database and Performance

Database: SQL Server (Azure SQL in production), EF Core, one shared SQL login across services in production (SS-006).

## Evidence (grep counts on source, not runtime proof)
| Service | `HasPrecision`/decimal column config | Concurrency tokens (`IsRowVersion`, `ConcurrencyToken`, `[Timestamp]`) |
|---|---|---|
| AuthService | 15 | 22 |
| AcademicService | 129 | 4 |
| FinanceService | 136 | 3 |
| CampusService | 97 | 0 |
| EngagementService | 0 | 0 |
| MeetingService | 0 | 3 |
| AiService | 15 | 9 |

## Findings
- **SS-011** `GET /api/students` returned all 300 demo students in one response for an admin. AcademicService has ~96 `ToListAsync` against ~24 `Skip/Take` occurrences. Needs endpoint-by-endpoint review.
- **SS-012** Financial and attendance writes have few concurrency tokens; payment posting, receipt/invoice numbering and attendance edits should use row versions, unique constraints and idempotency keys.
- **SS-013** Engagement and Meeting show no decimal configuration; confirm they hold no money columns.
- Role matrix state in the demo database was inspected through read-only queries (roles, `RoleMatrixPermissions`, plan `IncludedModules`); no writes.

## Not verified
Index coverage and query plans, foreign-key/cascade rules, N+1 patterns, soft-delete/audit consistency, UTC vs local time handling, backup/restore, migration safety, any numeric capacity. No load test was run, so **no concurrency or throughput claims are made**.
