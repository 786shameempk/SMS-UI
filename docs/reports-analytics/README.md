# Reports & Analytics: report library (phases 1 and 2)

Phase 1 (foundation + 10 reports) and phase 2 (9 examination and admissions reports) built 2026-10-26. This is **19 working reports**, not the whole 300-report catalogue in the brief. Every report listed as built below runs on real data, was exercised against SQL Server through the Docker stack, and is covered by tests. Everything else is listed under "Not built" with the reason.

## What exists

**Backend (AcademicService)** - `src/AcademicService.Application/Reports/` and `API/Controllers/ReportsController.cs`

| Route | Purpose |
|---|---|
| `GET /api/reports` | The reports this login may use (descriptor: filters, columns, default sort, orientation, sensitivity). |
| `GET /api/reports/categories` | Categories with counts, for the same login. |
| `POST /api/reports/{key}/query` | One page + search + allowlisted sort + a summary over the **whole filtered set**. |
| `POST /api/reports/{key}/export` | Streams **every** matching row as UTF-8 CSV (BOM, formula-safe). No row cap; read in batches of 1,000 so memory stays flat. |

Design: a report is a class (`ReportDefinition<TRow>`) that supplies its filtered, tenant/branch-scoped `IQueryable`, its search, its sort allowlist, its row shape and its summary. The shared engine does validation, paging, sorting, summary, streaming and export, so no report can be asked for an arbitrary column, table or SQL. Reports register themselves (assembly scan in `Application/DependencyInjection.cs`); adding one is one class. Row types are plain classes with object-initialiser projections: EF cannot sort or group on a member of a constructor-projected record (found and fixed during live testing).

**Frontend** - `src/features/reports/library/`, shown as the first tab ("Report library") of the existing Reports page. The nine existing dashboard tabs are untouched.

`ReportLibraryTab` (search, category chips, recently opened - kept in this browser only), `ReportViewer`, `ReportFilterPanel` (date presets, reset/apply/refresh), `dateRanges.ts`, `format.ts`, `printReport.ts`, `api.ts`, progress/cancel dialog.

## Access rules (enforced on the server for every call, including export)

A report is available only when **all** hold:

1. The login is a staff login (parents/students get 403 from the controller policy).
2. It holds `module.reports` (the "Reports & Analytics" module: plan feature + role matrix).
3. It holds one claim for the data module the report reads (`module.students`, `module.attendance`, `module.staff`).
4. If the report is marked `Sensitive` (contact registers), the login's role is admin or principal.

Teachers hold `module.students/staff/attendance` as navigation flags but not `module.reports`, so they see nothing and get 403 on a direct call (verified live). No new permission claims were invented: the brief's `Reports.Export`, `Reports.Print`, `Reports.ViewAllBranches` etc. do not exist in AuthService, and the existing claim set is `module.*`. Export and print therefore follow the same entitlement as viewing. Splitting them needs new claims in AuthService first.
Tenant and branch: every query goes through `VisibleTo` (students) or the same tenant/branch filter the existing handlers use; a branch-locked login cannot pick another branch (the `branchId` filter is ignored for them).

## Reports built

| Key | Brief item(s) | Notes |
|---|---|---|
| `students.register` | A1 Complete Student Register, A2/A3 class/division lists, A8 active/inactive, A9 transferred, A10 graduated, A5/A6 admission register/new admissions (via admitted-from/to) | filters: year, branch, class, section, status, gender, admission dates |
| `students.contacts` | A13 contact, A14 address, A15 guardian register | Sensitive |
| `students.class-strength` | A16 Class Strength, A24 Status Summary | active vs capacity |
| `students.birthdays` | A11 | by month |
| `attendance.student-percentage` | B13, B14 (below threshold), B6 | marked days only; late/half-day count as attended; holidays/unmarked never absences |
| `attendance.daily-absentees` | B8 | |
| `attendance.summary-by-class` | B16, B24 | |
| `attendance.staff-summary` | B19, B20, B23 | |
| `staff.register` | E1, E2, E4, E5, E6, E7, E20 | no salary, no contact |
| `staff.contacts` | E8 | Sensitive |

Print/PDF/CSV for all of them: Print current page or all filtered records (browser print preview; "Save as PDF" there downloads), Export CSV current page or all filtered records, Load all records (progress + cancel), page sizes 10/25/50/100/200, first/prev/next/last, sortable columns, in-report search, empty/error/loading states.

## Phase 2: examination and admissions reports

Category "Academic and Examination Reports" needs `module.reports` + `module.examinations`; "Admissions and Enrolment Reports" needs `module.reports` + `module.students` (where the Admissions tab already lives). New filter lists: terms, exams (follow the chosen class), subjects.

