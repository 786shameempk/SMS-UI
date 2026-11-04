# Multiple sign-in methods: Email + Password, Mobile + OTP, Email + OTP

Status: **Phases A (groundwork), B (SMS/email delivery) C (OTP service and endpoints) D (web UI) and E (mobile apps) built 2026-11-02/03, uncommitted; and F (rollout: pilot list, compose settings, smoke script, runbook in OTP_ROLLOUT.md) — all phases built, nothing committed or deployed.** Decisions D1-D5 accepted as recommended. Written 2026-11-02 from the actual code in `AuthService`, `ApiGateway`, `SMS UI` and `SMS Mobile` (staff, student, teacher apps). Waiting for approval before any development.

Contents: 1 Current architecture - 2 Existing flow - 3 Gap analysis - 4 Proposed architecture - 5 Database - 6 API - 7 UI flow - 8 SMS/Email - 9 Security - 10 File-by-file changes - 11 Roadmap - 12 Testing and deployment - 13 Risks and decisions needed.

---

## 1. Current architecture overview

| Piece | What exists (verified in code) |
|---|---|
| Identity store | ASP.NET Core Identity on `ApplicationUser : IdentityUser<Guid>` (AuthService). Password policy 8+ with upper/lower/digit/symbol; lockout after `Security:MaxFailedAccessAttempts` (5) for 30 min; `RequireUniqueEmail = true` (`AuthService.Infrastructure/DependencyInjection.cs`). |
| Tenancy | One user belongs to **exactly one tenant** (`TenantId`, null only for SuperAdmin) and one branch (`BranchId`, null for all-branch roles). The login email is **globally unique**, so email alone identifies tenant and account. |
| Roles | A user can hold **several roles**. `UserTypes.For(roles)` derives one `user_type` (SuperAdmin > Admin > Teacher > Staff > Parent > Student). |
| Tokens | `JwtTokenService`: access JWT with `sub`, `NameIdentifier`, `email`, `jti`, role claims, permission claims (`module.*`, staff actions), `tenant_id`, `branch_id` or `branch_scope=all`, `user_type`, optional `client_app`, optional `must_change_password`. Refresh token = 64 random bytes (Base64) in table `RefreshTokens`, 7-day fixed expiry, rotated on use (`IsUsed`). |
| Gateway | `ApiGateway` (YARP). Validates the same JWT; **does not enforce auth on routes**: `/services/identity/{**catch-all}` forwards to AuthService unchanged, so any new anonymous `/api/auth/*` endpoint is reachable with no gateway change. |
| Email | `IEmailService.SendEmailAsync` -> `EmailService` (System.Net.Mail SMTP, `Smtp` settings). |
| SMS | **None in AuthService.** Only `IWhatsAppService` -> `LoggingWhatsAppService` (log-only placeholder). EngagementService has real `Msg91SmsSender` / `TwilioSmsSender` / `WhatsAppCloudSender`, but they are per-tenant, post-login, and not reusable pre-login. |
| Rate limiting | `RateLimitingExtensions`: per-client-IP sliding windows. Policies `auth-login` (10/min), `auth-refresh` (30/min), `auth-recovery` (5/min). Trusted-proxy handling for `X-Forwarded-For` exists. |
| Audit | MediatR events `UserLoggedInEvent` / `UserLoginFailedEvent` -> `AuditLogNotificationHandler` -> audit log (reason codes such as `invalid_credentials`, `account_locked`, `wrong_tenant`, `tenant_inactive`, `app_not_allowed`). `LoggingBehavior` logs request *type names only*, never bodies. |
| Existing OTP-like code | `MfaService` (RFC 6238 TOTP, AES-GCM-protected secret) for the **Office portal only** (`/adminLogin`). Not usable for school users but a good pattern for constant-time comparison. |

## 2. Existing authentication flow (request to access)

**Web** (`SMS UI/src/features/authentication`): `LoginPage.tsx` (react-hook-form + zod: email, password, rememberMe) -> `api.login()` -> `POST /api/auth/login` through `authHttpClient` with `{email, password, subdomain}`; `subdomain` comes from `getTenantSubdomain()` (school host `greenvalley.sms-schoolsphere.com`). Response `AuthResponseDto {accessToken, refreshToken, accessTokenExpiresAt, user}` -> `mapAuthUser` + `mapModulePermissions` -> `authStore.setSession(...)`. `lib/httpClient.ts` adds bearer, `X-Tenant-Id`/`X-Branch-Id` and silently refreshes on 401 via `/api/auth/refresh-token`.

