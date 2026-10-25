# User Management, student login and release builds — audit and fixes

Verified on a real stack (AuthService, AcademicService and the API gateway on a throw-away SQL Server database) by
`docs/office-onboarding/e2e/run-usermgmt-e2e.mjs`; unit tests in each repo. Nothing was run against production data.

## Phase A — what was found

| # | Finding | Evidence |
|---|---|---|
| 1 | **Single create already makes accounts, and they do appear in User Management.** Creating a student (with student/parent email), a teacher or a staff member with a sign-in role creates the login, tags it with the school and branch, links it to the record, and lists it. A parent shared by two children is one login. | e2e: 4 accounts listed with the right roles, one parent for two children, `UserId` links present. |
| 2 | **Admission enrolment created the student and guardian but never a login.** `EnrollAdmissionCommandHandler` never called the login service, so every student who joined through Admissions had a record and no account anywhere. | Code: only `CreateStudent` and `CreateStaff` called `ILoginProvisioner`. |
| 3 | **Failures were invisible.** When AuthService refused or was unreachable (email already used elsewhere, a different role, network), `LoginProvisionerClient` logged a warning and returned `null`; the screen said "Student registered" and the person simply had no account. The CSV importer (row-by-row calls to the same endpoints) hid it the same way. | Code. |
| 4 | **Nothing repaired old gaps.** Anyone registered before accounts were automatic, through Admissions, or while the service failed stayed without a login. An existing account for the same person (made by hand) could not be linked: only a parent login was ever reused, everything else was a hard conflict. | Code + test. |
| 5 | **Temporary passwords.** Accounts were created with a generated password that was emailed (and logged when SMTP is off), and the account stayed "must change password". AuthService answers **every** AuthService endpoint with 403 `password_change_required` until it is changed, and the mobile apps had no way to change it. | e2e before the fix: student login 200 with `must_change_password`, Academic calls 200, `/api/notifications`, `/api/settings`, `/api/school-users` all 403. |
| 6 | **User Management lists everything of the school**, but filtered in the browser only (no server paging/search for large schools), and its subtitle said "staff and administrator accounts". Tenant and branch scoping in the query is correct. | Code + tests. |
| 7 | **Student app sign-in** uses the same endpoint, request and error handling as Teacher and Staff, the same `https://www.sms-schoolsphere.com` gateway (reachable: login route answers 401 to a dummy account), no cleartext or minify differences, and package/ids are distinct. The only Student-specific gate is the role allow-list (`student`, `parent`) and, after sign-in, the link between the login and the student record. | Diff of `app.json`, manifests, gradle, config; e2e through the gateway. |

### Student login — cause and fix
I could not reproduce a *rejected* login for a correctly created student on a clean stack (and I have no production
credentials or logs). What I could show is why a real student/parent ends up unable to use the app:

* **No account / no link** (findings 2–4): the app shows "Your student record isn't linked yet" or the password is unknown.
  Fixed by creating the login at admission, reporting failures, and the *Create missing accounts* repair.
* **Temporary-password accounts** (finding 5): the person signs in but AuthService features fail with 403 and the app had no
  password screen. Fixed in all three apps by a shared *Choose your own password* step that appears instead of the app while the
  token carries the restriction, then refreshes the session. New accounts no longer get a temporary password at all.

If a specific production student still cannot sign in, the next check is that account's row (active, role `student`, tenant)
and the API log for the failed attempt. Authentication, certificate validation and authorization were not weakened.

## Phase B/C — what changed

* **AuthService** — `person-logins` now creates the account with a password nobody sees and emails a one-time set-password link
  (3 days, single use); an existing login of the same school **and** role is reused untouched (password, profile unchanged), anything
  else is a clear conflict; an email failure no longer fails registration (`invitationSent=false`). New `GET api/school-users/page`
  (search, role, status, sort, paging, true totals, tenant/branch scoped). Set-password/reset links last 3 days.
* **AcademicService** — `ILoginProvisioner` returns the outcome and reason; student/staff creation and **admission enrolment** report
  `loginIssues`; a login already owned by another student/staff member is never attached to a second person; new
  `POST api/people/reconcile-logins?dryRun=` (admin/principal): creates or links logins for staff and guardians with an email, one
  call per parent email, idempotent, capped at 200 per run, never changes an existing credential.
* **Web** — User Management: *Create missing accounts* (dry run first, then run, per-person results), corrected description; creating
  or importing students/staff and enrolling admissions shows login problems (single create toast, CSV result list per row).
* **Mobile (all three apps)** — shared forced password change; Student unchanged otherwise.
* **Office import** (earlier work) already follows the same rules: records via the school service, logins by invitation, per-row
  created/reused/rejected, idempotent re-upload.

## Not changed / limits
* Students can only be given their own login when a student email is typed at registration (the email is not stored on the student
  record), so *Create missing accounts* repairs staff and parents and reports how many students have none. Parents see their children.
* Manually adding a user in User Management and "Reset password" still show a temporary password to the administrator once (existing
  admin feature); it is not emailed to the person by the new flows.
* The school's own CSV import runs in the browser row by row against the single-create endpoints (no whole-file transaction): each row
  succeeds or fails on its own, nothing half-created, and re-running skips nothing silently but a duplicate email is reported per row.
  The Office bulk import (AuthService) is the file-level, resumable one.
* Profile completion and approval is the Office approval workflow built earlier (school users edit and submit; Office administrators
  approve or request changes; audited). School administrators do not approve.