| Key | Brief item(s) | Notes |
|---|---|---|
| `exams.result-register` | C1 class results, C3 subject-wise marks register, C18 students below pass marks, C16-ish absentees | one row per student, subject and exam; filter Result = Pass / Fail / Absent |
| `exams.student-totals` | C2 student-wise results, C4 class mark sheet, C5 individual mark sheet (filter by student search) | totals exclude absent subjects |
| `exams.subject-performance` | C8 exam performance summary, C9 subject performance analysis, C15 class comparison | average, highest, lowest, pass rate per exam and subject |
| `exams.grade-distribution` | C6 | absent results are not graded and are left out |
| `exams.missing-marks` | C17 | active students with no entry (an "absent" entry counts as entered) for a scheduled subject |
| `admissions.register` | M1, M2, M4, M5, M6, M7 | stage/decision/class/gender/submitted-date filters; pending = stage filter |
| `admissions.contacts` | M | Sensitive (admin/principal): guardian phone, email, address |
| `admissions.by-class` | M3, M8, M12 | conversion = enrolled / applications |
| `admissions.enrolment-trend` | M11 | per month of submission |

Rules honoured: pass/fail comes only from the **pass mark on the exam schedule** for that subject; where none is set the result shows blank and is counted as neither passed nor failed (never guessed). Pass rate is over judged results only. No overall grade, rank or weightage is calculated, because none is configured in the data: C10 (rank), C19 (top performers), C12-C14 (term/year progress and student comparison), C11, C20 are not built for that reason. Exam summaries are totalled from small per-result rows in memory (numbers only), since SQL cannot aggregate over the per-subject pass-mark join; fine at school scale (3,600 results here), worth revisiting for very large tenants.

Verified live on SQL Server: all 9 reports return pages, sort by every sortable column, search, and export CSV with row count equal to the total. The dev database has exam data (3,600 results) but **no admission applications**, so the admissions reports were verified live only as empty results (queries translate and run) and with data in unit tests.

## Not built (and why)

- **Data lives in other services** - Fees & Financial (D), Payroll (F), Transport (G), Hostel (H), Library (I), Communication (J, EngagementService), Online classes (K, MeetingService), Multi-branch consolidated (Q, cross-service). The contract (`/api/reports/...`) is service-agnostic: each service needs its own `ReportsController` + definitions, and the library tab must merge catalogues from each service's client. Finance/payroll reports also need explicit finance/payroll claims, which the current `module.*` claims do not separate from general access.
- **Data is in AcademicService but not built yet** - exam rank/progress/comparison (C10-C14, C19-C20), assignments/homework/lesson plan/syllabus (C21-C26), timetable (C28, E12), admission document verification and enquiries (M9, M10), most remaining student/staff reports (promotion history, TC register, document verification, incomplete profiles, leave register, workload), extracurricular (L), parent engagement (N), administration/import history (O).
- **Monthly attendance register with attendance codes and holidays** - the existing Attendance > Reports > Monthly tab and its A4-landscape register print (built earlier) already cover B2; it was not re-implemented here.
- **Background export jobs, export history, report-generation history (`/exports/{jobId}`, `/history`)** - not built. Export is a streamed download (no row limit, flat memory) and print/Load-all fetch in 200-row pages with progress, which avoids loading everything on one request but still holds the rows in browser memory; a background job + stored file is the next step for very large schools. No new tables or migrations were added.
- **Native PDF and .xlsx** - superseded: Excel (.xlsx) is built on the server since Phase 7. PDF is still the browser's Save as PDF from the print preview (see "Phase 7").
- **AI insights (P)** - not built; the AI service has its own at-risk flows.
- **Subscription usage reports (T)** - office-portal only; not built.
- **School timezone** - presets use the browser's local date; there is no per-school timezone setting in the code base to read.
- **"Specific examination period" as a date preset** - exams are filtered by the Term and Examination selectors instead.
- **Chrome-only footer** - "Page X of Y" in the printed footer uses CSS margin boxes (Chrome 131+); other browsers still get the in-page footer.

## Files

AcademicService (new): `Application/Reports/{ReportModels,ReportDefinition,ReportCsv}.cs`, `Application/Reports/Definitions/{StudentReports,AttendanceAndStaffReports}.cs`, `API/Controllers/ReportsController.cs`, `tests/AcademicService.UnitTests/Reports/ReportTests.cs`. Changed: `Application/DependencyInjection.cs`.
SMS UI (new): `src/features/reports/library/*` (+ `library.test.ts`). Changed: `src/features/reports/pages/ReportsPage.tsx`, `src/features/attendance/components/MarkAttendanceTab.tsx` (earlier fix).