**Mobile** (`SMS Mobile`): three Expo apps (`apps/staff|student|teacher/src/app/sign-in.tsx`, ~120 lines each, near-identical) call `signIn(email, password)` in `packages/auth/src/session.ts` -> `auth.login()` in `packages/api/src/auth/api.ts` -> same endpoint with `clientApp: "staff"` for the Staff app only (null for Student and Teacher; no subdomain on mobile). After the response, `isAllowedUser(session.user)` is a **client-side** audience check for Student/Teacher apps (the server enforces only the `staff` audience). Session persisted by `persist(session)`; refresh rotates the pair.

**Server steps in `LoginCommandHandler`** (order matters and must be preserved):
1. `GetUserByEmailAsync` (not found / inactive / soft-deleted -> publish `invalid_credentials`, generic "Invalid email or password.").
2. `IsLockedOutAsync` -> `account_locked`.
3. `CheckPasswordAsync` (increments/resets Identity access-failed counter).
4. If `Subdomain` given: user's tenant must match that subdomain, else the *same generic message* (`wrong_tenant`).
5. Tenant `Suspended`/`Cancelled` -> `tenant_inactive`.
6. `ClientApps.Admits(clientApp, user.UserType)` -> `app_not_allowed` (checked only after the password so it does not reveal account type).
7. Password expiry (`PasswordExpirationDays` 90) sets `MustChangePassword`.
8. `EffectivePermissions.ApplyAsync`, mint JWT + refresh token (stores IP, user-agent, browser, OS, device), `UpdateLastLoginAsync`, publish `UserLoggedInEvent`.

**Other flows:** `register`, `forgot-password` (emails a reset link, generic response for unknown email), `reset-password`, `verify-email`, `resend-verification-email`, `change-password`, `logout`, `logout-all`, `sessions`. `MustChangePasswordMiddleware` blocks every call except change-password/logout/refresh while the token carries `must_change_password`.

**Account creation:** admin/office/onboarding paths (`CreateSchoolUser`, `ProvisionPersonLogin`, `OfficeInvitationService`, tenant creation) create the user, set `EmailConfirmed = true` **without any proof of mailbox ownership**, and email a set-password link. `ProvisionPersonLogin` does **not** set a phone number; `CreateSchoolUser`/`UpdateSchoolUser` set `PhoneNumber = request.Phone.Trim()` (free text).

## 3. Gap analysis (what is missing or weaker than assumed)

