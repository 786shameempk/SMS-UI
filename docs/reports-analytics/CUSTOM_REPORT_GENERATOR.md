# Custom Report Generator

Insights has two menu items: **Reports & Analytics** (the existing fixed reports, untouched) and **Custom Report Generator** (`/custom-reports`). Built 2026-11-10 in two phases the same day: the engine, wizard and the 8 AcademicService data sources, then the Finance and Campus data sources, filter groups and cross-service columns. 17 data sources across three services.

## What a user can do

| Screen | Route | Notes |
|---|---|---|
| Home | `/custom-reports` | tabs: My Custom Reports, Create New Report, Shared Reports, Favourite Reports; card actions Run, Edit, Duplicate, Rename, Set as default, Share, Delete |
| Builder | `/custom-reports/new?source=<key>`, `/custom-reports/:id/edit` | 6 steps: Data source, Columns, Filters, Group & sort, Settings, Preview & generate |
| Run | `/custom-reports/:id` | saved report, server-paged, Export (Excel/CSV/PDF), Print, favourite, share, duplicate |

- **Columns**: checkbox list grouped by the record each field comes from (Student, Class, Parent...), search, select/deselect all, drag-and-drop or up/down buttons to reorder, rename, hide/show, live sample rows.
- **Filters**: equals, not equals, contains, does not contain, starts/ends with, greater/less, between, is one of / none of, is empty / not empty, date on/before/after/between. Conditions join with AND / OR (AND binds tighter), and a **group** brackets conditions so you can write `Class 8 AND (balance > 0 OR attendance < 75)`; groups nest up to 3 deep. Multi-select values come from the school's own data (`/datasets/{key}/fields/{field}/values`).
- **Group & sort**: up to 4 grouping columns, record count per group, totals (count, total, average, lowest, highest) per group or over the whole report, up to 5 sort levels.
- **Settings**: title, header, description, school logo, academic year, date range, portrait/landscape, A4/A3/Letter, total count, generated time, footer, page numbers.
- **Output**: Excel and CSV are built on the server from every matching row (the same streaming writers every other report uses, so formula-safe CSV, Summary + Data sheets, the 500k-cell Excel cap). Print and PDF open the report's print layout (PDF = the browser's Save as PDF, as for all reports; a server PDF renderer was deliberately not built, see the Reports library notes). Print/PDF are limited to 5,000 rows in the browser; larger reports are pointed to CSV/Excel.
- **Save / manage**: save, update, save as new, duplicate, rename, delete, favourite (per person), default (one per person), last generated, run count, owner.
- **Sharing**: private, or shared with roles and/or named people, each at **Run** (run + export, read-only) or **Edit**. Only the owner can share, delete or see the history.

## Architecture (three services, one contract)

```
SMS UI -> AcademicService /api/custom-reports   saved reports, sharing, favourites, history + student/staff/academic data
SMS UI -> FinanceService  /api/custom-reports   fee, finance and payroll data (preview, export, values; stateless)
SMS UI -> CampusService   /api/custom-reports   transport, hostel, library and store data (same)
```

Each service owns and runs its own data with its own module and permission checks. The engine (`CustomReports/` in each Application project) is a copy, as for the reports library; the datasets are what differ. **Saved reports live only in AcademicService.** For a report on Finance or Campus data it stores the definition (checked structurally only); the browser runs the report on the owning service, then calls `POST {id}/record-run?kind=run|exported` so the last-generated date, run count and history stay in one place. The owning service validates every field and permission on each run, so a saved definition can never reach data the runner may not see. The browser merges the three catalogues (`GET datasets`) and picks the service per data source; a service that is down only removes its own data sources, and the page says so.

The rest of this section describes the engine, shown for AcademicService (`AcademicService.Application/CustomReports/`).

| File | Role |
|---|---|
| `CustomReportModels.cs` | definition shape (columns, filters, groupBy, sort, aggregates, settings), operator and function allowlists, results |
| `CustomDataset.cs` | `ICustomDataset` + `CustomDataset<TRow>` executor: filter, order, page, group and total **in the database**; only the page returned is read into memory |
| `CustomReportCompiler.cs` | validates a definition against the dataset allowlist and the caller's permissions and turns it into a plan; every problem is reported by field |
| `CustomReportCatalog.cs` | which datasets and fields this login may use |
| `CustomReportService.cs` | save, share, favourite, default, run, audit, export preparation |
| `CustomReportExport.cs` | adapts a plan to the existing `IReportDefinition` so `ReportCsv` / `ReportXlsx` are reused |
| `Datasets/*.cs` | one class per data source |