## Deployment

No migrations, no new config, no new gateway route (`/services/academic/api/reports/...` rides the existing academic route). Rebuild the AcademicService image and the UI image.

## Verification

- AcademicService unit tests: 918 pass (20 in `ReportTests`, 13 more in `ExamAndAdmissionReportTests`: entitlement matrix, tenant/branch isolation, filters, paging with no repeated/missing rows, summary over the whole set, validation errors, attendance rules, 2,350-row streamed export, CSV formula injection and Malayalam).
- SMS UI: 1,277 tests pass (23 new). One earlier full run showed 2 failures that did not reproduce on two reruns; not diagnosed.
- Live (Docker, SQL Server): `docs/reports-analytics/check-reports.mjs` (needs the Docker stack and the seeded admin login) ran every report: first page, every sortable column, search, and CSV export, with export row count equal to the report total; teacher gets an empty list and 403 on direct query/export, parent 403, no token 401.
- Browser: library, filters, paging, sorting, Load all (300 of 300), print-all HTML (300 rows, repeated header, letterhead, totals once) and CSV-all (300 rows).
- Not done: real print dialog / PDF output on paper, multi-page print layout in a real browser, performance on realistic large volumes (only 300 students / 7,000 attendance rows in the dev database), cross-tenant check on a live second tenant (unit-tested only).

## Phase 2: shared platform (built 2026-10-27, no new reports)

**New report permissions** (AuthService `StaffPermissionCatalog.Reports`, shown in Roles & Permissions with the other staff actions): `Reports.Export`, `Reports.Print` (default: anyone with the Reports module), `Reports.Sensitive`, `Reports.Finance`, `Reports.Payroll`, `Reports.AllBranches` (default: leaders only until a school configures the role). Same rule as the syllabus actions: a token with `Staff.Managed` is judged by its list, an older token by the default.

**Enforced in AcademicService on every request** (`ReportRegistry.Can`, `ReportsController`):
- `Sensitive` reports need `Reports.Sensitive` (was: a hard-coded admin/principal check). A report can also name a `RequiredAction` (for finance/payroll reports later).
- `POST .../export` needs `Reports.Export`. A query marked `purpose: "print"` needs `Reports.Print` (the browser sends it for the pages that feed a print; an on-screen view is unaffected).
- A login not locked to a branch and without `Reports.AllBranches` must pick a branch, so its report never silently covers every branch.
- `GET /api/reports/access` tells the UI which of these the login has; Print and Export buttons are only shown when allowed (the server refuses regardless).

**Catalogue across services.** The UI merges `/api/reports` + `/api/reports/access` from every service listed in `REPORT_SERVICES` (`library/api.ts`); a service that is down is left out rather than emptying the library. Today only `academic` is listed; add a service there when it gets a reports endpoint (Phases 4-6). Each report carries its `service`, so query/export/print go to the owner. The gateway also has `GET /api/report-catalog` (`ReportCatalogController`, config `ReportServices`, set in docker-compose) that fans out to the services with the caller's own credentials. The web UI does not use it because it talks to each service directly; it is there for clients that only know the gateway.

**Library tab:** "Frequently used" (opened twice or more in this browser, top three) beside "Recently opened".

**Tests:** AcademicService report tests 44 (4 of them new: action defaults, no-module, print/export refusal, branch rule), AuthService 1038 plus the new catalogue-defaults test (17 permission tests pass), ApiGateway 10, SMS UI reports 28, `typecheck:test` clean.

**Not done in Phase 2 (deliberately):** the cross-tab (monthly register style) report type and multi-sheet export have no consumer until Phase 3/7, so they were not built speculatively. Export/print audit is logged by the service logger only; no audit table was added. Not yet verified through the Docker stack with a rebuilt AcademicService/AuthService image.

## Phase 3: more AcademicService reports (built 2026-10-27)

22 new reports (41 in total), all on the same engine. Every one has a test that runs it on data with each sort (asc and desc), search and the CSV stream, plus rule tests for the points below. **Verified on SQLite (unit tests) only; not yet run against SQL Server** (see "Not verified").