| # | Finding | Impact on this feature |
|---|---|---|
| G1 | **Mobile numbers are not reliable identifiers today.** `PhoneNumber` is optional free text, not normalized (spaces, `+91`, `0` prefixes all possible), **not unique, not indexed**, and `PhoneNumberConfirmed` is never set anywhere. Most parent/student/teacher logins are provisioned without any phone in AuthService; their phones live in AcademicService (`Student.Phone`, guardian phones, `StaffMember.Phone`) with no sync. | Mobile OTP cannot work for existing users until numbers are normalized, backfilled/collected and **verified**. This is the biggest piece of work. |
| G2 | **One phone can map to many accounts** (family phone shared by parent and a student login; one parent for children in different schools; staff who are also parents). No uniqueness rule exists. | Need a safe account-resolution step (section 4.4). |
| G3 | **`EmailConfirmed` is not proof.** It is set `true` at creation for admin-entered emails. | Email OTP is only as safe as the invite flow; accepted (same risk as the reset link), but must be a stated decision (D2). |
| G4 | `EmailService` **swallows SMTP failures** (logs, returns normally) and, when SMTP is unconfigured, **logs the full body**. | An OTP email would be logged in clear text in dev/unconfigured environments, and the API could not tell the user delivery failed. Needs a dedicated OTP sender that never logs the code and reports failure. |
| G5 | No SMS capability in AuthService. | New `ISmsService` + at least one real provider + a logging dev implementation. |
| G6 | Rate limiting is per-IP only; no per-destination or per-user limit; nothing counts messages sent. | SMS/email bombing protection needs DB-backed per-destination limits and a daily cap. |
| G7 | `LoginCommandHandler` mixes "verify credential" with "issue session" (steps 4-8 inclusive of gating, tenant checks, token minting). | Extract the shared part so OTP reuses it instead of copying it (one pipeline, as required). |
| G8 | Refresh tokens are stored **in plain text** (`RefreshTokens.Token`), fixed 7 days, and sessions record no sign-in method. | Not caused by this feature; flagged because OTP adds a new way to mint them. Recommend hashing as a separate hardening item. |
| G9 | `ClientApps` only knows `staff`; Student/Teacher app audience is enforced **client-side only**. | Unchanged for OTP, but the OTP verify endpoint must apply the same `ClientApps.Admits` and the apps should keep `isAllowedUser`. Recommend adding `student` and `teacher` client apps later (optional). |
| G10 | `must_change_password` users (temporary admin password) would, after an OTP login, be forced to call `change-password` which demands the *current* password they do not know. | Decision D4: OTP sessions do not carry the claim. |
| G11 | Three mobile `sign-in.tsx` files are copy-pasted. | Put the new method switcher and OTP screen in `packages/ui`/`packages/auth` once and use it in all three. |
| G12 | The web `LoginPage` is a 360-line single form with a demo-accounts panel. | Refactor into method tabs without touching password behavior. |

## 4. Proposed architecture

### 4.1 One pipeline

```
password  -> verify credential -+
otp(mobile) -> verify OTP ------+--> SignInSessionService.IssueAsync(user, ip, clientApp, subdomain, method)
otp(email)  -> verify OTP ------+       (gating, tenant status, permissions, JWT, refresh token, audit)
```

`SignInSessionService` (new, Application layer) holds the logic now in `LoginCommandHandler` steps 4-8. `LoginCommandHandler` becomes: find user -> active? -> locked? -> password -> `IssueAsync`. Behavior, messages, event reasons and claims stay identical (existing `LoginCommandHandlerTests` are the safety net). OTP handlers call the same `IssueAsync`, so JWT claims, tenant context, roles, permissions, `client_app`, branch scope and the refresh token structure are the same by construction. One additive, optional claim `amr` (`pwd` | `otp_email` | `otp_sms`) is recommended for audit and for later step-up rules; every consumer ignores unknown claims, so it is non-breaking.

### 4.2 Verified contact details (your decision 2)

- **Mobile OTP login requires `PhoneNumberConfirmed = true`.** Verification happens by the signed-in user in Profile (OTP to the number, same service, purpose `VerifyPhone`), or an admin-entered number stays *unverified* until the user confirms it. Changing the number resets confirmation. Unverified numbers never receive a login OTP (the response is still generic).
- **Email OTP requires `EmailConfirmed = true`** (existing flag; every invited user already has it, because the set-password link went to that mailbox). Changing the email (`ChangeEmailAsync`) must keep resetting it. See D2 for the stricter alternative.
- Existing users with no verified phone see a "Verify your mobile number" prompt after a normal login (web profile and mobile apps), which is also how the data gets collected.

### 4.3 Phone normalization

Store numbers in E.164 (`+919656040881`). New setting `Otp:DefaultCountryCode` (`+91`). A `PhoneNumbers.Normalize()` helper is applied on write in `CreateSchoolUser`, `UpdateSchoolUser`, profile update and verification; a one-time backfill migration normalizes existing values and leaves unparsable ones null-for-OTP (kept as-is for display). Lookup uses the normalized value with a **non-unique filtered index** on `PhoneNumber` (uniqueness cannot be imposed: G2).

### 4.4 Account ambiguity (your decision 3)

