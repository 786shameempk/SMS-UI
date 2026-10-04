# Demo data + load test

Two Node scripts (Node 18+, no packages to install) that talk to a School Sphere deployment through its public APIs,
signed in as the platform **SuperAdmin**. You type the password when asked; it is never stored or printed.

## 1. Seed demo schools — `seed.mjs`

Creates the schools in [`seed-config.json`](seed-config.json) — several tenants, each with several branches, on
different plans — and fills **each branch separately**, one module at a time. **Only modules the school's plan
includes are filled** (a Starter school gets no fees or transport, as in real use); skipped steps are listed.

| School (`subdomain`) | Plan | City | Branches | Grades | Students / teachers per branch |
|---|---|---|---|---|---|
| Green Valley International School (`greenvalley`) | Enterprise | Bengaluru | 3 | 1–10 | 300 / 20 |
| Riverside Public School (`riverside`) | Professional | Kochi | 2 | 6–12 | 200 / 14 |
| Little Stars Academy (`littlestars`) | Starter | Chennai | 1 | 1–5 | 120 / 8 |

Edit the config to add schools or change sizes. The code is split per service: `seed/academic.mjs`,
`seed/finance.mjs`, `seed/campus.mjs`, `seed/engagement.mjs` (plus `seed/runner.mjs` for step reporting).

| Level | What gets created (when the plan includes the module) |
|---|---|
| Tenant | School on its plan, activated, school profile |
| Branches | "Main Campus" (created with the tenant) + the other configured branches |
| Per branch | Academic year + 2 terms, departments, a class per grade × sections A/B, 7 subjects (incl. the regional language), rooms |
| | **Staff**: teachers + principal/VP, accountant, librarian, nurse, warden, 2 drivers, receptionist, with salaries and qualifications, teacher-subject assignments, class teachers |
| | **Students** with guardians and medical records |
| | Auto-generated timetables, 10 days of student + staff attendance, calendar events |
| | Homework with submissions and grades, two unit tests and a mid-term exam per class (July-September) with schedules, marks and remarks, lesson plans, learning resources, quizzes |
| | Question bank (8 questions) + a scheduled **online exam** for Grade 8 |
| | Admissions, staff leave requests (approved/rejected) |
| | Fee structures, Term 1 invoices, payments (paid / part-paid / instalments), discounts, a refund, chart of accounts + journal entries |
| | Library (titles, members, loans, reservations), transport (buses, drivers, 2 routes, stops, riders), hostel (rooms, boarders, attendance, fees) |
| | Inventory (categories, vendors, items, purchases, issues), health (check-ups, vaccinations, infirmary visits) |
| | Visitors and gate log, help-desk tickets, bonafide certificates |
| | Announcements, surveys, contact groups, message templates, student leave requests, parent-teacher and staff meetings |
| School-wide | Payroll for last month (one run covers every branch), 70% of payslips paid |
| | Custom roles (Exam Coordinator, Front Office, Transport In-charge) with permission-matrix grants, two optional features switched on, a customised notification template, talent-showcase and meeting settings |
| Per branch (extras) | Staff work experience, performance reviews, two months of salary payments, a promotion, staff and student documents (PDFs in blob storage), timetable substitutions |
| | Learning-resource discussions, quiz attempts and resource views, in-app broadcasts (2 sent, 1 scheduled), a weekly recurring online class, meeting notes and materials |
| | Hostel mess menu and visitor log, gate watchlist (Enterprise plan) |
| Platform | A platform announcement and three global study materials |

Totals with the default config: **3 schools, 6 branches, about 1,420 students and 150 staff**.

**No login accounts are created and no emails, SMS or WhatsApp messages are sent** — only records.

```bash
# from the "SMS UI" folder; the local docker stack is the default target
node scripts/seed-demo/seed.mjs
node scripts/seed-demo/seed.mjs --tenant=riverside          # just one school
```

The "extras" (`seed/extras.mjs`) read everything back from the API, so they also fill schools seeded earlier:
`node scripts/seed-demo/seed.mjs --only=extras` adds them to every configured school and skips what is already there.

Not seeded on purpose — they only exist once people use the system: meeting chat (open only while a meeting is
live), meeting attendance and recordings, live bus locations, push devices, audit logs, refresh tokens, outbox and
processed events.

### Login accounts and what users do — `--only=logins`, `--only=activity`

