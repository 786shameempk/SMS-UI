# Demo data + load test

Two Node scripts (Node 18+, no packages to install) that talk to a School Sphere deployment through its public APIs,
signed in as the platform **SuperAdmin**. You type the password when asked; it is never stored or printed.

## 1. Seed a demo school — `seed.mjs`

Creates one new tenant (school) on the **Professional** plan and fills **each branch separately**, one module at a time.

| Level | What gets created |
|---|---|
| Tenant | School "Green Valley International School" (`greenvalley`), activated, school profile |
| Branches | "Main Campus" (created with the tenant) + "Whitefield Campus" |
| Per branch | Academic year 2026-27 + 2 terms, 6 departments, Grades 6–10 × sections A/B, 7 subjects, 12 rooms |
| | **20 staff** (12 teachers, principal/VP, accountant, librarian, nurse, warden, 2 drivers, receptionist) with salaries and qualifications, teacher-subject assignments, class teachers |
| | **60 students** with guardians and medical records |
| | Auto-generated timetables, 10 days of student + staff attendance, calendar events |
| | Homework with submissions and grades, mid-term exams with schedules, marks and remarks, lesson plans, learning resources, quizzes |
| | Question bank (8 questions) + a scheduled **online exam** for Grade 8 |
| | Admissions, staff leave requests (approved/rejected) |
| | Fee structures, Term 1 invoices, payments (paid / part-paid / instalments), discounts, a refund, chart of accounts + journal entries |
| | Library (titles, members, loans, reservations), transport (buses, drivers, 2 routes, stops, riders), hostel (rooms, boarders, attendance, fees) |
| | Inventory (categories, vendors, items, purchases, issues), health (check-ups, vaccinations, infirmary visits) |
| | Visitors and gate log, help-desk tickets, bonafide certificates |
| | Announcements, surveys, contact groups, message templates, student leave requests, parent-teacher and staff meetings |
| School-wide | Payroll for last month (one run covers every branch), 70% of payslips paid |

Totals with the defaults: **120 students and 40 staff (24 teachers)**, about 2,000 API calls, ~1 minute.

**No login accounts are created and no emails, SMS or WhatsApp messages are sent** — only records.

```bash
# from the "SMS UI" folder
node scripts/seed-demo/seed.mjs --target=https://schoolsphrere.com
```

Options: `--subdomain=greenvalley` `--school="Green Valley International School"` `--branches=2` (max 2)
`--students=60` and `--teachers=12` (per branch), `--email=superadmin@educore.dev`, `--concurrency=4`.
Use `--target=local` for the local docker stack.

It refuses to run if the subdomain already exists (so it can't double the data by accident). Each step is
independent: a failure is listed at the end and everything else still runs. Exit code 0 = every step succeeded.

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

## Removing the demo school

Platform Console → Tenants → the school → Delete. Note that this removes the tenant from AuthService; records in
the other services stay in their databases but are no longer reachable.