- **Email OTP is never ambiguous** (email is globally unique).
- **Mobile OTP**: candidates = active, non-deleted users with that normalized, confirmed phone, in an active tenant, filtered by `Subdomain` (web school host) and `ClientApp` audience when supplied.
  - 0 candidates: nothing is sent; the response still looks identical (decoy challenge).
  - 1 candidate: the OTP is bound to that user.
  - 2+ candidates: the OTP is bound to the *destination*, not a user. After the code verifies (the person has proven they hold the phone), the server returns `status: "select_account"` with a one-time signed `selectionToken` (5 min) and a list of `{userId, displayName, schoolName, roleLabel}`. The client shows a picker; `POST /api/auth/otp/select {selectionToken, userId}` finishes the login. The list is never shown before the code is verified, so it cannot be used to enumerate accounts. On a school subdomain the list is already narrowed to that school, so the common web case is single-step.
- The chosen account then passes the same lockout, tenant-status and audience checks as any login.

## 5. Database design

Minimum change: **one new table, one new index, no change to `AspNetUsers` columns** (`PhoneNumber`, `PhoneNumberConfirmed`, `EmailConfirmed` already exist). Optional: `RefreshTokens.AuthMethod` (nullable string, for the sessions screen).

`OtpChallenges`

| Column | Type | Notes |
|---|---|---|
| `Id` | guid PK | also the public `challengeId` |
| `Purpose` | string(20) | `Login`, `VerifyPhone`, `VerifyEmail` (reuses the table for the verification process) |
| `Channel` | string(10) | `Email` / `Mobile` (your `OTPType`) |
| `Destination` | string(256) | normalized email (lower-case) or E.164 phone (your `Destination`) |
| `UserId` | guid null | null for ambiguous mobile logins and for decoy challenges (no account) |
| `OtpHash` | string(64) | **HMAC-SHA256(serverKey, challengeId + code)**, hex. Not a bare SHA-256: a 6-digit code has only 10^6 values and a bare hash is reversible in milliseconds. Key from config `Otp:HashKey` (min 32 bytes) |
| `ExpiresAt` | datetime | created + 5 min |
| `ResendAvailableAt` | datetime | created + 60 s |
| `FailedAttempts` / `MaxAttempts` | int | 5 allowed wrong codes, then the challenge is burned |
| `IsUsed` / `VerifiedAt` | bool / datetime null | single use, set atomically |
| `SupersededAt` | datetime null | set on older open challenges when a new one is requested |
| `Delivered` | bool | false when the provider call failed |
| `RequestIp`, `ClientApp`, `Subdomain` | strings | `ClientApp`/`Subdomain` are pinned at request time and **must match on verify**, so a code requested for one app/school cannot be redeemed for another |
| `CreatedAt` | datetime | |

Indexes: `(Destination, CreatedAt)` for per-destination throttling; `(UserId, CreatedAt)`; `ExpiresAt` for the cleanup job. A nightly job (the Office portal already runs `OfficeJobs`) deletes challenges older than 7 days; no code is ever stored, only the keyed hash.

Plus: filtered index on `AspNetUsers.PhoneNumber` (where not null) and the one-time phone normalization backfill (idempotent; numbers that cannot be parsed are left untouched and simply never match an OTP lookup).

Answers to the Phase 3 questions: mobile numbers are stored but unverified and unnormalized (G1); emails are unique (case-insensitive normalized index from Identity); users can have multiple roles; each user belongs to one tenant/branch; a mobile number *can* map to multiple accounts today (G2) and nothing prevents it.

## 6. API design (AuthService, via gateway `/services/identity/api/auth/...`)

All new endpoints are anonymous except where noted, under `[EnableRateLimiting("auth-otp")]` plus the DB limits in section 9.

