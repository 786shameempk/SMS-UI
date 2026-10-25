# Office bulk school onboarding

Everything here lives in the School Sphere **Office portal** (`/adminLogin`). The school apps only get the person-facing
"My profile" screens. Design and decisions: [PLAN.md](PLAN.md).

## What an Office user does

1. **Bulk Import** (menu) → choose a provisioned school. The page shows what the school already has, the **setup status**
   (go-live checks), the six templates in order, the upload history and the people list.
2. Download a template, fill it, **Upload and check**. Nothing is written yet: every row shows *will be created*,
   *already exists* or *error* with the reason. **Confirm import** writes the good rows (errors need an explicit acknowledgement);
   **Download error report** gives the rejected rows to fix and upload again. Re-uploading is safe: people are recognised by
   `employee_id` / `admission_number`, never duplicated, and never invited twice.
3. Order: academic years → classes → sections → staff → students → extra guardians.
4. Each new person with an email gets a login and an emailed **set-password link** (valid 3 days, single use). Nobody ever
   receives or sees a password. **People and invitations** shows who has activated and lets you resend (once a minute, max 10).
5. People complete their details in **My profile** (web, student/parent, teacher and staff apps) and submit them.
   **Profile Approvals** (menu): review what changed against the import and the last approval, **Approve** or **Request changes**
   (reason required), or **bulk approve** the ones without a name / date-of-birth change.
6. **Setup status → Mark ready for go-live** when every required check passes (rules can be tuned per school). This does not make
   the school live: the subscription is then **activated on its own page**, under the usual payment rules. A bulk-onboarded
   school cannot be activated before it is marked ready; changing the rules clears the mark.

## CSV rules

UTF-8, header row, max **1,000 rows and 1 MB** per file. Only the template columns are accepted: a file with `password`, `role`
(outside the staff template), `permissions` or any unknown column is refused. Staff roles are limited to Teacher, Accountant,
Librarian, Receptionist. Cells starting `= + - @` are rejected (formula injection). Dates are `yyyy-MM-dd`.
Students carry their first guardian (`guardian_*`, `parent_email`); `student_email` is optional and only then does the student
get a login. A missing address is stored as "Not provided" and shows as *missing* in the profile.

## Permissions (Office roles)

| Permission | Operations Admin | Support Admin | Read-Only Auditor |
|---|---|---|---|
| `onboarding.import.view` / `onboarding.users.view` / `onboarding.profiles.view` | yes | yes (import, users, profiles) | yes |
| `onboarding.import.upload` | yes | – | – |
| `onboarding.import.confirm` (also resend invitation) | yes | – | – |
| `onboarding.profiles.approve` / `.request-changes` | yes | – | – |
| `onboarding.golive.mark-ready` | yes | – | – |
| `onboarding.view` / `onboarding.manage` (status, rules) | existing meaning | | |

Super Admin has all. Every endpoint checks its permission on the server; the UI only hides things.

## API (AuthService, `api/office/onboarding`)

`templates`, `templates/{type}.csv`, `schools/{id}` (status), `schools/{id}/imports[/{type}]`, `imports/{batch}` (+`/confirm`, `/discard`,
`/errors.csv`), `schools/{id}/users`, `users/{invitation}/resend`, `schools/{id}/profiles` (+`/{profile}`, `/approve`,
`/request-changes`, `/bulk-approve`), `schools/{id}/readiness`, `schools/{id}/policy`, `schools/{id}/mark-ready`.
School side (AcademicService): `api/my-profile` (list, `PUT {type}/{id}`, `POST {type}/{id}/submit`). Service-to-service:
`internal/onboarding/*` (key-authenticated, one school per call).

## Deploy notes

* **Migrations** (applied on start): AcademicService `AddOnboardingRowRefs`, `AddPersonProfiles`; AuthService `AddOfficeOnboardingImports`,
  `AddOfficeUserInvitations`, `AddOfficeOnboardingPolicies`. All additive.
* **Configuration**: AuthService needs `Services__AcademicServiceUrl` and `ServiceAuth__Secret`; AcademicService needs the **same**
  `ServiceAuth__Secret`. The live and Azure compose files already pass `SERVICE_AUTH_SECRET` to both. With no secret configured the
  internal endpoints answer 503 and the Office pages show "school service connection is not configured".
* **Email**: invitations use the existing SMTP settings (`Smtp__*`). With SMTP unconfigured the link is only logged, and the
  invitation shows as sent: configure SMTP before onboarding a real school.
* **Behaviour change to know about**: set-password / reset links now last **3 days** for everyone (was 1 day).
* **Gateway**: `api/my-profile` is under the existing `/services/academic/**` route; nothing new to route.
* Roll out AcademicService and AuthService together (AuthService calls the new internal endpoints). The web and mobile builds
  can follow; old apps simply do not show "My profile".

## Verifying it end to end

```
node docs/office-onboarding/e2e/run-e2e.mjs
```

Starts AuthService and AcademicService from their Debug builds against two throw-away databases on the local SQL Server, drives the
complete flow over HTTP (import → invitations → sign-in from the link → profile → approval → readiness → go-live gate), checks
every step including refusals, then removes the databases. Last run: all checks passed.

## Known limits

* No SMS / WhatsApp invitations (email only, as decided). Teacher-subject and class-teacher assignment imports are not built.
* The person is not notified when the office decides; they see it the next time they open My profile.
* Mobile text is English-only in Malayalam / Hindi / Tamil / Arabic until translated (falls back to English).
* Guardian links cannot be edited from the profile screens; bulk request-changes does not exist.
* A crash between saving rows and sending invitations is recovered by re-uploading the same file.
* Marking ready is a point-in-time decision; it is not re-checked at activation (only the rules-change clears it).