| Key | Brief item(s) | Notes |
|---|---|---|
| `attendance.daily-register` | B1, B4, B5 | every active student of a class/section for one date; unmarked students show "Not marked", never absent; percentage is over marked students only |
| `attendance.student-late` | B9 | with arrival time where the method recorded it |
| `attendance.student-leave` | B11 | students only have the attendance mark "Leave"; there are no student leave requests, so B12 (pending/approved) is staff-only |
| `attendance.trend` | B18 | only days with attendance appear, so holidays are not dips |
| `attendance.staff-register` | B19, B20 | check-in/out times; status filter |
| `attendance.staff-late` | B21 | |
| `staff.leave-register` | B22, E17, B12 | overlap with the period; days are inclusive calendar days |
| `attendance.corrections` | B25 | requests with who asked/decided; the separate audit trail is not reported |
| `staff.teacher-allocation` | E9, E10, C29 | teacher x subject x class x academic year |
| `staff.workload` | E11 | periods a week from the timetable (breaks excluded) and allocations |
| `timetable.slots` | C28, E12 | class timetable (pick a section) or teacher timetable (pick a teacher); new category "Timetable and Academic Planning Reports" |
| `staff.qualifications` | E14 | |
| `staff.experience` | E15 | |
| `staff.profile-completion` | E16 | lists only incomplete staff and what is missing |
| `staff.documents` | E13 | documents present by type; **verification is not recorded**, so this is "what is on file", not "verified" |
| `students.incomplete-profiles` | A22 | lists only incomplete students and what is missing |
| `students.documents` | A21 | same caveat as staff documents |
| `students.transfers` | A9 (TC part), A20 | transfer date, school, reason, TC number |
| `homework.status` | C21, C22, C23 | expected = active students of the section (or class); only Submitted/Graded count as handed in |
| `academics.lesson-plans` | C24 (register and approval) | topic-level completion is the Syllabus & Portions module's own report |
| `admin.class-register` | O14 | capacity vs active students |
| `admin.academic-years` | O13 | terms, classes, students |

The report filters gained a Teacher list (`teachers` source, from the teachers API).

**Deliberately not built (no data or already covered):** consecutive-absence (B15) needs a run-length over dates that SQL cannot do on this model without loading rows; early departure (B10) and subject-wise attendance (B7) are not recorded for students; student promotion/progression (A19), enrollment history (A23) and consolidated student report (A25) have no history table; C25/C26 syllabus and portion completion already exist in the Portions module (`Portions.Reports`); rank/progress/top performers still wait on a ranking configuration; parent engagement (N), extracurricular (L) and the import-history reports (O9, O10) live in other services or have no stored history.

**Verified live on SQL Server (2026-10-27):** AcademicService run against the local `AcademicServiceDb` (tenant-educore) with a locally minted admin token. All 41 reports: the query, every sortable column in both directions, search, and the CSV export whose row count equals the total. The live check found a real bug that the SQLite tests could not: Teacher Workload showed 0 periods for the principal, who teaches all the school's timetabled periods, because it only listed staff with the Teacher designation. It now lists any active staff who has timetable periods or subject allocations, plus all active teachers (regression test added). The dev database is small (4 students, 2 staff, 1 homework), so this proves the queries translate and run on SQL Server and the counts agree with the data, not their speed on a large school; the per-row counts (homework, workload, academic years, documents) are the ones to watch there.

## Phase 4: FinanceService reports (built 2026-10-27)

12 reports in FinanceService (53 in total across the two services), on a copy of the report engine (`FinanceService.Application/Reports`). The UI merges them into the same library: `finance` is now listed in `REPORT_SERVICES` (`library/api.ts`).

**Why names need a second service.** FinanceService stores only a student id. The class filter, the student search and the Student / Admission no. / Class columns are resolved through AcademicService with the caller's own token (`IAcademicDirectory`, four new calls: students by ids, student search, class and section labels, staff). The engine got two hooks for this (`PrepareAsync` before the query, `EnrichAsync` per page or export batch). If AcademicService cannot be reached the report answers 503 "...school directory... could not be reached" rather than a generic 500; reports that need no names (daily collection, ageing, payroll by month, fee structure's amounts) are unaffected. Student, admission-number and class columns are therefore not sortable, and the class filter takes at most the students of one class.

| Key | Brief item(s) | Notes |
|---|---|---|
| `fees.collection` | D2, D3, D5, D6, D14, D15 (filter), D22 | receipts only: pending and failed payments have no receipt, refunds are not netted; filters year/class/fee type/mode |
| `fees.daily-collection` | D3, D4, D23, D15, D24 (branch filter), D25 (year filter) | one row per day split cash/card/online/cheque |
| `fees.invoices` | D1, D11, D13 | demand and collection position over the filtered invoices |
| `fees.outstanding` | D8, D9, D26 (class filter), D27 | overdue = balance past due as of a chosen date |
| `fees.defaulters` | D10, D27 | per-student total of overdue balances |
| `fees.ageing` | D29 | 0 / 1-30 / 31-60 / 61-90 / 90+ days |
| `fees.concessions` | D18, D19, D28 | scholarships and waivers are recorded as discounts, so they are one report by scheme name |
| `fees.refunds` | D20 | with the payment gateway's own status; a gateway-failed refund is not money returned |
| `fees.online-payments` | D16, D17 | only Paid is collected; Created (not completed) and Failed are shown apart |
| `fees.structures` | D12 | |
| `payroll.register` | F1, F2 (search by staff), F8 (run status), F9 (payment status), F10 (month range) | confidential; names from AcademicService; shows basic, allowances, deductions, gross and net per slip |
| `payroll.monthly-summary` | F14 | each month's gross, deductions, net, released pay and whether the run is finalised |

