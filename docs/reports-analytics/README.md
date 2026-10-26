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
- **Native PDF and .xlsx** - PDF is the browser's Save as PDF from the print preview; Excel opens the CSV. No server PDF/xlsx library was added.
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
