# Office: Bulk School Onboarding and Profile Approval: implementation plan (for review)

Status: **plan only, nothing built.** Written 2026-10-25 after reading the Office app, AuthService, AcademicService, the
school web app and the mobile apps. File paths below are the real ones.

## 1. What exists today (and will be reused)

| Area | Where | What it gives us |
|---|---|---|
| Office web app | `SMS UI/src/features/office/*`, routes `src/app/officeRoutes.tsx` (`/adminLogin`, `/office/*`), menu `navigation.ts`, page table `pages/registry.ts` | Own shell, own sign-in, own HTTP client and store. A menu entry shows only if its page exists in `registry.ts` **and** the user holds its permission. |
| Office backend | `AuthService/src/AuthService.Application/Office/*`, controllers `AuthService.API/Controllers/Office/*` (`api/office/...`) | Separate HS256 Office JWT, `office_perm` claims, `OfficePermissions` constants, custom Office roles, `IOfficeAuditService`, DB context `IOfficeDbContext`. |
| Schools in Office | `OfficeSchoolService`, `api/office/schools/{id}`, `SchoolDetailPage.tsx` (452 lines) | School record, owner, 14-stage onboarding pipeline (`OnboardingRules`), checklist tasks, notes, documents, admins tab, subscription. Stage **"Data import and initial setup completed"** is a *manual* stage (prerequisite: "Administrator invited"); **"School activated"** is set by `subscriptions/{id}/activate`. |
| Tenants, plans, modules | `api/office/subscriptions`, entitlements, `tenants` service | Plan/module entitlements and go-live (activate, suspend). Go-live must keep going through this. |
| School identity | AuthService `ApplicationUser` (`TenantId`, `BranchId`, `IsActive`, `MustChangePassword`), school roles, `SchoolUsersController` | Login accounts, school roles. |
| Login provisioning | `ProvisionPersonLoginCommand` (`api/person-logins`) | Creates a login for Teacher/Principal/Accountant/Librarian/Receptionist/Student/Parent; reuses one Parent login across children. |
| School data | AcademicService: `Student` (+`Guardian`, `UserId`), `StaffMember`, `SchoolClass`, `Section`, `AcademicYear`, `Subject`, `TeacherSubjectAssignment`, `Section.ClassTeacherStaffId` | The records the import must create or link. |
| Service-to-service | `AcademicService/.../InternalContactsController.cs` (`internal/contacts`, `X-Service-Key` = `ServiceAuth:Secret`, tenant id in the request, `TenantScope.System`) | The existing pattern for one service reading another's tenant data. |
| Existing CSV code | `SMS UI/src/components/dialogs/BulkImportDialog.tsx`, `utils/csvParse.ts`, `BulkStudentImportDialog`, `BulkStaffImportDialog` | CSV parsing and column definitions. These are *school-side, client-driven* importers; they stay untouched. |
| Mail | `IEmailService` in AuthService; EngagementService has SMS/WhatsApp delivery | Notification channels. |

## 2. Things in the brief that conflict with the current code (decisions needed)

1. **Office lives in AuthService, but classes/students/teachers live in AcademicService** (separate database per service). AuthService
   makes **no** calls to AcademicService today. The import therefore needs a new, secured server-to-server channel
   (`internal/onboarding/*` in AcademicService, `X-Service-Key`, tenant id in every request, as `internal/contacts` does), a typed
   client and `Services:AcademicServiceUrl` + the shared key added to AuthService config and to all three compose files.
2. **The existing login provisioning emails a temporary password in plain text** (`ProvisionPersonLoginCommandHandler` →
   `WelcomeEmail.Build(..., temporaryPassword, ...)`). The brief forbids that. Bulk onboarding must **not** use it. Plan: a new
   invitation that creates the account with an unusable random password and emails a **single-use, expiring set-password link**
   (built on the existing reset-token machinery, the same idea as the Office `accept-invite` flow).
3. **An email address is mandatory for every login today.** Students often have none. Options (pick one, see §13):
   (A) a student's login is created only when an email is given; otherwise the student record exists without a login and the
   parent signs in and acts for them (matches how the Student app already serves parents); (B) allow a school-assigned username
   (changes AuthService sign-in; larger and riskier). **Recommended: A**, with an optional student email.