```bash
# 1. Email OFF first: creating an account emails its temporary password. The seeder refuses while it is on.
SMTP_PASSWORD= docker compose --env-file .env.docker up -d --no-deps authservice
# 2. Accounts: a school admin; per branch staff by role, 15 students and 15 parents (--student-logins / --parent-logins)
node scripts/seed-demo/seed.mjs --only=logins
# 3. Sign in as them: notifications read, survey answers, parent-teacher messages, an online practice test taken
#    by students and marked by a teacher, talent showcase posts with reviews/reactions/views/a report, study materials
node scripts/seed-demo/seed.mjs --only=activity
# 4. Email back on
docker compose --env-file .env.docker up -d --no-deps authservice
```

Accounts use `.example` addresses, are linked to their student / guardian / staff records, and share one dev
password. They are listed with that password in `scripts/seed-demo/seed-users.json` (gitignored, never printed).
Both steps skip what already exists, so they can be re-run.

### Checking coverage — `coverage.mjs`

```bash
node scripts/seed-demo/coverage.mjs
```

Counts the rows of every table in every service database per seeded school (via `sqlcmd` inside the SQL Server
container, which reads its own SA password) and writes `loadtest/results/coverage.md`. Tables are marked filled,
**GAP** (the school's plan includes the module but it has no rows), **EMPTY** (no rows anywhere), not in plan, or
runtime-only. After a full seed: 130 of 158 tables filled, 0 gaps, 0 empty, 28 runtime-only.

### k6 load tests with the seeded accounts — `loadtest-users.mjs`

```bash
node scripts/seed-demo/loadtest-users.mjs      # writes loadtest/users.seeded.json (gitignored)
k6 run -e USERS_FILE=../users.seeded.json -e PROFILE=load loadtest/scenarios/mixed.js
```

Each user carries its school and branch, so the k6 journeys (`loadtest/`) run as real teachers, parents and
admins across all the seeded schools instead of three shared demo accounts.

Options: `--tenant=a,b` (subdomains from the config), `--only=extras|fill|logins|activity` (`fill` = campus modules and
surveys for branches that lack them, e.g. after a plan upgrade), `--config=other.json`, `--branches=N` `--students=N`
`--teachers=N` (override every school), `--email=superadmin@educore.dev`, `--concurrency=4`.
A deployed site needs `--target=https://… --allow-prod`.

A school whose subdomain already exists is skipped (so a re-run only adds the missing schools and never doubles
data); `--reuse-tenant` adds to it anyway. People and numbers come from a fixed seed per school and branch, so a
fresh database gets the same data every time. Each step is independent: a failure is listed at the end and
everything else still runs. Exit code 0 = every step succeeded.

To see the data: sign in as SuperAdmin, pick the school in the tenant switcher (top bar), then switch branches.

## 2. Load test — `loadtest.mjs`

Read-only. Virtual users repeatedly open the most-used screens (dashboards, student lists and profiles, attendance,
timetables, exams and results, fees, library, transport, hostel, notifications, meetings) for the seeded school,
then it prints requests/second, latency percentiles and errors per endpoint. It never writes data.

```bash
node scripts/seed-demo/loadtest.mjs --target=https://schoolsphrere.com --users=20 --duration=60
```

Options: `--users` (max 100), `--duration` seconds (max 600), `--ramp` seconds to reach all users, `--think` ms
pause between a user's clicks (default 500 — a realistic pace; lower = heavier), `--subdomain`.

Start small on production (20 users), watch `docker stats` on the VM, then step up. Run it outside school hours.

Local reference (docker on a dev PC):

| users | think | req/s | p95 | errors |
|---|---|---|---|---|
| 30 | 300 ms | 88 | 17 ms | 0 |
| 100 | 50 ms | 796 | 212 ms | 0 |

Slowest under load: online-exams dashboard, exam class results, attendance daily report.

## Known issues found while building this

- **Parallel fee payments fail (500).** FinanceService numbers receipts as `count + 1`
  (`FinanceService.Application/Common/PaymentRecorder.cs`), so two payments recorded at the same moment get the same
  receipt number and the second hits the unique index. Real users can hit this (two cashiers at once). The seeder
  records payments one at a time to avoid it.
- **Parallel homework submissions fail (500).** A submit backfills "pending" rows for the whole class
  (`AcademicService.Application/Common/HomeworkEligibility.cs`), so students submitting the same homework at the same
  moment hit the unique index on `HomeworkSubmissions` and SQL deadlocks. The seeder submits one at a time.

## Removing the demo school

Platform Console → Tenants → the school → Delete. Note that this removes the tenant from AuthService; records in
the other services stay in their databases but are no longer reachable.