`API/Controllers/CustomReportsController.cs`: `GET datasets`, `GET datasets/{key}/fields/{field}/values`, `POST preview`, `POST export?format=csv|xlsx`, `GET ?scope=all|mine|shared|favourites`, `GET/PUT/DELETE {id}`, `POST` create, `PATCH {id}/rename`, `POST {id}/duplicate`, `PUT|DELETE {id}/favourite`, `PUT|DELETE {id}/default`, `PUT {id}/sharing`, `GET {id}/history`, `POST {id}/run`, `POST {id}/export`.

Tables (migration `CustomReports`): `CustomReports` (definition kept as JSON), `CustomReportShares`, `CustomReportUserStates`, `CustomReportAudit`. All carry `TenantId`, so the central EF tenant filter applies.

### Why it is safe

- **No SQL from users, ever.** A request names fields by key and operators by name. The compiler resolves each key against the dataset's field list (unknown key = 400), checks the operator is legal for the field type, and converts every value to the column's CLR type. The query is then built as an expression over property names taken from that allowlist with **every value passed as a parameter**; user text is never part of the expression text. System.Linq.Dynamic.Core is used only to turn that checked text into an expression tree for EF.
- **Tenant isolation**: each dataset's source starts from the tenant- and branch-scoped queryable (`Students.VisibleTo`, tenant/branch filters on the others, plus the EF global tenant filter). Saved reports are looked up by tenant and by access; a report you cannot see is a 404, same as one that doesn't exist.
- **Module and role access**: the Reports module (`module.reports`) is required for every call, saved or not, plus a module claim for the data source (`module.students`, `module.attendance`, ...). A login whose plan or role lacks them sees no data source, and gets 403 on a direct call. A login not locked to a branch needs `Reports.AllBranches`.
- **Field-level access**: sensitive fields (contact details, addresses, blood group, emergency contact, salary) need `Reports.Sensitive` (admin/principal by default). They are not listed, not queried, not exportable for anyone else.
- **Sharing never widens access.** A saved definition is validated again against the *runner's* permissions on every run, export and duplicate. A shared report using a field the runner may not see fails with a validation error naming the field.
- **Export** needs `Reports.Export`, print needs `Reports.Print` (existing permissions).
- **Cancellation and timeouts**: preview/run/values calls are cancelled after 60 s, exports after 5 min, and when the browser cancels (the request token is linked). A timeout returns a message telling the user to narrow the filters.
- **Audit**: created, updated, renamed, duplicated, deleted, shared, run (saved), exported are written to `CustomReportAudit` and logged; the owner can read the history.
- **Caching**: the data-source catalogue is cacheable by the browser for 60 s (permissions are re-checked on every run). Nothing about results is cached.

### Avoiding duplicate rows

Every dataset's row is one row per record of its own kind (one per student, per guardian, per attendance mark, per exam result, per application). One-to-many relations are reduced **inside the dataset** to a single value: the student's primary guardian (father first), a pre-aggregated attendance count and percentage, a teacher's class/subject counts. A join can therefore never multiply a record. Related one-to-many detail that people want as its own list has its own dataset (Parent, Attendance, Examination).

## Data sources built (17)

| Key | Module label | Rows | Service | Needs |
|---|---|---|---|---|
| `students` | Student Management | student (+ class, division, year, primary parent, transport, hostel, attendance %) | academic | module.students |
| `parents` | Parent Management | guardian (+ their student, class) | academic | module.students |
| `staff` | Staff Management | staff member (+ department, reports-to, pay) | academic | module.staff |
| `teachers` | Teacher Management | teacher (+ class teacher of, classes/subjects taught) | academic | module.teachers or staff |
| `academic` | Academic Management | class division (+ class teacher, capacity, strength, vacancies) | academic | module.academics / administration / students |
| `attendance` | Attendance Management | student attendance mark (average of the 0/100 *Attendance Score* = attendance %) | academic | module.attendance |
| `exams` | Examination & Results | student x subject x exam (marks, %, grade, pass/fail) | academic | module.examinations |
| `admissions` | Admission Management | admission application | academic | module.students or admissions |
| `fees` | Fee Management | fee invoice (amount, discount, fine, collected, balance, due) | finance | module.fees/accounting + Reports.Finance |
| `fee-balances` | Fee Balances by Student | one row per student: billed, collected, outstanding | finance | same |
| `fee-payments` | Fee Payments | receipt (mode, amount) | finance | same |
| `finance` | Finance & Accounting | journal line (entry, account, debit, credit) | finance | module.accounting + Reports.Finance |
| `payroll` | Payroll | payslip (+ staff name, department) | finance | module.payroll + Reports.Payroll (leaders by default) |
| `transport` | Transport Management | student route assignment (+ stop, bus, fee) | campus | module.transport |
| `hostel` | Hostel Management | bed allocation (+ hostel, room, fee) | campus | module.hostel |
| `library` | Library Management | book loan (+ book, author, category, member) | campus | module.library |
| `store` | Store Management | item stock per store (quantity, value, below-minimum flag) | campus | module.store |