4. **There is no profile-completion or approval concept anywhere** (no status field, no history, no self-service profile API for
   students/parents/teachers). The school web app has only `account/security` and the attendance pass; the mobile apps show a
   read-only profile card. All of this is new: tables, endpoints, web screens and three mobile screens.
5. **`Student` has required columns** (address, emergency contact, blood group, date of birth, gender). A minimal CSV cannot fill
   them. Either the importer writes explicit "not provided" placeholders and the profile marks those fields as missing, or those
   columns become nullable (migration + touching every consumer). **Recommended: placeholders plus a computed "missing fields" list**,
   no schema loosening.
6. **Office users have a fixed permission catalog** (`OfficePermissions`). New permissions must be added there, to the built-in role
   templates and to the roles screen; existing custom roles do not get them automatically.
7. **Existing 14-stage pipeline** already has a manual "Data import" stage. The new readiness evaluation should *offer* that stage
   (and "Training/verification") when checks pass instead of adding a parallel status; go-live stays `subscriptions/{id}/activate`.

## 3. Architecture

```
Office UI (adminLogin, /office/...)                 School web + 3 mobile apps
        │  office JWT, office_perm                         │  school JWT
        ▼                                                  ▼
AuthService  api/office/onboarding/*                 AcademicService  api/my-profile/*
 - permissions, audit, batches, readiness             - profile, submissions, history
 - invitations (set-password links)                   (family-allowed endpoints)
        │  X-Service-Key + tenantId
        ▼
AcademicService  internal/onboarding/*   (validate, commit, profile queue, decisions)
```

Ownership: **batch/audit/readiness/invitations in AuthService** (it already owns Office, tenants and accounts); **school records,
profile status, submissions and history in AcademicService** (tenant data, next to the Student/Staff/Guardian rows it describes).
Office never writes AcademicService's tables directly; it calls the internal API.

## 4. Data model (new)

AuthService (Office database): `OnboardingImportBatch` (school, type, file name, SHA-256 of the file, status, counts, started/finished,
initiator, error-report blob key), `OnboardingImportRow` (batch, line, status Created/Reused/Rejected/Skipped, messages; no secrets),
`OnboardingPolicy` (per school: which roles need approval, required fields, readiness thresholds, defaults from a global policy),
`SchoolUserInvitation` (user, token hash, expiry, sent/used timestamps, channel, retries; one active per user).

AcademicService: `PersonProfile` (person type + id, `ProfileStatus` Incomplete/PendingApproval/ChangesRequested/Approved,
imported-snapshot JSON, current JSON, missing-fields JSON, row version), `ProfileSubmission` (version, changed fields, submitted at/by),
`ProfileDecision` (submission, decision Approved/ChangesRequested, reason, office user id and name, timestamp), `ImportBatchRef`
(idempotency: batch id + line → created record id) so retries never duplicate.

Account status is **derived** from the existing `ApplicationUser` + invitation row (Invitation Pending → Activation Pending → Active;
Suspended = `IsActive=false`); we add no duplicate column. School onboarding status is derived from the existing stage plus readiness.

## 5. Office permissions (added to `OfficePermissions`, with built-in role templates)

`onboarding.import.view`, `onboarding.import.upload`, `onboarding.import.confirm`, `onboarding.users.view`, `onboarding.profiles.view`,
`onboarding.profiles.approve`, `onboarding.profiles.request-changes`, `onboarding.golive.mark-ready`. Defaults: Operations Admin gets all;
Support Admin gets view + upload (no confirm/approve); Read-Only Auditor gets view; Sales/Finance get none. Existing `onboarding.view/manage`
and `subscriptions.manage` keep their meaning (go-live still needs `subscriptions.manage`). Every endpoint checks the permission server-side
and the school id; the UI only hides things.

## 6. Office API (AuthService, `api/office/onboarding`, all per school id)

