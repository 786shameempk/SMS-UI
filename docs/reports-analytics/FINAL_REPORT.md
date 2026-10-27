# Reports & Analytics: final implementation report

Built 2026-10-26 and 2026-10-27 in seven phases. Nothing is committed (all repositories are to be committed together). Per-phase detail, rules and the verification notes are in [README.md](README.md); the plan is [PLAN.md](PLAN.md).

## 1. Outcome in one paragraph

The brief listed about 300 reports in 20 categories. **101 reports are built, work on real data, and are checked.** The others were deliberately not built because the data to answer them does not exist in the system, or would need a business rule nobody has defined; each is listed in section 4 with its reason. Reports are served by the service that owns the data (five services), merged into one library in the web app, protected by the school's plan and per-action permissions on every call, scoped to the school and branch, paged, searchable, sortable, printable, and exportable to CSV (any size, streamed) and Excel (up to about 50,000 rows).

## 2. Reports completed (101)

| Service | Count | Keys |
|---|---|---|
| AcademicService | 46 | `students.register`, `students.contacts`, `students.birthdays`, `students.class-strength`, `students.incomplete-profiles`, `students.documents`, `students.transfers`, `attendance.student-percentage`, `attendance.daily-absentees`, `attendance.summary-by-class`, `attendance.student-late`, `attendance.student-leave`, `attendance.daily-register`, `attendance.trend`, `attendance.staff-summary`, `attendance.staff-register`, `attendance.staff-late`, `attendance.corrections`, `staff.register`, `staff.contacts`, `staff.teacher-allocation`, `staff.workload`, `staff.qualifications`, `staff.experience`, `staff.profile-completion`, `staff.documents`, `staff.leave-register`, `timetable.slots`, `exams.result-register`, `exams.student-totals`, `exams.subject-performance`, `exams.grade-distribution`, `exams.missing-marks`, `admissions.register`, `admissions.contacts`, `admissions.by-class`, `admissions.enrolment-trend`, `homework.status`, `academics.lesson-plans`, `admin.class-register`, `admin.academic-years`, `parents.accounts`, `risk.attendance`, `branches.student-strength`, `branches.staff-strength`, `branches.attendance` |
| FinanceService | 13 | `fees.collection`, `fees.daily-collection`, `fees.invoices`, `fees.outstanding`, `fees.defaulters`, `fees.ageing`, `fees.concessions`, `fees.refunds`, `fees.online-payments`, `fees.structures`, `payroll.register`, `payroll.monthly-summary`, `branches.fees` |
| CampusService | 31 | `transport.allocation`, `transport.vehicles`, `transport.routes`, `transport.drivers`, `transport.tracking-status`, `hostel.allocations`, `hostel.occupancy`, `hostel.rooms`, `hostel.fees`, `hostel.attendance`, `library.catalogue`, `library.loans`, `library.overdue`, `library.fines`, `library.popular`, `inventory.stock`, `inventory.movements`, `branches.hostel`, `branches.transport`, `activities.register`, `activities.enrollments`, `activities.sessions`, `activities.student-attendance`, `activities.teams`, `groups.members`, `groups.strength`, `events.register`, `events.results`, `achievements.register`, `sustainability.campaigns`, `sustainability.measurements` |
| EngagementService | 7 | `comms.broadcasts`, `comms.deliveries`, `comms.failed`, `comms.delivery-summary`, `comms.notifications`, `comms.parent-threads`, `attendance.student-leave-requests` |
| MeetingService | 4 | `meetings.register`, `meetings.attendance`, `meetings.by-host`, `meetings.by-class` |

Rules every report follows: money is whole-net-when-paid, otherwise recorded payment, outstanding never negative; sent is never called delivered; opened is not acknowledged; unmarked days and holidays are not absences; a result with no pass mark is neither pass nor fail; the at-risk report is a stated rule (attendance below a threshold), not a prediction; personal contact and conversation reports are restricted; no message text, phone numbers, emails, credentials or coordinates are shown.

## 3. How access works