| Endpoint | Request | Response |
|---|---|---|
| `POST /api/auth/otp/request` | `{channel: "email"\|"mobile", destination, clientApp?, subdomain?}` | **Always** `202 {challengeId, expiresInSeconds: 300, resendAfterSeconds: 60, maskedDestination}`. `maskedDestination` is computed from what the caller typed (`+91******881`, `a***@school.edu`), never from the account. Identical for known, unknown, unverified and rate-limited-by-destination cases (see 9). Only IP-level throttling returns `429`. |
| `POST /api/auth/otp/resend` | `{challengeId}` | `202` same shape; enforces cooldown (`429` with `Retry-After`), invalidates the old challenge, caps resends (3 per challenge chain). |
| `POST /api/auth/otp/verify` | `{challengeId, code, clientApp?, subdomain?}` | `200 AuthResponseDto` (identical to `/login`), or `200 {status:"select_account", selectionToken, accounts:[...]}`, or `401` with the generic `"That code is incorrect or has expired."` and a `code` of `otp_invalid` (wrong/expired/used/unknown challenge are indistinguishable) / `otp_locked` after attempts are exhausted / the existing `account_locked`, `tenant_inactive`, `app_not_allowed` codes. |
| `POST /api/auth/otp/select` | `{selectionToken, userId}` | `200 AuthResponseDto` |
| `POST /api/auth/phone/request` (auth) | `{phoneNumber}` | `202 {challengeId,...}`; purpose `VerifyPhone`, number must not be rejected as in use by the same school's other user in a way that leaks (shared numbers are allowed) |
| `POST /api/auth/phone/verify` (auth) | `{challengeId, code}` | `204`; sets `PhoneNumber` (normalized) and `PhoneNumberConfirmed = true` |

Existing endpoints (`login`, `refresh-token`, `logout`, `forgot-password`, ...) are **unchanged**. `LoginRequest` is not touched.

## 7. Frontend and mobile UI flow

**Shared flow** (all four apps): a three-option segmented control on the sign-in screen - `Password` | `Mobile OTP` | `Email OTP` - persisted per device (last used method).

1. *Enter destination* (email field, or country-prefixed mobile field with validation) -> "Send code".
2. *Enter code*: 6-box numeric input (autofill `oneTimeCode` / Android SMS retriever), "Code sent to +91******881" (masked, same text for every input), **resend countdown** (60 s, button enabled after), **"Change number/email"** link returning to step 1 (and invalidating the old challenge), inline errors: "That code is incorrect or has expired" with remaining attempts only when not account-revealing, "Too many attempts, request a new code", "Please wait N seconds", provider failure "We couldn't send the code, try again".
3. *Optional account picker* (mobile only, when several accounts share the number): list of school + role.
4. Success -> same session handling as today.

**Web (`SMS UI`)**: `LoginPage.tsx` keeps the password form byte-for-byte as the default tab; new `OtpLoginForm.tsx`, `OtpCodeInput.tsx`, `useResendCountdown.ts`; `authentication/api.ts` gains `requestOtp/resendOtp/verifyOtp/selectOtpAccount` reusing `mapAuthUser`/`mapModulePermissions`; translation keys in the `authentication` namespace for en/ml/ta/hi/ar. Profile page gets "Verify mobile number".

**Mobile**: `packages/api/src/auth/api.ts` adds the same four calls (reusing `toSession`); `packages/auth/src/session.ts` adds `signInWithOtp(...)` that ends in the same `isAllowedUser` check and `persist`; `packages/ui` gets `SignInMethodSwitcher` and `OtpCodeField`; the three `sign-in.tsx` files shrink to compose them (the Staff app passes `clientApp: "staff"`). Prompt to verify the mobile number after password login in each app.

## 8. SMS and email integration

**Email:** reuse the SMTP configuration, but add `IOtpMailer` (thin wrapper) that (a) renders a dedicated template `OtpEmail.Build(schoolName?, code, minutes)` in the style of `WelcomeEmail`/`PersonInvitationEmail`, (b) **never logs the body or code**, and (c) returns delivered/failed (needs a small `IEmailService.TrySendAsync` returning `bool`; the current method keeps its behavior for existing callers). Unconfigured SMTP in Development: log only "OTP email suppressed" plus the challenge id; a `Development`-only `Otp:ExposeCodeInLogs` flag may print the code locally and is rejected at startup in Production.