| Endpoint | Permission |
|---|---|
| `GET schools/{id}/status` (counts, readiness, blockers) | `onboarding.view` |
| `GET templates` and `GET templates/{type}.csv` (versioned) | `onboarding.import.view` |
| `POST schools/{id}/imports` (upload CSV → stage + validate, returns preview) | `onboarding.import.upload` |
| `GET schools/{id}/imports`, `GET imports/{batchId}`, `GET imports/{batchId}/rows`, `GET imports/{batchId}/errors.csv` | `onboarding.import.view` |
| `POST imports/{batchId}/confirm` (idempotent; optional `Idempotency-Key`) | `onboarding.import.confirm` |
| `POST imports/{batchId}/cancel` | `onboarding.import.upload` |
| `GET schools/{id}/users`, `POST users/{userId}/resend-invitation` | `onboarding.users.view` / `import.confirm` |
| `GET schools/{id}/profiles`, `GET profiles/{personType}/{id}` (imported vs submitted, diff, history) | `onboarding.profiles.view` |
| `POST profiles/{personType}/{id}/approve`, `.../request-changes`, `POST profiles/bulk-approve` | `.approve` / `.request-changes` |
| `GET schools/{id}/readiness`, `PUT schools/{id}/policy`, `POST schools/{id}/mark-ready` | `onboarding.view` / `manage` / `golive.mark-ready` |

AcademicService `internal/onboarding/*` mirrors these (stage, validate, commit, profile list/decide, counts). School-facing
endpoints (new, family-allowed, role-checked): `GET/PUT api/my-profile`, `POST api/my-profile/submit`.

## 7. CSV templates (all UTF-8, header row, max 1,000 rows / 1 MB, one file per entity, version in the header comment)

Import order enforced by the wizard (a step unlocks when its parents are done): **1 academic years → 2 classes → 3 sections → 4 staff/teachers →
5 subject assignments & class-teacher assignments → 6 students → 7 parents/guardians (links) → 8 other staff roles**.

| Template | Key columns (real fields only) |
|---|---|
| `academic-years` | name, start_date, end_date, is_current |
| `classes` | class_name, academic_year |
| `sections` | academic_year, class_name, section_name, capacity, class_teacher_employee_id |
| `staff` (teachers and non-teaching) | employee_id, first_name, last_name, email, mobile, role (allow-list), department, designation, joining_date |
| `teacher-assignments` | employee_id, subject_code, class_name (+ optional `is_class_teacher`, section) |
| `students` | admission_number, first_name, last_name, academic_year, class_name, section_name, roll_number, date_of_birth, gender, student_email (optional), guardian_key |
| `guardians` | guardian_key, first_name, last_name, email, mobile, relation, admission_number (one row per child link; same email = one login) |

Role allow-list for the `role` column: Teacher, Accountant, Librarian, Receptionist (decided: no Principal, no school-admin roles, §13). The
server maps the role to the existing school role by exact name; any other value is a row error. **No CSV value can set permissions.**
Templates are generated from the same column definitions the validator uses, so they cannot drift.

## 8. Import pipeline

1. **Upload**: size/type/BOM/encoding checks, formula-injection guard (cells beginning `= + - @` are neutralised in the error report),
   header validation, row cap. File hash recorded; re-uploading the same file for the same school returns the existing batch.
2. **Validate (no writes)**: field rules (reuse AcademicService validators), duplicates within the file and against existing school records,
   reference checks (year/class/section/employee/subject), parent-student link checks, role allow-list. Result per row: OK / Warning / Error.
3. **Preview**: counts (will create / will reuse / will reject), first N rows, downloadable `errors.csv`.
4. **Confirm**: runs in bounded chunks (e.g. 200 rows/transaction) in a background worker, resumable; every row writes a `ImportBatchRef`
   so a retry skips what is done. Rows that fail are recorded and never silently dropped; the batch ends `Completed`, `CompletedWithErrors`,
   or `Failed`. Totals always add up: processed = created + reused + rejected + skipped.
5. **Invitations** are queued *after* the data commit, one per user, with a per-user unique key. A mail failure marks the invitation
   `SendFailed` (retryable from Office) and never rolls back the import or sends twice on retry.

## 9. Activation and account security

Invitation = random 256-bit token, stored hashed, 72 h expiry, single use, rate-limited resend. The link opens the existing school set-password
page; after setting a password the account is Active. No passwords in CSVs, emails, logs or error reports; PII masked in logs.
Importing never changes an existing user's roles (a matching email in another school is a row error, as today).

## 10. Profile completion in the school apps

- **Web (SMS UI)**: new `account/profile` page (menu: Account) for every school role: imported details, missing-fields list, editable fields
  for that role, status chips (profile + approval), admin feedback, Submit / Resubmit.
- **Mobile**: a Profile screen in Student (student or parent), Teacher and Staff apps (More / Account), same fields and statuses.
- **Server rules**: a user edits only their own record; per-role field policy (editable / read-only / protected: identifiers, class, role,
  status). Fields marked *sensitive* (e.g. name, date of birth, class) send an approved profile back to review; other edits do not.