- Staff only. Parent and student logins are refused.
- A report is listed, run, printed and exported only when the caller holds the Reports module, a claim for the module that owns the data (so it follows the school's plan), and, where the report needs one, its named permission. Checked in each service on every request, never just in the UI.
- Named permissions (AuthService `StaffPermissionCatalog.Reports`, in Roles & Permissions): `Reports.Export`, `Reports.Print` (default: everyone with the module), `Reports.Finance` (default: everyone with the module), `Reports.Sensitive`, `Reports.Payroll`, `Reports.AllBranches` (default: leaders only). A token marked `Staff.Managed` is judged by its list; an older token by the defaults.
- Printing is a query marked `purpose: print` and needs `Reports.Print`; exporting needs `Reports.Export`.
- A login not locked to a branch and without `Reports.AllBranches` must choose a branch. The consolidated `branches.*` reports cover every branch of the school (never another school) and need `Reports.AllBranches`; the fee one also needs `Reports.Finance`.
- Branch, class, student and staff names are resolved through the owning service with the caller's own token; if that service is down the report says so (503, or 409 in AcademicService) rather than showing ids.

## 4. Not implemented, and why

| Not built | Reason |
|---|---|
| Sports-day fixtures, house points tables and leaderboards, per-student participation across years, a consent register | The module records results and ranks, not points or fixtures; only a yes/no consent on each enrolment is stored. (The extra-curricular reports themselves were built in Phase 8.) |
| Exam rank, top performers, term/year progress, student comparison, academic decline, academic performance by branch (C10-C14, C19-C20, P2, Q3) | The system has no overall grade, weightage, rank rule or defined "previous exam"; building them would mean inventing the rule. |
| Subscription usage reports (T) | Office-portal only (a different app and audience). |
| Parent portal usage and parent meeting participation (N4, N5) | Not recorded per parent. |
| AI usage by feature and AI-generated administrative insights (P-series) | AiService already has its own usage analytics; nothing here may claim to be AI-generated. The at-risk report is a plain rule and labelled so. |
| Payroll cost by branch / department (Q7, F) | A payslip carries no branch or department. |
| Lost/damaged books, cancelled transactions, vehicle trip history, fuel/maintenance | Not stored (tracking keeps only the latest position per vehicle). |
| Consolidated school summary (Q10), fee risk (P3), incomplete profiles (P4), trends (P5-P7) | Covered by existing reports (Defaulter List, Students with Incomplete Profiles, Attendance Trend, fee reports) or just the sum of reports already built. |
| Monthly attendance register with codes | Already exists under Attendance > Reports > Monthly (built earlier) with its A4 landscape print. |
| Server-generated PDF | Decided against: the browser's "Save as PDF" from the print preview is the PDF (letterhead, repeated header and footer, landscape, correct Malayalam and Arabic). |
| Background export jobs, stored files, export/report history | Not needed yet: CSV streams without a limit; Excel is bounded. Would need a table, a migration and file expiry. |

## 5. Files changed, by repository (all uncommitted)

- **AcademicService, FinanceService, CampusService, EngagementService, MeetingService:** `Application/Reports/` (engine: `ReportDefinition`, `ReportModels`, `ReportCsv`, `ReportXlsx`, `ReportRegistry`; `Definitions/*` per service), `API/Controllers/ReportsController.cs`, a ClosedXML package reference in each Application project, `DependencyInjection` registration, and tests under `tests/*/Reports/`. Cross-service name lookups: Finance/Campus/Engagement `IAcademicDirectory`/`IReportDirectory` and Academic/Finance/Campus `IBranchDirectory` with their `Infrastructure/Http` clients. Finance also got `ServiceUnavailableException` mapping and `StaffActionAllows` allowing more than one action on an endpoint.
- **AuthService:** `StaffPermissionCatalog.Reports` and its test.
- **ApiGateway:** `ReportCatalogController`, `ReportCatalogClient`, `ReportServices` config, tests.
- **SMS UI:** `src/features/reports/library/*` (library tab, viewer, filter panel, api, types, tests), `docker-compose.yml` (ReportServices), `docs/reports-analytics/*`.
- Earlier in the same session, separate from reports: custom Driver role in the staff Login tab (`LinkedLoginsPanel.tsx`) and the background driver trip (web `driverTripStore.ts`, `DriverTripBanner.tsx`; mobile `trip.ts`, `_layout.tsx`, `app.json`).

## 6. Database migrations

**None.** Reports only read existing tables. No new tables, columns or indexes were added in any service. (Background export jobs would be the first reason to add one.)

## 7. APIs

Each of the five services exposes, behind its normal authentication:

| Route | Purpose |
|---|---|
| `GET /api/reports` | Reports this login may use (filters, columns, default sort, orientation, sensitivity) |
| `GET /api/reports/categories` | Categories with counts |
| `GET /api/reports/access` | Whether this login may export, print, see sensitive reports, report across branches |
| `POST /api/reports/{key}/query` | One page, search, allowlisted sort, whole-set summary (`purpose: "print"` for print feeds) |
| `POST /api/reports/{key}/export[?format=csv|xlsx]` | Every filtered row: streamed CSV (default) or Excel workbook |

ApiGateway adds `GET /api/report-catalog`, a merged catalogue for clients that only know the gateway; the web app talks to each service directly and does not use it.

## 8. Remaining issues and decisions for you

1. **Server PDF: decided not to build** (browser Save as PDF stays). It would need (a) a library that shapes Malayalam and Arabic correctly, (b) fonts such as Noto installed in every service image, and (c) a licence choice: QuestPDF is free below a revenue threshold and paid above it; a library without complex-script shaping would print wrong Malayalam, so it is not an option. The browser's Save as PDF already gives the letterhead, repeated header and footer, landscape and correct scripts, so nothing is broken without it.
2. **Excel is bounded** at about 50,000 rows of 10 columns (memory); larger reports must use CSV. The user sees a clear message.
3. **Not load-tested on a large database.** Dev databases hold hundreds of students. Exam summaries are totalled in memory from small rows (fine at school scale, worth revisiting for very large tenants).
4. **Meeting reports verified with data only on SQL Server tests**, because the dev database has no meetings.
5. **Branch-name reports need AuthService reachable**; otherwise they answer with a clear error.
6. **A Campus SQL test run once took 31 minutes and reported one failure** during Phase 7; it did not reproduce on two reruns (38 of 38 passed in 35 s). The cause was not found. Same as an unexplained 2-in-1,277 web test failure noted in Phase 1.
7. **Nothing is committed.** The stray `AuthService.API` process (PID 13284) from Phase 2 may still be running and locks its build folder; stop it before building AuthService normally.

## 9. Test results (final run)

Full suites, no failures: AcademicService 960, FinanceService 304 run + 24 SQL-only skipped, CampusService 586 + 10 skipped, EngagementService 292 + 1 skipped, MeetingService 170 + 1 skipped (the skipped ones need `SMS_TEST_SQL`; the report tests of all five were run with it and pass on a real SQL Server); AuthService and ApiGateway report tests pass; SMS UI report tests 32 and `typecheck:test` clean. Live runs: Phase 6 (all six services together, 89 reports, figures equal the databases) and Phase 7 (46 Academic reports exported as Excel).