**Money rules** follow the dashboard: an invoice that is Paid has collected its whole net amount and owes nothing; otherwise collected is the recorded paid amount and the balance is net minus that (never negative).

**Permissions.** Fee reports need the Reports module, the fees or accounting module and `Reports.Finance`; payroll reports need the Reports module, the payroll module and `Reports.Payroll`. Defaults when a school has not configured roles: finance reports for anyone who has the modules (so accountants keep them), payroll for leaders only. (This changed `Reports.Finance` in AuthService from leaders-only to everyone-with-the-module; payroll stays leaders-only.) Export and print follow the same `Reports.Export` / `Reports.Print` rules as AcademicService. The report calls are POSTs only because they carry filters; FinanceAccessFilter lets staff holding `Reports.Finance` or `Reports.Payroll` make them, and nothing else about the write rules changed.

**Verified:** 301 FinanceService tests pass, including the 21 report tests. The same reports (every sort both ways, search, CSV stream equal to total, and the money totals) also run on a real SQL Server database created from the real migrations (`SMS_TEST_SQL=Server=localhost\MSSQLSERVER_2022;Trusted_Connection=True;TrustServerCertificate=True;`). Live: FinanceService and AcademicService run together against the local databases; all 12 reports return, and the receipt total (15,000), billed net (31,560), outstanding (19,560), refunds (3,000) and payroll net (86,000) equal the figures summed directly in SQL. AuthService 1039 and the web reports tests (30) pass.

**Not built, and why:** cancelled transactions (D21) and financial reconciliation (D30) have no cancelled/reconciled state in the data; refunds against a fee type, class-wise totals as grouped rows (D6, D26) and branch/year grouped rows (D24, D25) are filters plus summaries rather than grouped reports, because the class lives in another service; payroll by department or branch (F3, F12, F13) because a payslip stores no department or branch, a separate allowances/deductions breakdown (F4-F6; the register shows the totals only), overtime (F7) and payroll audit (F15) because none is recorded. The dev FinanceServiceDb is migrated by the service on first start (it applied its pending migrations during this check).

## Phase 5: CampusService reports (built 2026-10-27)

17 reports in CampusService (70 in total across the three services), on another copy of the engine (`CampusService.Application/Reports`), with the same hooks and rules as FinanceService. `campus` is now in `REPORT_SERVICES` (`library/api.ts`). People still live in AcademicService, so student, staff and class names are resolved there with the caller's token (`IAcademicDirectory` gained four calls: names of students whatever their status, students in a class, student search, staff); an unreachable directory gives a 503 with a clear message, and reports that need no names (book catalogue, stock) are unaffected. The filter panel gained lists for routes, vehicles, hostels and the book and stock categories.

| Key | Brief item(s) | Notes |
|---|---|---|
| `library.catalogue` | I1, I2, I3 | copies owned, on the shelf and on loan; available-only and all-out filters |
| `library.loans` | I4, I5, I6, I8, I12 | issued register, return register, and a member's history (search a name or membership no.); date, class, member type and status filters |
| `library.overdue` | I7 | unreturned past the due date as of a chosen day (computed from the due date, not the stored status) |
| `library.fines` | I10, I11 | collected vs outstanding |
| `library.popular` | I13 | titles by times issued in a period |
| `inventory.stock` | stock register and valuation | value, low stock, out of stock |
| `inventory.movements` | purchases, issues, adjustments | with vendor, who it was issued to, value |
| `transport.allocation` | G1, G2, G3 | route-wise and vehicle-wise lists via filters |
| `transport.vehicles` | G6, G8, G9 | capacity vs allocated students, routes run |
| `transport.routes` | G10, G4 | vehicle, driver, stops, students; flags routes with no vehicle or driver |
| `transport.drivers` | G7 | licence expiry filter; **restricted** (licence numbers) |
| `transport.tracking-status` | G14 (partly) | when each vehicle last reported; **restricted**; see below |
| `hostel.allocations` | H1, H4, H6, H12 | residents, discharges, admissions by date, history |
| `hostel.occupancy` | H2, H10 | per hostel with its warden; beds count rooms in service only |
| `hostel.rooms` | H3, H5 | free-beds and full-rooms filters; a room under maintenance is never offered |
| `hostel.fees` | H7, H8 | collected vs outstanding by month |
| `hostel.attendance` | H9 | only marked days |