## 11. Office screens (new menu group "School Onboarding", entries registered in `registry.ts` + `navigation.ts`)

School picker (reuses the schools list) → **Setup status** (readiness, blockers, stage shortcut), **Bulk import** (wizard per template with
dependency order), **Import history**, **User directory** (account status, resend invitation), **Profile approvals** (queue, filters: role, class,
section, status, batch, date; detail with imported vs submitted diff and history; approve / request changes with reason; guarded bulk approve).
Also an "Onboarding" card on `SchoolDetailPage`.

## 12. Readiness and go-live

Configurable checks per school (policy): academic year current; classes/sections exist; required imports completed; no unresolved import errors;
every student has a section and a guardian link; every class has a class teacher (optional); required roles' profiles approved (policy:
default 100% staff, configurable % students); accounts activated (policy threshold); subscription and modules configured. Output: passed,
outstanding, blockers. When all required checks pass the school becomes **Ready for go-live** (derived) and the existing manual stage can be
set; the actual go-live is still the existing subscription activation by a user with `subscriptions.manage` + `onboarding.golive.mark-ready`.

## 13. Decisions

| # | Question | Decision | Source |
|---|---|---|---|
| 1 | Students without email | **Option A**: the parent acts for the child; a student email is optional and only then is a student login created. No usernames. | You, 2026-10-25 |
| 2 | Roles allowed in a CSV | Teacher, Accountant, Librarian, Receptionist. **No Principal and no school-admin roles.** | You |
| 3 | Who approves | **Office administrators approve profiles** (school admins do not). | You |
| 4 | Invitation channel | **Email now**; SMS and WhatsApp are used only where the school has configured a provider in EngagementService. | You |
| 5 | Scale | About 200 rows per file expected. Designed for that; hard cap 1,000 rows and 1 MB per file. | You (200); cap is mine |
| 6 | Mobile scope | Profile screens in **all three mobile apps and the school web app**, now. | You |
| 7 | Missing required student fields | "Not provided" placeholders for address, emergency contact and blood group, with the profile listing them as missing; no schema loosening. | Proposed, treated as accepted (your message repeated the question without an answer) |
| 8 | Which Office roles may approve | Yes: Operations Admin and any Office role granted `onboarding.profiles.approve`; Support Admin gets view and upload only. | You (yes) |
| 3b | Fields that send an approved profile back for review | Name, date of birth, class/section, guardian links, identifiers (employee/admission number, role). Other edits do not. Which people need approval: every imported person. | Assumed (you said "by admin"; the field list is mine) |

## 14. Phasing (each phase ends with tests and a build)

| Phase | Scope | Rough size |
|---|---|---|
| 1 | Internal channel (config, key, typed client), Office permissions, batch tables, templates, upload + validate + preview + error report; Office wizard for academic years, classes, sections | large |
| 2 | Staff/teacher/assignment and student/guardian imports, idempotent commit, import history, user directory, invitations (token, mail, resend) | large |
| 3 | Profile model, school web profile page, mobile profile screens, submit/resubmit | large |
| 4 | Office approval queue and review, decisions, bulk approve, audit | medium |
| 5 | Readiness policy, status card, go-live link, end-to-end test, docs and deploy notes | medium |

## 15. Tests and verification