**SMS:** new `ISmsService { Task<SmsResult> SendOtpAsync(string e164, string code, int validForMinutes, CancellationToken ct); }` in Application. Implementations in Infrastructure, selected by `Sms:Provider`:
- `Msg91SmsService` (recommended for India: DLT-registered OTP template; EngagementService's `Msg91SmsSender` is the reference implementation), `TwilioSmsService` (international fallback), `LoggingSmsService` (default when unconfigured; never prints the code outside Development).
- Config (environment variables / `appsettings`): `Sms:Provider`, `Sms:Msg91:AuthKey`, `Sms:Msg91:OtpTemplateId`, `Sms:Msg91:SenderId`, `Sms:Twilio:AccountSid/AuthToken/From`, timeout and retry (1 retry on transient 5xx only; the provider must not be retried blindly because each send costs money and counts toward bombing limits).
- Platform-level credentials, **not** the per-school Engagement settings: sign-in happens before any tenant context exists, and login availability must not depend on EngagementService being up.
- Action required outside code: register the OTP template/sender with DLT (India) - lead time of days.

## 9. Security recommendations

- **Generation:** `RandomNumberGenerator.GetInt32(0, 1_000_000)` zero-padded to 6 digits (no `Random`). 
- **Storage:** keyed HMAC only (section 5), compared with `CryptographicOperations.FixedTimeEquals`. Code never stored, logged, audited or returned (including in `PerformanceBehavior`/exception messages - verify they do not serialize requests before shipping).
- **Lifetime/use:** 5 minutes; single use via an atomic conditional update (`UPDATE ... SET IsUsed=1 WHERE Id=@id AND IsUsed=0 AND ExpiresAt>now AND FailedAttempts<Max`, check rows affected) so two concurrent verifies cannot both succeed; a new request supersedes older open challenges for the same destination+purpose.
- **Brute force:** 5 wrong codes burn the challenge; verify is also limited per IP (`auth-otp-verify`, 10/min) and per destination (20 wrong attempts/hour across all challenges, then a temporary hold). Failed OTP attempts do **not** feed Identity lockout (otherwise anyone could lock a victim out by guessing wrong), but a locked/inactive account still cannot sign in by OTP.
- **Anti-bombing:** per destination: 60 s cooldown, max 5 challenges/hour, 10/day; per IP: `auth-otp` 5/min and 30/hour; per tenant (resolved from subdomain or account) a configurable daily SMS cap, with an alert on 80%; global kill-switch setting `Otp:Enabled`. Limits that trigger on a *destination* return the same `202` as success (silently not sending) so the endpoint cannot be used to learn which numbers are registered or throttled; only IP limits return `429`.
- **Enumeration:** identical status, body and approximate latency for registered/unknown/unverified/inactive/locked; for unknown destinations a decoy challenge row is created and verify always fails generically. Pad response time (fixed minimum duration) because the real path calls a provider.
- **Binding:** challenge is bound to `ClientApp` and `Subdomain` at request time (section 5); selection tokens are signed (HMAC), 5 min, single use, bound to the challenge.
- **Tokens:** go through `IssueAsync` only - same `GenerateAccessToken`, same CSPRNG refresh token, same 7-day expiry and rotation. Optional `amr` claim.
- **Audit:** new events `OtpRequested`, `OtpDelivered`/`OtpDeliveryFailed`, `OtpVerified`, `OtpFailed(reason)`, `OtpLocked`, `PhoneVerified` through the existing audit pipeline with destination **masked** and reason codes only; successful OTP sign-in still publishes `UserLoggedInEvent` (so login history works).
- **Transport:** HTTPS only (already behind Caddy); `Cache-Control: no-store` on OTP responses.
- **Is verification required?** Yes for mobile (G1/G3). For email, existing `EmailConfirmed` is accepted (D2).
- **SIM-swap / social engineering risk:** OTP-only is weaker than password+OTP. Recommend allowing OTP login for Parent/Student/Teacher/Staff by default and **disallowing it for Admin/Principal/SuperAdmin unless a tenant setting enables it** (D3). Office-portal accounts keep their TOTP and are out of scope.

## 10. File-by-file change list

### AuthService (backend)

| Existing file | Change | Impact |
|---|---|---|
| `Commands/Login/LoginCommandHandler.cs` | Extract steps 4-8 into `ISignInSessionService.IssueAsync`; handler calls it. | Behavior identical; run `LoginCommandHandlerTests` first and after. |
| `API/Controllers/AuthController.cs` | Add the six endpoints; requests records. | Additive. |
| `API/Extensions/RateLimitingExtensions.cs` | Add policies `auth-otp`, `auth-otp-verify` and `RateLimitSettings` fields. | Additive. |
| `Application/Interfaces/IEmailService.cs` + `Infrastructure/Services/EmailService.cs` | Add `TrySendAsync(...) : Task<bool>` (no body logging). | Existing `SendEmailAsync` unchanged. |
| `Application/Configuration/SecuritySettings.cs` (or new `OtpSettings`) | Add `Otp` section class. | Additive. |
| `Application/Commands/CreateSchoolUser`, `UpdateSchoolUser`, profile-update paths | Normalize phone on write; reset `PhoneNumberConfirmed` when the number changes. | Small; test `SchoolAdministrationHandlerTests`. |
| `Infrastructure/Identity/IdentityService.cs` | Add `FindByConfirmedPhoneAsync`, `MarkPhoneConfirmedAsync`. | Additive to `IIdentityService`; fakes in tests need the new members. |
| `Infrastructure/DependencyInjection.cs` | Register `ISmsService`, `IOtpService`, `IOtpMailer`, options. | Startup validation: fail if `Otp:HashKey` missing/short in Production. |
| `Infrastructure/Persistence/ApplicationDbContext.cs` + `Configurations/OtpChallengeConfiguration.cs` + new migration | New table, indexes, phone index, backfill. | Migration is additive and online. |
| `Application/EventHandlers/AuditLogNotificationHandler.cs` | Handle the new OTP events. | Additive. |
| `Application/Office/Operations/OfficeJobs.cs` (or equivalent job host) | Nightly purge of old challenges. | Additive. |

**New:** `Domain/Entities/OtpChallenge.cs`; `Domain/Events/Otp*Events.cs`; `Application/Interfaces/{ISmsService,IOtpService,ISignInSessionService,IOtpMailer}.cs`; `Application/Common/{PhoneNumbers,OtpEmail}.cs`; `Application/Commands/{RequestOtp,ResendOtp,VerifyOtp,SelectOtpAccount,RequestPhoneVerification,VerifyPhone}/*` (command, handler, validator each, matching the repo layout); `Infrastructure/Services/{Msg91SmsService,TwilioSmsService,LoggingSmsService,SmsSettings}.cs`; `Infrastructure/Identity/OtpService.cs`.

### ApiGateway
No change required (catch-all identity route, auth not enforced per route). Confirm CORS and the 429 passthrough in a smoke test.

### SMS UI (web)
`features/authentication/pages/LoginPage.tsx` (method tabs, password form unchanged); `features/authentication/api.ts` (4 calls + types); new `components/{OtpLoginForm,OtpCodeInput,AccountPicker,SignInMethodTabs}.tsx` and `hooks/useResendCountdown.ts`; profile/security page gets phone verification (`SecuritySettingsPage.tsx` or the profile feature); `src/i18n/locales/{en,ml,ta,hi,ar}/authentication.json`; tests next to each (the repo type-checks tests: run `npm run typecheck:test` and `test:coverage`).

### SMS Mobile
`packages/api/src/auth/api.ts` (`requestOtp`, `resendOtp`, `verifyOtp`, `selectOtpAccount`, phone verify); `packages/auth/src/session.ts` (`signInWithOtp`, same audience check); `packages/ui` (`SignInMethodSwitcher`, `OtpCodeField`); `apps/{staff,student,teacher}/src/app/sign-in.tsx` (compose shared pieces; staff passes `clientApp`); a profile-screen "Verify mobile" row in each app; i18n strings in `packages/i18n`.

## 11. Phased implementation roadmap

1. **Phase A - groundwork (backend, no user-visible change):** extract `SignInSessionService`; add phone normalization helper and write-path normalization; migration (table + phone index + backfill); `EmailService.TrySendAsync`; tests proving password login is unchanged.
2. **Phase B - providers:** `ISmsService` + Msg91/Twilio/Logging, `IOtpMailer` + template, config validation, DLT registration in parallel.
3. **Phase C - OTP core:** `OtpService`, request/resend/verify/select endpoints, limits, audit, purge job; phone verification endpoints.
4. **Phase D - web:** method tabs, OTP form, profile verification, translations.
5. **Phase E - mobile:** shared components, three apps, verification prompt.
6. **Phase F - rollout:** feature flag `Otp:Enabled` off by default; staging with a real SMS provider; pilot one school; then enable per tenant (`TenantSettings`), then default on. Adoption driver: collect and verify mobile numbers via the post-login prompt before announcing mobile OTP.

Rough size: A 2-3 days, B 2, C 4-5, D 3, E 4, F 2-3 plus testing; about 3 weeks for one developer, excluding DLT approval time.

## 12. Testing and deployment plan

**Backend unit/integration** (existing conventions: xUnit, `TestSupport`, SQL Server tests under `SMS_TEST_SQL`): password login regression (every existing `LoginCommandHandlerTests` case passes untouched); mobile OTP success; email OTP success; wrong code (attempt counter, generic message); expired code; reused code; concurrent verify of the same code (exactly one wins); resend (cooldown enforced, previous code invalid, resend cap); many requests to one destination (hourly cap, silent suppression, identical response); unregistered number/email (decoy, no send, identical response and timing envelope); unverified phone (no send); **several users sharing one number** (picker only after verify; subdomain narrows; selection token single-use, expired, wrong user rejected); **multi-tenant** (challenge pinned to subdomain/client app, cross-school redemption fails; suspended tenant -> `tenant_inactive`); **multiple roles** (`user_type` and permissions identical to a password login); locked/inactive account cannot OTP in; `ClientApps` audience refusal; JWT claims equality test (password vs OTP session: same set except optional `amr`); refresh after OTP login rotates normally; JWT expiry and refresh; provider failure (SMS and SMTP down: delivery failure recorded, user sees a retryable message, no secret in logs, challenge not counted against the user's attempts); log scan test asserting no 6-digit code appears in captured logs; migration backfill test on messy phone formats.

**Web:** component tests for tab switching, code input (paste, backspace, autofill), countdown, change-destination, error states, password tab unchanged (existing `LoginPage.test.tsx`). **Mobile:** unit tests for api/session functions; manual matrix on Student, Teacher and Staff apps for all three methods on iOS and Android, including SMS autofill and "wrong app" refusal.

**Security tests:** brute force against one challenge (locks after 5), distributed guessing against one destination, enumeration timing comparison, bombing from one IP and from many IPs against one number, replay of a captured `verify` request.

**Deployment/config:** new env vars `Otp__Enabled`, `Otp__HashKey` (secret), `Otp__DefaultCountryCode`, `Sms__Provider`, `Sms__Msg91__*` or `Sms__Twilio__*` (secrets via the same mechanism as `Smtp__Password` / `Jwt__Secret`; see `docs/JWT_KEY_ROLLOUT.md` for the rotation pattern), `RateLimiting__Otp*`. Order: deploy AuthService (migration + flag off) -> verify password login on staging -> deploy web and mobile builds (they hide OTP when the server reports it disabled via a small `GET /api/auth/methods` capability response, so old/new clients mix safely) -> enable per tenant. Rollback = flag off; the table is inert.

## 13. Risks, recommendations and decisions needed

**Risks:** (1) low phone coverage/quality delays usefulness of mobile OTP (G1) - mitigated by the verify prompt and backfill; (2) SMS cost and abuse - mitigated by caps and kill switch; (3) DLT approval lead time (India); (4) shared family phones - handled by the picker; (5) OTP-only weakens admin accounts - D3; (6) refactor of the login handler touches the most sensitive code - guarded by existing tests and a claims-equality test; (7) mobile builds need store releases, so the server must stay backward compatible (it is: additive endpoints, feature flag).

**Decisions needed from you before development:**

- **D1 SMS provider:** MSG91 (recommended for India, DLT) vs Twilio vs both behind `ISmsService`.
- **D2 Email trust:** accept existing `EmailConfirmed` (recommended; simplest) or require each user to re-verify their email once before email OTP works.
- **D3 Who may use OTP:** all users (simplest) vs everyone except Admin/Principal/SuperAdmin unless a tenant switch enables it (recommended).
- **D4 `must_change_password` after OTP login:** omit the claim for OTP sessions (recommended) vs force a password-set step.
- **D5 Country:** confirm default `+91` and whether international numbers must be supported on day one.
- **D6 Optional hardening to schedule separately:** hash refresh tokens at rest (G8) and add `student`/`teacher` server-enforced client apps (G9).

No code, schema or configuration has been modified. Please confirm D1-D5 (or accept the recommendations) and I will start with Phase A.