**Found by the real SQL Server:** the tracking table (`BusPositions`) has a unique index per vehicle, so it holds only the *latest* position and never a history. A "trip history by day" report (G14) would have been invented, so it was not built; Tracking Status shows the last report per vehicle and which vehicles have gone quiet, and never shows coordinates.

**Permissions.** Library, transport, hostel and inventory reports need the Reports module plus the data module (`module.library`, `module.transport`, `module.hostel`, `module.inventory`); the two restricted reports also need `Reports.Sensitive` (leaders by default). No new permissions were added. Export, print and the branch rule are the same as in the other services.

**Verified:** 580 CampusService tests pass, including 27 report tests, the same reports run on a real SQL Server database built from the migrations (every sort both ways, search, CSV stream equal to total, and several totals), and a live run of CampusService with AcademicService against the local databases: all 17 return, and the book, copy, loan, fine, seat and transport-fee totals equal the figures summed directly in SQL, with real student and staff names. The dev database has no hostel or inventory rows, so those were verified live as empty results and with data in the SQL Server tests.

**Not built, and why:** lost or damaged books (I9: no such state on a loan), library inventory audit (I14), book return register as its own report (it is the Returned filter of the loans report), transport fee outstanding (G5: transport fees are fee invoices in FinanceService; use Outstanding Fees with fee type Bus), transport attendance, maintenance and incidents (G11-G13: not recorded), allocation changes (G15: no history), hostel maintenance (H11: only a room status), hostel fee collection by receipt (H7 is by month entries here). Extra-curricular reports (L) are in CampusService too but were not part of this phase.

## Phase 6: Engagement, Meeting, AI and multi-branch reports (built 2026-10-27)

**89 reports now** across five services (academic 46, finance 13, campus 19, engagement 7, meeting 4). `engagement` and `meeting` are in `REPORT_SERVICES` (`library/api.ts`); the filter panel gained no new lists.

**EngagementService (7), school-wide** (its records belong to the school, not a branch, so there is no branch rule). Student names, classes, the class filter and name search come from AcademicService with the caller's token (`IReportDirectory`); an unreachable directory gives a 503 with a message.
| Key | Brief item(s) | Notes |
|---|---|---|
| `comms.broadcasts` | J1, J11, J12 | notices and messages with channels, recipients and what became of each; Scheduled filter for messages not sent yet |
| `comms.deliveries` | J4-J6, J10 | per message, recipient and channel with the **stage kept apart**: Queued, Sending, Sent (handed to the provider), Delivered (confirmed), Read, Failed, Bounced, Skipped. Sent is never called delivered. Phone numbers and email addresses are not shown |
| `comms.failed` | J7 | failed and bounced with the provider's error and attempts |
| `comms.delivery-summary` | J8 | per day and channel; confirmed delivery over attempts that were not skipped |
| `comms.notifications` | J9, N6 | how many people opened each in-app notification. **Opened is not acknowledged**: there is no signature or acknowledgement, only a read |
| `comms.parent-threads` | J3, J10, N7 | who wrote to whom, about which student, how many messages each side and when; **never the text**; restricted |
| `attendance.student-leave-requests` | B11, B12 | student leave requests (these live here, not in AcademicService) with pending, approved, rejected |

**MeetingService (4).** Meetings are stored in UTC, so the school's own time zone (from its meeting settings; unknown ones fall back to UTC) decides which day a meeting is on and the times shown: a class at 08:30 in Kolkata is 03:00 UTC.
`meetings.register` (K1-K4, K8, K10: with planned and held minutes and the attendance the meeting recorded), `meetings.attendance` (K5, K7: only what the integration captured, overrides marked, no one is "absent" unless recorded), `meetings.by-host` (K4, K9), `meetings.by-class` (K3).

**AcademicService, 5 more.**
- `parents.accounts` (N1, N2, N8): parents with their student, contacts and whether they have a sign-in (activation %). Restricted. Only whether a sign-in exists is shown; no credentials, tokens or invitation links.
- `risk.attendance` (P1): **a rule, not an AI prediction**, and the description, summary and report say so: attendance below a threshold (default 75%) with at least a minimum of marked days (default 5) in the chosen period; unmarked days and holidays are not absences. "Reviewed" shows whether someone dismissed the student from the AI at-risk list. Needs `module.aiFeatures`.
- Consolidated, all branches at once: `branches.student-strength` (Q1), `branches.staff-strength` (Q6), `branches.attendance` (Q2).
**FinanceService:** `branches.fees` (Q4, Q5). **CampusService:** `branches.hostel` (Q9), `branches.transport` (Q8).