Unit: template/column definitions, parser edge cases (BOM, quotes, formulas, wrong encoding, 5,001 rows), each validator, duplicate and retry
safety, invitation token lifecycle, readiness rules, field policy. Integration (real SQL Server, like the existing `SMS_TEST_SQL` tests):
tenant isolation (school A's Office session cannot touch school B), permission matrix per Office role, school users get 403 on Office and internal
endpoints, user cannot approve own profile, notification failure keeps data. Frontend (vitest): wizard, preview, approvals. One scripted
end-to-end run on a throwaway database: Office sign-in → pick school → import → invitation link → set password → profile → submit →
approve → readiness → go-live eligibility. Migrations tested forward on a database at the previous migration. Builds: `dotnet test` for
AuthService and AcademicService, `tsc -b`, `typecheck:test`, `vite build`, mobile `tsc`/`expo lint`/`jest`.

## 16. Risks and limitations

- Two databases: the import cannot be one atomic transaction; consistency comes from idempotent rows and resumable batches.
- Large mobile + web surface (profile screens in 4 clients); phase 3 is the biggest risk to schedule.
- Existing school-side CSV importers keep working but are not changed; two importers will coexist (documented).
- Deployment needs: new `ServiceAuth` key wiring to AuthService, `Services:AcademicServiceUrl`, migrations in two services, new Office
  role assignments for the new permissions.

---

## Build status (updated 2026-10-25)

**Phase 1 – built and tested (uncommitted):** secure Office→AcademicService channel (`internal/onboarding/{validate,commit,counts}`, `X-Service-Key`, per-request `IServiceTenantContext` so tenant filters/write guard stay on), `OnboardingRowRefs` idempotency table, AuthService `OfficeImportBatches/OfficeImportRows`, permissions `onboarding.import.view|upload|confirm`, CSV parser/templates (academic-years, classes, sections; roles/passwords/unknown columns refused), upload → check → confirm (chunks of 100, resumable) → history → error-report endpoints under `api/office/onboarding`, Office "Bulk Import" page. Compose files wired (`Services__AcademicServiceUrl`, `ServiceAuth__Secret` on authservice).

**Not built yet:** Phases 2–5 (staff/students/guardians imports, invitations, profile model + approval, web/mobile profile screens, readiness/go-live).

**Phase 2 – built and tested (uncommitted, 2026-10-25):** `staff`, `students` (with first guardian inline) and `guardians` templates/imports; plan-seat limits passed from AuthService; records created without logins; AuthService creates logins (random unknown password, never emailed) and emails a single-use set-password link (identity reset token, now valid 3 days for all reset links); `OfficeUserInvitations` table (migration AddOfficeUserInvitations); people directory + resend (rate-limited, max 10); `onboarding.users.view` permission; `link-users` internal endpoint. Deviations from §7: guardians are inline in the students file (extra guardians via `guardians`), teacher/class-teacher assignments are not built; address is optional ("Not provided"); a crash between saving rows and sending invitations is recovered by re-uploading the same file (people are reused, missing logins are invited).

**Phase 3 – built and tested (uncommitted, 2026-10-25):** AcademicService `PersonProfiles/ProfileSubmissions/ProfileDecisions` (migration AddPersonProfiles) and `api/my-profile` (list, save, submit) for imported people only; a person edits only their own record or their child's, only the editable fields; name/date of birth are protected (editing them sends an approved profile back to Incomplete); other edits do not. Web page `/account/profile` (Header menu "My profile"); mobile `ProfileScreen` in `@educore/ui` used by the student/parent, teacher and staff apps (More / Account). Status values ChangesRequested/Approved and `ProfileDecision` rows are read but only written by Phase 4. Gaps: mobile strings are English-only in ml/hi/ta/ar (they fall back to English); guardian-link edits are not offered.

**Phase 4 – built and tested (uncommitted, 2026-10-25):** AcademicService `internal/onboarding/profiles` (queue, review with imported / last-approved / now diff and history, decision, guarded bulk approve; no schema change); AuthService `api/office/onboarding/schools/{id}/profiles` with permissions `onboarding.profiles.view|approve|request-changes` (Operations Admin all three; Support Admin and Read-Only Auditor view only), the deciding office user recorded on every decision, audit entries (`onboarding.profile.approved|changes-requested`, `onboarding.profiles.bulk-approved`); Office page "Profile Approvals". Rules: a decision needs a pending submission and (from the UI) the version reviewed, so a resubmission is never approved unseen; approving makes the current values the new baseline; request-changes needs a reason; bulk approve (max 200) skips anything with a name/date-of-birth change or not pending and says why; it never requests changes. Gaps: the person is not emailed about a decision (they see it in the profile); no bulk request-changes.

**Phase 5 – built and verified (uncommitted, 2026-10-25):** AcademicService `internal/onboarding/readiness-facts`; AuthService `OfficeOnboardingPolicies` (migration AddOfficeOnboardingPolicies), `OfficeReadinessService` (12 checks from the facts + office data, per-school rules with defaults, derived "ready", `mark-ready` with permission `onboarding.golive.mark-ready`, stage moved to Data imported, policy change clears the mark, subscription activation of a bulk-onboarded school waits for the mark); Office "Setup status" card on the Bulk Import page. Verified by `docs/office-onboarding/e2e/run-e2e.mjs` against real services and SQL Server (all checks pass). Operator + deploy notes: [README.md](README.md).
