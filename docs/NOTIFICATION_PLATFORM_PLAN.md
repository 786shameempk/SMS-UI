# Enterprise notification platform - gap analysis, what was built, what is left

Written and built 2026-11-09. The "notification service" is the **Messaging module of EngagementService**; no new
service or infrastructure was introduced. It already had most of the plumbing, so this work fills the gaps.

Backend: `E:\Personal\EngagementService` (migration `NotificationPlatform`). UI: `src/features/communication`.
Everything below is **uncommitted** in both repos.

## What already existed (reused)

| Requirement | Existing |
|---|---|
| Per-school provider config, secrets encrypted (Data Protection), platform default fallback | `MessagingProviderConfig`, `MessagingConfigResolver`, `ISecretProtector` |
| Providers | SMTP, Brevo (email), MSG91, Twilio (SMS), WhatsApp Cloud API |
| Provider abstraction | `IMessagingSender` + registry |
| Outbox + worker, lease, retry with exponential backoff, dead letter (Failed + retry button), idempotency key, per-minute and daily limits | `DeliveryLogEntry`, `MessagingDeliveryProcessor`, `MessagingWorker` |
| Webhooks with signature / token verification | `MessagingWebhooksController` |
| Suppression list, WhatsApp opt-in | `MessagingSuppression`, `MessagingOptIn` |
| Templates per language, DLT id, WhatsApp template mapping | `MessageTemplate` |

## Gaps closed

| # | Gap | What was built |
|---|---|---|
| A | Amazon SES | `AmazonSesEmailSender` (SES v2 API, AWS SigV4 signing, HTML + text), SNS webhook `POST /api/messaging/webhooks/ses/{configId}?token=` (delivery, open, click, permanent bounce -> suppress, soft bounce, complaint -> suppress, reject). The SNS subscribe link is followed only if it is an `https://sns.*.amazonaws.com` address. |
| B | Event routing + fallback | `NotificationRule` (preferred channels sent together, ordered fallback channels, mandatory flag, priority). Platform defaults for otp, fee.reminder, fee.receipt, attendance.absent, exam.result, homework.assigned, circular, announcement, emergency (`NotificationRuleDefaults`); a school's saved rule overrides one. Fallback rows are written as `Standby` and released by `FallbackPlanner` only when every earlier channel for that person failed for good (provider refusal after retries, a bounce / failure webhook, or a channel that could not be attempted). They cost nothing otherwise. Retry skips a failure whose fallback already went; cancel also cancels standbys. |
| C | Central API for other services | `POST /internal/notify` (service key `X-Service-Key` + `X-Tenant-Id` must equal body `tenantId`, per-school rate limit). Body: `tenantId, eventType, recipients[{kind: Student|Staff|Parent, id, placeholders}], placeholders, language, idempotencyKey, priority`. Same idempotency key returns the first result (200, `duplicate: true`). Returns 202 `{messageId, queued, standby, skipped}`. Contact lookup is via AcademicService (existing `IContactDirectory`). |
| D | Templates | `EventType`, `Version` (bumped on wording change), `ApprovalStatus` (event notifications use Approved + active only; editing wording of an event template sets Pending), `IsActive`, `WhatsAppCategory`. `TemplateRenderer` fills `{{Placeholders}}` per recipient (case-insensitive, missing -> empty, never leaks raw tokens). Preview endpoint with sample data, unknown-placeholder warning and SMS part count. **Also fixed**: the templates API previously dropped language and the SMS / WhatsApp provider fields on save. |
| E | Priority | `Priority` on deliveries; the worker takes Critical > High > Normal > Low, then oldest due. |
| F | Consent | Preferences API over suppression + opt-in rows with source and timestamp. Mandatory events bypass an *opt-out* but never a bounce / complaint / invalid number. Re-enabling refuses to clear a bounce. |
| G | Usage and billing | Monthly summary per channel (WhatsApp split by category), per-channel monthly quota + alert percent + overage, one in-app admin alert per channel per month (`QuotaAlerts`), analytics (success % per channel and provider, failure trend), platform-wide per-school usage for the super admin only. Standby rows are never counted or charged. |
| H | Audit | `NotificationAuditEntry` for provider create / update / delete (secret names only, never values), rule save / reset, template status, consent changes. |
| I | History | Searchable, paged history (date, channel, status, event, recipient) + CSV export (formula-injection safe). |
| J | Daily limit | Event deliveries over the daily limit are deferred to the next day instead of rejected. |

## UI (Communication center)

New tabs: **Delivery log**, **Rules** and **Consent & audit** (administrators); **Usage** gained monthly quota / overage,
analytics and an all-schools table (platform admin). **Settings**: Amazon SES provider, monthly quota and alert %.
**Templates**: event, approval status, WhatsApp category, on/off, live preview with SMS part count.
New strings are English only; they fall back to English in ml / hi / ta / ar until translated.

## How to call it from another service