**Multi-branch rules.** The consolidated reports need `Reports.AllBranches` (leaders by default); fee ones also need `Reports.Finance`. They ignore the selected branch by design and cover the whole school (never another school). Branch names come from AuthService (`IBranchDirectory` in the three services, with the caller's token); if it cannot be reached the report says so (503/409).

**Verified:** AcademicService 954, FinanceService 328, CampusService 590, EngagementService 292, MeetingService 171, AuthService unchanged; web reports 31. Every new report was also run on a real SQL Server (`SMS_TEST_SQL`; Engagement and Meeting got their own throwaway-database fixtures) with every sort both ways, search and the CSV stream equal to the total. Live: all six services (AuthService on a spare port for branch names) run together against the local databases, all 89 reports return, branch names resolve ("Main Campus"), and the Engagement figures (8 deliveries, 3 broadcasts, 30 notifications, 2 reads, 1 leave request), branch fee and transport totals equal the database. The dev Meeting database holds no meetings, so Meeting was verified live as empty results and with data in the SQL Server tests.

**Real SQL Server caught:** the unique indexes on receipt numbers, order ids, payroll months, driver staff ids and vehicle positions, all in my test data (the in-memory provider never complains), and that tracking holds only the latest position per vehicle (Phase 5).

**Not built, and why:** AI usage by feature is already provided by AiService's own usage analytics, so the engine was not ported there; academic decline (P2), fee risk (P3: use Defaulter List), incomplete profiles (P4: Students with Incomplete Profiles), and the trends (P5-P7: Attendance Trend, Fee Collection reports) are covered by existing reports or need a defined "previous exam", and AI-generated administrative insights (P10) are not generated here: nothing is presented as an AI result. Parent portal usage (N4) and parent meeting participation (N5): not recorded per parent. Payroll cost by branch (Q7): a payslip has no branch. Academic performance by branch (Q3) and the consolidated school summary (Q10): the former needs an overall result the data does not define, the latter is the sum of the reports above. Extra-curricular reports (L) are still not built.

## Phase 7: Excel export, hardening and the final report (built 2026-10-27)

**Excel (.xlsx) export, server side, all five services.** `POST /api/reports/{key}/export?format=xlsx` (no `format`, or `format=csv`, is the streamed CSV exactly as before; anything else is a 400). The same permission (`Reports.Export`), validation, tenant/branch scoping and branch rule as CSV apply, because it is the same action in the same controller.
- **Summary sheet:** report title and description, when it was generated (UTC), record count, search text, sort, the filters that were set (a fixed option shows its label; a list taken from the school's own data shows "selected", never a raw id), and the same whole-set totals the screen shows.
- **Data sheet:** every filtered row, in the report's column order. Numbers, currency and percentages are real numbers with number formats, dates are real dates (`dd-mmm-yyyy`), yes/no is text. Header row bold, frozen and filterable. Set up to print on A4 (landscape when the report is landscape or has more than 6 columns), fit to page width, header row repeated on every page, title in the page header and "Page X of Y" in the footer.
- **Text is never a formula.** Cells are stored as text, so `=1+1` is shown as typed (CSV prefixes an apostrophe instead). Control characters a workbook cannot hold are replaced by a space; a cell is capped at 32,000 characters. Malayalam and Arabic are kept as they are (tested).
- **Size limit, by design.** A workbook is built in memory, so it is refused before any row is read when records x columns exceeds 500,000 (about 50,000 rows of 10 columns), with the message "...download it as CSV, which has no size limit". Measured on this machine: 10,000 rows x 10 columns takes 1.7 s (0.5 MB file, about 140 MB peak process memory); 50,000 x 10 takes 4.7 s (2.7 MB file, about 270 MB peak). CSV stays flat in memory at any size.
- **Library:** ClosedXML 0.105.0 (MIT; already used by MeetingService) added to each service's Application project. `ReportXlsx.cs` is copied per service like the rest of the engine.
- **Web:** the Export menu now offers CSV (current page, all filtered records) and Excel (all filtered records, with the progress/cancel dialog). A refused oversized export shows the server's message.
- **Renamed:** the controller action `ExportCsv` is now `Export` (existing tests updated).

**Tests added/extended:** `ReportXlsxTests` (Academic: typed cells, formula-as-text, Malayalam/Arabic, summary and filters, print set-up, oversize refusal, a 2,350-row real report); in every service the "run every report" helper now also builds the workbook for every report and checks header + one row per record (so all 89 reports are covered, on in-memory and on real SQL Server); web: export call passes the format and uses the server's file name.

**Verified:** all report tests pass in the five services in memory and on a real SQL Server (`SMS_TEST_SQL`); SMS UI reports tests 32, `typecheck:test` clean. Live: AcademicService run locally with a minted token, every one of its 46 reports exported as .xlsx: 43 valid workbooks with sheets Summary + Data, a data row per record plus the header, right content type and length; the 3 branch reports could only answer 403 "branch list could not be read" because AuthService was not running in this check (they were verified with it in Phase 6, and use the same export code). `format=pdf` gives 400, no format still gives CSV.

**Not done in this phase:**
- **Server-generated PDF.** Needs a PDF library with complex-script shaping (Malayalam, Arabic) plus fonts installed in every service image, and a licence decision (the usual choice, QuestPDF, is free only under a revenue limit). Until that is decided, PDF stays the browser's Save as PDF from the print preview, which already has the letterhead, repeated header and footer, landscape and shaping. See the final report.
- **Background export jobs, stored files, export history.** Not needed so far: CSV streams without a limit and Excel is bounded; they would need a migration and file expiry.
- **Realistic-volume database performance.** The dev databases are small (hundreds of students). Excel build time and memory were measured with synthetic rows; report queries were not load-tested on a large database.

## Phase 8: Extra-curricular reports (built 2026-10-27)

**12 reports, 101 in total** (campus 31). CampusService, category "Extra-Curricular Reports", needs `module.reports` + `module.extracurricular`. Student and staff names are snapshots stored with these records, so unlike the other campus reports they need no call to the school directory. Branch rules are the usual ones (a branch-locked login sees only its branch). None is marked sensitive: they show names, classes, scores and attendance, never notes, evidence links or contact details. The Excel and CSV export work for all of them.

| Key | What it answers | Rules |
|---|---|---|
| `activities.register` | activities and clubs with category, year, coordinator, capacity, enrolled / waitlisted / awaiting decision | "Seats filled" only where a capacity is set; filters year, kind, status |
| `activities.enrollments` | who is in which activity, status, who asked (admin / teacher / student / parent), consent, who decided and when | date filter is the date the request was made |
| `activities.sessions` | every session with date, time, venue, instructor, held or cancelled (and why), attendance | rate = (present + late) / (present + late + absent); excused left out of both, as the module's own attendance figure does; cancelled sessions never counted |
| `activities.student-attendance` | per student and activity: present / late / absent / excused and the rate | "Attendance below %" lists low participation; cancelled sessions and unmarked students not counted |
| `activities.teams` | team rosters: role, position, jersey, substitute, joined and left | a member who left stays as history; filter current or left |
| `groups.members` | who is in which house / group / club for the year and how they were placed | |
| `groups.strength` | members and the boys / girls split per house or group, locked flag | gender as recorded on the placement; anything else is "Other" |
| `events.register` | events and competitions with type, level, venue, dates, status, entries and results recorded | the date filter picks events that run on any day of the period |
| `events.results` | results and awards: participant (student, team or house), round, score, rank, award | outcome filter: has an award, or podium (rank 1 to 3) |
| `achievements.register` | student achievements with level, date, source activity and event, and publish status | pending and rejected are shown and filterable, not hidden |
| `sustainability.campaigns` | each campaign's target against what was recorded | **progress counts only measured figures somebody verified** (the module's own rule); measured-but-unverified and estimated figures have their own columns; totals across campaigns are not added up because the units differ |
| `sustainability.measurements` | every recorded figure, measured or estimated (with method), verified or not and by whom | an estimate shows "Not applicable" for verification, never "Yes" |

**Tests:** `Reports/ExtracurricularReportTests.cs` (CampusService): a seeded year (two activities, a team, three sessions with attendance, two houses, an event with results, achievements, a campaign with three figures) with exact figures asserted for every report, filters, search, the module gate, the branch lock, other-branch and other-school isolation, and every sort both ways, search, the CSV stream and the Excel workbook for all 12. The same checks ran on a real SQL Server. CampusService now 586 pass + 10 SQL-only skipped.

**Live:** CampusService run locally with a minted token: all 12 new reports answered and exported as valid Excel workbooks (31 reports in the catalogue; the 9 others that need AcademicService or AuthService answered 503/403 only because those were not running in this check). The dev database holds little or no extra-curricular data, so the figures were verified in the tests, not live.

**Not built:** sports-day schedule/fixtures, house points tables and leaderboards (the module records results and ranks, not points), per-student participation across years, parent consent register (only a consent yes/no on the enrolment is stored), and a filter by activity category (it needs a new list in the UI; category is a column and searchable).
