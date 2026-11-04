# Sign-in with a one-time code: rollout runbook

For the feature described in [OTP_LOGIN_PLAN.md](OTP_LOGIN_PLAN.md). Everything ships **switched off**; password sign-in is unchanged at every step, and switching codes off again is one setting.

## 1. What has to exist before anything is switched on

| Need | Why | Who/when |
|---|---|---|
| MSG91 account, **DLT-registered OTP template** and sender id (India) | SMS cannot be sent in India without it; approval takes days | Start now |
| `OTP_HASH_KEY`, 32+ random characters, **not** the JWT secret | Keys the stored hash of each code. Changing it later makes unused codes fail (harmless, they last 5 minutes) | Generate once, keep in the secret store |
| SMTP working (`SMTP_PASSWORD` set) | Email codes reuse the password-reset mailer | Already used for resets |
| Database migrations applied | `AddOtpChallengesAndPhoneIndex`, `OtpChallengeRowVersion` (they run at AuthService start-up, like every migration) | Happens on deploy |

The first migration also rewrites existing mobile numbers to the international form (`+91…`) and shortens `Users.PhoneNumber` to 32 characters. Numbers it cannot read are left untouched. Take the usual database backup before the first deploy.

## 2. Settings (environment variables on AuthService)

Already added to `docker-compose.yml` and `deploy/azure/docker-compose.yml`; all optional, defaults are safe.

| Variable | Default | Meaning |
|---|---|---|
| `OTP_ENABLED` | `false` | Master switch. Off: the endpoints answer 404 and the apps show only the password form |
| `OTP_HASH_KEY` | empty | Required when enabled (service refuses to start otherwise) |
| `OTP_PILOT_TENANTS` | empty | Comma-separated tenant ids (e.g. `tenant-greenvalley,tenant-hillview`). Empty = every school |
| `OTP_ALLOW_ADMIN_SIGN_IN` | `false` | Administrator, Principal and SuperAdmin keep to their password unless this is `true` |
| `OTP_EXPOSE_CODE_IN_LOGS` | `false` | Development only. **Startup refuses `true` in Production** |
| `SMS_PROVIDER` | `Logging` | `Msg91`, `Twilio` or `Logging` (sends nothing). Production refuses `Logging` while codes are on |
| `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`, `MSG91_SENDER_ID` | empty | MSG91. The template has one variable, `OTP` (`##OTP##`) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | empty | Twilio alternative |

Limits (in `appsettings.json` under `Otp` / `RateLimiting`, change only with a reason): 6-digit code, 5-minute life, 60-second resend wait, 5 wrong guesses per code, 5 codes per destination per hour and 10 per day, 20 wrong guesses per destination per hour, per-IP 5 requests and 10 checks a minute.

**Startup check:** with `OTP_ENABLED=true` the service will not start if the hash key is short, the chosen SMS provider lacks credentials, or Production is on the log-only provider, the dev flag or without SMTP. A failed start is the intended signal; the previous release keeps running until the new one is healthy.

## 3. Order of rollout

1. **Deploy AuthService with `OTP_ENABLED=false`.** Confirm password sign-in works on web and in the apps. Nothing else changes.
2. **Deploy the web app.** It asks `GET /api/auth/methods?subdomain=…`; with codes off it shows the password form only.
3. **Staging smoke test** (section 4) with `OTP_ENABLED=true`, a real SMS provider and your own phone and email.
4. **Pilot one school on the web:** set `OTP_ENABLED=true` and `OTP_PILOT_TENANTS=<that school's tenant id>`. The web shows the code options only on that school's address. Ask the school to have a few people verify their mobile number (Security > Password > "Mobile number") and try Mobile OTP and Email OTP. Watch section 6 for a week.
5. **Release the mobile apps** (store review takes time, so submit early; they hide the code options until the server enables them, and are safe to release before step 4). Note: apps have no school before sign-in, so during a pilot they show the options to everyone and people outside the pilot simply receive no code. If that is confusing, hold the pilot to the web, or release the apps only when the pilot ends.
6. **Open to all schools:** empty `OTP_PILOT_TENANTS`. Announce it, and encourage people to verify their number (mobile OTP only works for verified numbers; email OTP works for every account that already has a confirmed email).
7. Decide separately whether leadership accounts get `OTP_ALLOW_ADMIN_SIGN_IN` (a code by SMS is weaker than a password for an account that can change anything).