Attendance % everywhere: late and half days count as attended; holidays and unmarked days are not absences.

### Cross-service ("looked-up") columns

A student's name, admission number and class live in AcademicService, and so do a staff member's name and department. In Finance and Campus data sources these are **computed columns**: filled in for the page being shown with one directory lookup (so only the rows on screen are looked up; exports look them up a batch at a time), and marked with a link icon in the column list. They can be shown, hidden and renamed but **not sorted, grouped or totalled** (the database does not hold the value).

Student name, admission number and class (every student-linked source in Finance and Campus), and a library member's name (student or staff), can **narrow** a report: the filter is resolved in AcademicService to a set of student ids (at most 500 per search term), which then limits the query. A set of ids cannot be combined into an OR, so these filters can only be joined with AND, at the top level, with Equals, Contains or Is one of; the builder and the server both say so. This is what makes "students with pending fee balances in Class 8" a three-click report. If the school directory cannot be reached the report fails with a clear message instead of showing blank names.

### Adding a data source

1. Add a row class (plain class with object-initialiser properties, so EF can order and group on members) and a `CustomDataset<TRow>` in `Datasets/`. Give it `Key`, `Title`, `RequiredAnyOf`, a `Fields` list (key = the camelCase of a row property; `F.Text/Number/Date/Bool/Choice`), `IdProperty`, optional `DateProperty` / `YearProperty`, and a tenant-scoped `Source()`.
2. That is all: datasets register themselves, the UI renders from the metadata. `EveryDatasetFieldMapsToARowProperty...` and `EveryFieldOfEveryDataset_CanBeSelectedFilteredSortedAndGrouped_OnRealSql` check the new class automatically.
3. A student-linked source in Finance or Campus derives from `StudentLinkedDataset` (computed student columns and the id-set filter); a new service copies the engine, exposes the same `/api/custom-reports` contract and is added to `CLIENTS` in `src/features/reports/custom/api.ts` and to `RemoteDatasets` in AcademicService.


## Known limits (deliberate)

- **Totals on derived per-student attendance figures**: EF cannot aggregate over a group-by that is itself joined in, so *Days Marked / Days Attended / Attendance %* on the Student source can be shown, filtered and sorted but not summed or averaged. Use the Attendance source for class and period attendance rates (average of Attendance Score).
- Looked-up columns cannot be sorted, grouped or totalled: the value is not in the database being queried, and doing it would mean loading every row into memory, which the engine deliberately never does.
- A looked-up student search matches at most 500 students per term; narrow broad terms.
- Ungrouped totals appear above the table; a grouped report shows only its group columns, count and totals (the step-2 column list is ignored for it).
- Dates are plain dates (no time of day); date-time fields are not offered.

## Not built

- Server-rendered PDF (PDF is the browser's Save as PDF, as for all reports), scheduled generation, e-mail/WhatsApp delivery, dashboard widgets, cross-branch templates, AI-generated reports. The architecture leaves room (definitions are JSON, every run goes through one plan-based entry point) but none is built.
- Background export jobs for very large reports: CSV already streams in batches with no row limit; Excel is refused above 500k cells with a message.

## Verification (2026-11-10)

- AcademicService: 41 new tests (engine on SQLite, service and sharing rules, nested groups, remote saved reports); full suite 1,172 pass, including every existing report. FinanceService: 11 new data-source tests, full suite passes. CampusService: 8 new, full suite passes. (The SQL Server-only tests in those two suites are skipped without SMS_TEST_SQL; the live sweep below covers them.)
- Live, against the Docker SQL Server stack, all three services: every field of all 17 data sources x (sort, filter, empty, group, every total, a grouped total, an external filter), no failures; save, run, favourite, default, duplicate, rename, share, export, delete; a saved report on Finance data stored by AcademicService, run by FinanceService and recorded back; "Grade 3 students with outstanding fees" through the school directory; a nested group on SQL Server; CSV and Excel exports from all three services; a teacher login refused everywhere; an OR on a looked-up column rejected.
- UI: `typecheck`, `typecheck:test`, Vitest, and a browser pass: home page with 17 data sources, builder on Fee Balances (columns, filters, groups), run page for a saved Finance report (names, renamed column, total).
- Volume: the largest dataset in the dev school (9,061 attendance rows) exported as CSV in 0.5 s and as Excel in 2.1 s (9,062 rows with header, valid OOXML, frozen header pane), and 8 parallel grouped previews over it returned in 0.25 s. Not a production-scale load test.
- Not verified: Print/PDF output in a real print dialog, and the Excel file opened in the Excel application itself (its structure was read back and counted).
