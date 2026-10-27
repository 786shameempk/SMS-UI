# My Profile, departments, reporting persons and profile-change approvals

Built 2026-10-27. Everything lives in AcademicService (backend) and SMS UI (web); the mobile apps keep working against the same endpoints. Nothing is committed.

## The bug

"Nothing to complete. Your account was not set up through the school's bulk import" came from `ProfileService.ListMineAsync`, which returned a profile only for people with a bulk-import row (`OnboardingRowRefs`). The check is gone: every login now has a profile.

| Login | Profile |
|---|---|
| Staff / teacher (record linked by user id) | `staff` |
| Student login, or a parent's child | `student` |
| Parent (guardian rows linked to the login) | `guardian` (the parent's own details) plus each child |
| Administrator or any login with no staff, student or guardian record | `account`, created from the login the first time it is opened (one per login, never duplicated) |

The bulk import still matters in one place only: an imported person whose profile the school's office has not yet approved completes it the old way (fill in, **Send for approval** to the office, `mode: "completion"`). After that, and for everyone who was never imported, `mode` is `"approval"`.

## How an edit works (mode "approval")

1. The person opens **My profile** (account menu), presses **Edit profile**, changes permitted fields, **Save changes**.
2. The server validates (required, formats, allowed values; protected fields such as role, employee ID, class, school, status are refused by name).
3. Fields the school lets through at once (policy, below) are applied immediately and audited. Everything else becomes one **pending request** (`ProfileChangeRequests`) holding `from` and `to` per field. **The official record is not touched.**
4. A second request on a field that already has one pending is refused (409). Other fields are fine. The requester can withdraw their own pending request.
5. The assigned approver sees it in **Profile approvals** (account menu): tabs Pending / Approved / Rejected / All requests, search, **View details** (current beside proposed, history), **Approve** / **Reject** with a comment (required to reject).
6. Approve applies exactly the requested fields, but only if each official value still equals the `from` the request was made against; if an administrator changed it meanwhile, approval is refused (409) so the right values get reviewed. Reject leaves the record alone; the person sees the reason and can send a corrected request.
7. Requester and (when reassigned) the new approver are notified through the existing outbox (`LessonNotifications`, type `ProfileChange`) that EngagementService delivers.

## Who approves

| Change by | Goes to |
|---|---|
| Student, or a parent editing their child | the class teacher of the child's section (`Section.ClassTeacherStaffId`) |
| Parent's own details | the class teacher of their first child (by name) who has one |
| Teacher or staff | their **reporting person**; else their **department head**; else the school administrators |
| Department head | the administrators, unless a reporting person was assigned explicitly (then that person) |
| Administrator / account profile | the administrators |

"Administrators" means `ApproverUserId = null`: any login with the admin, principal or superadmin role in the school (and branch) may decide, and principals, vice principals and HR are notified. An approver must be an active staff member with a linked login; otherwise the next rule applies. Nobody can decide their own request, even as an administrator.

Decisions are made against **today's** organisation: if the reporting line or class teacher changed after the request was made, the request is reassigned (audited, new approver notified) and the old approver is refused.

## Departments, heads and reporting persons

Reuses the existing `Departments` table and the Academic Setup > Departments tab (`/academics`). Added: `Code` (unique per branch), `HeadStaffId`, `IsActive`; staff got `DepartmentId` and `ReportingToStaffId` (the existing `Department` text column is kept in step, because reports read it).

- Create, edit, activate or deactivate; list shows code, head, employee count, status. Renaming updates every member's department name.
- **Head and employees** (row action): choose the head; add people; set each person's reporting person.
- A head must be a current employee of the branch with a sign-in, not a driver, cleaner or security guard, heading only one department. The person is placed in that department.
- A reporting person must be someone else in the same school and branch (principals and vice principals may be from any branch), still employed, with a sign-in, and must not already report up to the employee (no loops).
- Staff and teacher forms have a **Reporting person** field (options: department head first and suggested, then others). A new joiner defaults to the department head. Teachers use the same form.
- Past decisions keep the approver they had; changing a head or a line never rewrites them. Open requests follow the new line when decided.
- Every department and reporting change is written to `ProfileAuditEntries`.

## School policy

`GET/PUT /api/profile-approvals/policy` (leaders only to change): a list of field keys that skip approval. Default: none, so everything needs approval. Name, date of birth and other protected fields can never be listed.

## APIs (AcademicService)

| Route | Purpose |
|---|---|
| `GET /api/my-profile` | the caller's profiles (own, children, parent, account) |
| `PUT /api/my-profile/{staff\|student\|guardian\|account}/{id}` | edit: completion draft, or submit a change request |
| `POST /api/my-profile/{type}/{id}/submit` | first-completion submit to the office (completion mode only) |
| `GET /api/profile-approvals?tab=&search=&page=` | the approver's inbox (leaders see the whole school or branch) |
| `GET /api/profile-approvals/mine` | the caller's own request history |
| `GET /api/profile-approvals/{id}` | one request with its history |
| `POST /api/profile-approvals/{id}/approve` `/reject` `/cancel` | decide (comment) / withdraw |
| `GET` `PUT /api/profile-approvals/policy` | school policy |
| `GET /api/departments`, `POST`, `PUT /{id}`, `DELETE /{id}` | departments (now with code, head, status, count) |
| `PUT /api/departments/{id}/head`, `GET`/`POST /{id}/members` | head and members |
| `PUT /api/departments/staff/{staffId}/reporting-person`, `GET /api/departments/reporting-options` | reporting lines |
| `GET /api/departments/{id}/history` | audit trail |

Users and tenants always come from the signed-in identity; a request body never names whose profile is meant. Every query is scoped to the caller's school (and branch) in code as well as by the global filter.

## Migration and deployment

One migration, `20261027101326_AddProfileChangesAndDepartmentHeads`: new tables `ProfileChangeRequests`, `ProfileAuditEntries`, `ProfileChangePolicies`, `AccountProfiles`; new columns `Departments.Code/HeadStaffId/IsActive`, `StaffMembers.DepartmentId/ReportingToStaffId`, `Guardians.Address`; indexes. A one-time `UPDATE` links existing staff to the department row with the same name in the same branch. Nothing is deleted. Applied by AcademicService on start (as before); no new configuration. Rebuild the AcademicService and UI images.

Existing staff have no reporting person: until an administrator sets one (or a department head is chosen), their changes go to the department head if their department has one, else to the administrators.

## Tests

AcademicService: `Profiles/ProfileChangeTests.cs` (24 tests: profiles for every login kind, protected fields, pending beside official, approve/reject, duplicates, withdraw, stale values, routing for each role, who may see and decide, reassignment, policy, departments, heads, reporting lines, options, tenant isolation) plus the updated `ProfileServiceTests` and `ProfileReviewTests`. Full suite 991 pass (including the SQL Server tests). SMS UI: `MyProfilePage.test.tsx` (12), `ProfileApprovalsPage.test.tsx` (7), departments API test updated; `typecheck:test` clean. Mobile: `profile-screen-test` passes with the new empty-state wording.

Live (AcademicService on the local SQL Server with the migration applied): 30 checks passed, including account profile creation without duplicates, pending versus official values, approve and reject, self-approval refused, another school refused, withdraw, policy, department create/edit/deactivate/duplicates, head and reporting errors.

## Not done

- **Profile photo.** The page shows initials. Photos upload through AuthService (`/api/users/{id}/profile-picture`), which this change does not touch.
- **Approver tab in the mobile apps.** The mobile profile screen keeps working (it shows the official values and sends edits as requests) but has no approvals inbox; approvers use the web app.
- **Teacher subjects on the profile.** Assigned classes show for class teachers; subject assignments are not listed.
- **Names of the school and branch** show as their ids (AcademicService has no name lookup).
- **Name changes are not copied to the sign-in account** in AuthService.
