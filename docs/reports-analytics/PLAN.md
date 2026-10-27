# Reports & Analytics: execution plan (phase 3 onward)

Written 2026-10-26 after auditing what exists. Nothing in this plan is built yet.

## Starting point (already built, see README.md)

- 19 working reports in AcademicService (students, attendance, staff, exams, admissions) on a metadata-driven engine: `ReportDefinition<TRow>` classes auto-registered, `GET /api/reports`, `/categories`, `POST /{key}/query`, `/{key}/export` (streamed CSV, no row cap).
- Frontend "Report library" tab: category chips, search, filter panel with date presets, viewer with paging/sorting/search, Load all with progress, print, CSV.
- Access: staff login + `module.reports` + the data module claim + admin/principal for `Sensitive` reports. Tenant/branch enforced in queries.
- The brief's report catalogue is about 300 reports; about 19 are done.

## Gaps against the brief

| Brief area | Gap |
|---|---|
| Services | Reports live only in AcademicService. Fees (FinanceService), transport/hostel/library/inventory/extracurricular (CampusService), communication/parent engagement (EngagementService), online classes (MeetingService), AI (AiService) have none. |
| Aggregation | UI calls AcademicService only. Needs one catalogue across services. |
| Permissions | Only `module.*` claims exist. No `Reports.Export/Print/ViewAllBranches`, and finance/payroll are not separated from general access. |
| Export | CSV only. No xlsx, no server PDF, no background jobs, no export/report history, no stored files. |
| Print | Browser print only; fine for the school header/footer but "Save as PDF" is the PDF. |
| Filters | No student/teacher/department/designation/route/vehicle/hostel/payment filters; no per-school timezone; academic-year presets use the year list, not tested for non-calendar years in every report. |
| UX | No "frequently used", no summary cards on the dashboard, no saved filters. |

## Decisions needed before Phase 2 (I recommend the first option of each)

1. **Aggregation**: put the catalogue and routing in the ApiGateway (`/api/reports` fans out to each service, merges, and forwards `/{key}/query|export` to the owning service by key prefix). The alternative, the browser calling each service, duplicates auth and fails partially.
2. **Permissions**: add real claims in AuthService (`reports.export`, `reports.print`, `reports.finance`, `reports.payroll`, `reports.all-branches`) and seed them to the existing role matrix; keep `module.*` as the entitlement. Without this, finance/payroll reports cannot meet the "explicit payroll permission" rule.
3. **Large exports**: keep streamed CSV as the default (flat memory), add xlsx and PDF generated server-side (ClosedXML or EPPlus-free library, QuestPDF) only after confirming licence. Background jobs and stored files only if a school needs more than streaming; they need a migration and file expiry.

## Phases

**Phase 2: shared platform (no new reports)**
- Gateway report aggregator + per-service route forwarding; service-agnostic contract version field.
- New claims in AuthService, role-matrix seed, and the report engine checking them (`Sensitive` becomes a named claim, not a role check).
- Engine additions: grouped/"cross-tab" report type (needed for the monthly register and consolidated reports), multi-sheet export hook, export audit log through the existing audit facility if there is one.
- Frontend: frequently used + summary cards on the library tab, saved filters, extra filter sources (student, teacher, department, designation, route, vehicle, hostel, payment method), school timezone setting read from tenant settings if present, otherwise recorded as a gap.
- Tests: engine, claims, gateway fan-out (mock services), frontend.

**Phase 3: finish AcademicService (data already there)**
Student gaps (promotion history, TC register, incomplete profiles, enrollment history, documents), attendance (monthly register link-through, late/early, leave register, consecutive absence, trend, class comparison), exam rank/progress only if ranking is configured (otherwise recorded as not buildable), assignments/homework, lesson-plan and portion reports (module exists), timetable and teacher workload/allocation, extracurricular if it is in this service, administration (class/division register, academic-year config, import history).

**Phase 4: FinanceService reports** (needs Phase 2 claims)
Collection (daily/monthly/range/mode/class), ledger, outstanding/overdue/defaulters/aging, concessions and waivers, refunds, cancelled and failed/pending payments, receipts. Source of truth is invoice and payment status; failed/pending never count as collected. Payroll reports behind `reports.payroll`.

**Phase 5: CampusService reports**
Transport (allocation, route/vehicle lists, occupancy, drivers, fee outstanding), hostel (occupancy, rooms, beds, allocation history), library (catalogue, issued, overdue, fines, popular), inventory (existing `InventoryReportsController` becomes definitions), extracurricular (L).

**Phase 6: Engagement, Meeting, AI, multi-branch**
Communication delivery by status (submitted/queued/sent/delivered/failed/acknowledged only where the provider records them), parent engagement, online classes/meetings (only captured attendance), AI risk reports (labelled as AI-generated, with period and source, review state), multi-branch consolidated (admin-only, cross-branch claim), office-only subscription usage in the Office portal.

**Phase 7: exports and print hardening**
xlsx (summary + detail sheets), server PDF with repeated headers/footers/page numbers/landscape, Malayalam/Arabic font check, background job + stored-file expiry only if decided in Phase 2, performance test with realistic volumes, deployment notes and migrations list.

## Rules for every phase

- Reuse the engine; a report is one class plus a test. Do not show a report that has not run against real data.
- Verify each new report live through the Docker stack (query, sort, search, export count equals total) as phases 1 and 2 did, and unit test with data where dev data is empty.
- Run backend tests, `npm run typecheck:test` and `test:coverage` in this repo.
- Each phase ends with README updates listing built, not built and why. Final report at the end of Phase 7 per section 18 of the brief.
- Nothing is committed (batched-commit preference).

## Size

Phase 2 is the critical path. Phases 3 to 6 are many small report classes and can be done service by service, in separate sessions per service. Phase 7 comes last.
