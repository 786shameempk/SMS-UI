# Load tests (k6)

Load tests for the EduCore backend services the UI talks to. The UI itself is static files behind nginx, so the
load that matters lands on the .NET services: Auth `5118`, Academic `5136`, Finance `5137`, Campus `5139`,
Engagement `5140` and Meeting `5141`.

## Setup

1. Install k6 (one-time): `winget install k6 --source winget`
2. Create the test accounts file (it is gitignored):
   `copy loadtest\users.example.json loadtest\users.json`, then fill in the passwords from
   `AuthService/src/AuthService.Infrastructure/Persistence/ApplicationDbContextInitializer.cs`.
   Add more accounts per role to spread load across users.
3. Start the services (Release build or Docker for meaningful numbers; Debug `dotnet run` is much slower).
4. Seed realistic data (safe to re-run; it tops up to the targets):
   `node loadtest/seed-data.mjs` creates Grades 1-10 with sections A/B, 300 students, term + annual fee invoices
   (most paid, some partial or overdue, with receipts) and 30 school days of attendance (~9,000 records).
   Scale up with `--students 1000 --days 60`.

Run every command from the repo root.

## Scripts

| Script | What it simulates |
| --- | --- |
| `scenarios/mixed.js` | **Main test.** Admins (10%), teachers (30%) and parents (60%) clicking through dashboard, attendance, homework, exams and fees pages, with think time between pages. |
| `scenarios/login-rush.js` | Everyone signing in at 8 AM. Login hashes passwords, so it is CPU-bound and often the first bottleneck. |
| `scenarios/endpoint.js` | One endpoint under load, to dig into a slow one that `mixed.js` surfaced. |

All journeys are read-only (GET), so they're safe to repeat without polluting data.

## Profiles

Pick the load shape with `-e PROFILE=...` (defined in `lib/config.js`):

| Profile | Shape | Use it to |
| --- | --- | --- |
| `smoke` (default) | 2 users, 45 s | check the scripts and services work |
| `load` | ramp to 50 users, hold 3 min | confirm normal peak traffic is fine |
| `stress` | step up to 400 users | find the breaking point |
| `soak` | 40 users for 1 hour | catch memory leaks, pool exhaustion, token expiry bugs |

## Examples

```bash
k6 run loadtest/scenarios/mixed.js
k6 run -e PROFILE=load loadtest/scenarios/mixed.js
k6 run -e PROFILE=stress loadtest/scenarios/login-rush.js
k6 run -e PROFILE=load -e SERVICE=finance -e ENDPOINT=/api/feeinvoices loadtest/scenarios/endpoint.js
```

Live dashboard in the browser plus an HTML report:

```powershell
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="loadtest/results/report.html"; k6 run -e PROFILE=load loadtest/scenarios/mixed.js
```

Point at another environment (never production) by overriding URLs:
`-e AUTH_URL=https://staging-auth.example.com -e ACADEMIC_URL=...` (see `lib/config.js` for all names).

## Reading results

- k6 fails the run (exit code ≠ 0) when a threshold in `lib/config.js` is crossed: more than 1% errors, p95 over
  800 ms, or p99 over 2 s.
- Each request is tagged with `service` and a `name` such as `GET /api/students`, so the summary shows which service
  and endpoint is slow.
- Watch the servers at the same time: `dotnet-counters monitor -n AcademicService.API` (CPU, GC, thread pool),
  `docker stats`, and slow queries in SQL Server.
- Seed realistic data volumes first (hundreds of students, invoices, attendance rows). On a near-empty database
  everything looks fast.