```
POST {engagement}/internal/notify
X-Service-Key: <ServiceAuth:Secret>
X-Tenant-Id: <tenant>
{ "tenantId": "<tenant>", "eventType": "fee.reminder",
  "recipients": [{ "kind": "Parent", "id": "<studentId>", "placeholders": { "FeeAmount": "₹ 500" } }],
  "placeholders": { "SchoolName": "Sunrise", "DueDate": "15 Dec" },
  "language": "en", "idempotencyKey": "fee-reminder:<invoiceId>:2026-12" }
```

Per channel the school needs: a provider configured, and an **Approved, active template** whose `EventType` equals the
event (and the right `Channels`). Without one the delivery is recorded as Skipped with the reason.

## Verified

* EngagementService unit tests: 341 pass (new: renderer, fallback planner, notify flow incl. fallback / idempotency /
  mandatory / language / daily limit / priority, rules, preferences, preview, monthly usage, history, analytics,
  quota alerts, SigV4, SES webhook, notify service-key check).
* SMS UI: typecheck:test clean, 1485 tests pass, production build OK.
* Live in docker: migration applied; rules, preview, monthly usage, history, audit, 403 for non-platform admin on
  platform usage, and `/internal/notify` (401 without key, 400 on tenant mismatch, 202 then idempotent 200).

## Not done - needs your decision or outside accounts

* **No existing module calls `/internal/notify` yet.** AcademicService / FinanceService fee reminders, attendance alerts
  etc. still need a small client each. Say which events to wire first.
* **AuthService OTP and lead e-mail still use their own senders.** OTP is synchronous and latency-sensitive; moving it
  needs a "send now" path (bypass the queue), which I did not add without agreement.
* **Real credentials / approvals**: SES, MSG91 DLT, WhatsApp template approval are configuration, not code. SES webhook
  needs the SNS topic subscription set up as described in Settings.
* **SES attachments**: not supported (SES v2 simple content has none). SMTP relay is unchanged.
* **WhatsApp inbound conversations, per-user (login) preferences screen**: consent is recorded by an administrator or by
  provider STOP replies; a self-service preference page for parents is not built.
* **Custom message broker**: the database outbox + worker is durable and drains 50 per 5 s (immediately again while a
  batch is full); a broker only becomes necessary at volumes beyond one worker.
* **SNS message signature verification** is replaced by the per-school secret token in the URL plus the AWS-only
  confirm-link rule (same model as the Brevo / MSG91 hooks).

## Wired callers (added 2026-11-09)

Both use a transactional outbox (`NotifyOutbox` table in each service) drained by a worker that calls `/internal/notify`
with the service key, exponential backoff (1, 2, 4... up to 30 min, 10 attempts), and treats a 409 (no rule / rule
switched off) or other 4xx as final. They need `Services__EngagementServiceUrl` and `ServiceAuth__Secret` (added to
FinanceService in `docker-compose.yml`; AcademicService already had them).

| Event | Where | When |
|---|---|---|
| `attendance.absent` | AcademicService `SaveAttendanceCommandHandler` | A student is newly saved as Absent on today's or yesterday's register. Once per student per day (key `attendance.absent:{student}:{date}`), so re-saving or flipping back and forth never repeats it. Back-filling older registers is quiet. Placeholders: AttendanceStatus, Date, ClassName (StudentName / ParentName come from the directory). Goes to the student's guardians. |
| `fee.reminder` | FinanceService `FeeReminderWorker` (scan every 4 h) | Unpaid invoices at a stage: 3 days before due, the due date, then 7 / 14 / 21 / 28 days overdue. Latest stage reached, each sent once (key `fee.reminder:{invoice}:{stage}`). Amount is what is still owed (receipts minus refunds). Invoices over 35 days overdue are skipped. Placeholders: FeeAmount, DueDate, Term. |

To go live a school needs, per event: a provider for each channel in the rule, and an Approved, active template with
`EventType` = `attendance.absent` / `fee.reminder` (matching channel and language). Without them every delivery is recorded
as Skipped with the reason and nothing is sent.

Verified in docker: marking a student absent produced an Engagement history row for WhatsApp (Skipped, not set up) with the
SMS fallback also recorded; the first fee scan queued 234 reminders from real invoices.

### Per-school switch (opt-in)

`fee.reminder` and `attendance.absent` are **off by default** (`NotificationRuleDefaults.ActiveByDefault = false`). Until a
school switches the rule on in Communication > Rules (or saves a rule via `PUT /api/messaging/rules/{event}`), Engagement
answers `/internal/notify` with 409 "switched off", and the calling service marks that outbox row final (no retry, no
messages, no delivery rows). So connecting the services never messages parents by surprise.

Consequences worth knowing:
* Reminders skipped while the rule was off are not sent later. When a school turns the rule on, each unpaid invoice gets
  the reminder for the stage it is *then* at (once), and later stages follow normally. Old stages are not back-filled.
* Resetting the rule to default switches it off again.
* Events a person asks for (OTP, announcements, emergency, circular...) stay on by default.