## 4. Smoke test

`AuthService/scripts/otp-smoke.mjs`, from any machine that can reach the server:

```bash
node scripts/otp-smoke.mjs https://<host>/services/identity --burst
```

It checks, without needing an account and without sending any message: the methods endpoint, that an address nobody owns gets the same answer as any other, that a wrong or unknown code is refused with a generic 401, that malformed input is a 400, and (with `--burst`) that the rate limit trips. Then, **sending one real message**:

```bash
node scripts/otp-smoke.mjs https://<host>/services/identity --email you@school.example     # sends a code, prints the challenge id
node scripts/otp-smoke.mjs https://<host>/services/identity --email you@school.example --code 123456 --challenge <id>
```

The second run signs in (no token is printed) and confirms the same code cannot be used again. Use `--mobile "98765 43210"` for the SMS path (the number must already be verified), and `--subdomain <school>` to test as a school's web address. Run the "send" step against **an address you own**: seeded demo addresses may belong to real mailboxes and, if SMTP is configured, will really be emailed.

Also do by hand once: a number shared by two accounts (the account picker), the Staff app refusing a parent's number, and a wrong code five times (the code is then burned).

On 2026-11-03 this script and a real sign-in (code issued, hashed in the database, verified, reuse refused) were run against a freshly migrated scratch SQL Server database; production-like SMS delivery has not been exercised.

## 5. Turning it off / rollback

- **Stop codes everywhere:** `OTP_ENABLED=false` and restart AuthService. Endpoints answer 404, apps and web fall back to the password form on their next start (the web checks on every load). Sessions already opened with a code stay valid until they expire or are signed out, like any session.
- **Stop for one school:** change `OTP_PILOT_TENANTS` (or remove the school from it).
- **Provider trouble:** switch `SMS_PROVIDER`, or turn codes off. Email codes are unaffected by the SMS provider.
- The `OtpChallenges` table and the phone index are inert when off. Rolling the code back does not require a down-migration; if you ever do, `Down` drops the table and index and widens the column again.

## 6. Watching it

Everything is in the audit log (`AuditLogs`, `EntityName = 'OtpChallenge'`; the destination is masked and no code is ever stored):

| Action | Reason | Worry when |
|---|---|---|
| `OtpDeliveryFailed` | `provider_failed` | any sustained count: the provider or SMTP is down. **Callers still see the normal "code sent" answer by design**, so this is the only place a broken provider shows |
| `OtpRequested` | `sent` / `throttled` / `no_eligible_account` | `throttled` rising on one destination = someone hammering it |
| `OtpFailed` | `wrong_code`, `attempts_exhausted`, `destination_on_hold` | spikes = guessing |
| `OtpVerified` | `signed_in`, `select_account` | the success rate |
| `PhoneVerified` | `verified` | adoption of mobile verification |

Handy query:

```sql
SELECT Action, JSON_VALUE(NewValues, '$.reason') AS Reason, COUNT(*) AS N
FROM AuditLogs
WHERE EntityName = 'OtpChallenge' AND OccurredAt > DATEADD(day, -1, SYSUTCDATETIME())
GROUP BY Action, JSON_VALUE(NewValues, '$.reason') ORDER BY N DESC;
```

Cost: each SMS costs money and is only sent for real, verified, eligible accounts, within the limits above; look at the provider's dashboard during the pilot.

## 7. Known limits (decide whether they matter before opening to everyone)

- Pilot is a **list in configuration**, not a per-school switch in the database or the Platform Console (that needs a column and a screen). Changing it needs a restart.
- No daily SMS cost cap per school; the per-destination and per-IP limits are the protection.
- The admin exclusion is global (`OTP_ALLOW_ADMIN_SIGN_IN`), not per school.
- Mobile numbers must be verified by their owner; admin-typed numbers do nothing until then. Parent/student phones that live only in AcademicService are not copied across.
- Refresh tokens are stored unhashed (pre-existing; D6 in the plan) and the Student/Teacher apps' audience check is still client-side. Both are unchanged by this feature.
- Not yet exercised: a real SMS provider, the apps on devices, the full flow through the API gateway.
