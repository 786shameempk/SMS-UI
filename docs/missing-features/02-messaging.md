# 2. SMS, email and WhatsApp: real delivery

Status: built and verified (2026-10-23). Uncommitted in **EngagementService**, **AcademicService** (contact lookup) and **SMS UI**.

## What changed

Before: `BroadcastRecipients.SimulateDelivery()` picked "delivered" or "failed" with `Random`, and the UI said "Simulated".
Now every recipient × channel × address is a `DeliveryLogEntry` that moves only on real events.

```
Compose ──► BroadcastDispatcher ──► AcademicService /internal/contacts (service key)
              │  per recipient, channel, address:
              │   Queued (email/SMS/WhatsApp) │ Sent (push hand-off) │ Delivered (in-app inbox) │ Skipped + reason
              ▼
        DeliveryLogEntries (outbox)  ◄── MessagingWorker every 5 s: lease → provider → Sent / retry with backoff / Failed
              ▲
Provider webhooks (signed or tokened) ──► Delivered / Read / Failed / Bounced, opt-outs, bounces → suppression list
```

| Channel | Providers | Delivery confirmation |
|---|---|---|
| Email | **SMTP** (any relay: own server, Brevo SMTP, Amazon SES SMTP, Google Workspace), **Brevo API** | Brevo webhooks (delivered, opened, bounces, spam, unsubscribe). SMTP only confirms the relay accepted it. |
| SMS | **MSG91** (Flow API, DLT template per message template), **Twilio** | MSG91 delivery-report webhook (token in URL); Twilio status callback (HMAC-SHA1 signed). |
| WhatsApp | **Meta WhatsApp Cloud API** (official; no WhatsApp Web automation) | Status webhooks (X-Hub-Signature-256), inbound STOP/START replies. |
| Push | Existing Web Push + Expo push, now to the recipients' linked logins | Hand-off only (push services do not report delivery). |
| In-app | Notification inbox | Stored = delivered. |

Rules enforced:
- **Never assumed**: no provider for a channel → each recipient is `Skipped` "SMS is not set up for this school"; no phone/email on record → Skipped with that reason.
- **WhatsApp**: an approved template is required (template's `WhatsAppTemplateName`, or the provider default); opt-in required per number unless the school attests opt-in was collected at admission; STOP replies are suppressed and always win.
- **Opt-outs/bounces**: suppression list (per school, per channel) checked at dispatch and again right before sending.
- **Idempotency**: compose accepts an `idempotencyKey` (the UI sends one per message being written); each delivery has a unique key (message|recipient|channel|address), so two guardians sharing a phone get one SMS; webhooks are idempotent and never move a status backwards.
- **Retries**: transient failures (timeouts, 408/429/5xx, SMTP busy) retry after 30 s, 2 min, 8 min, 32 min; after 5 attempts → `Failed` "Gave up after 5 attempts" (dead letter). Permanent provider errors fail at once. Admins can "Retry failed" or "Cancel waiting" per message.
- **Rate limits**: per school per channel per minute (worker defers, not counted as an attempt) and per day (compose is refused up front with the numbers). Max 10,000 recipients per message.
- **Scheduler**: scheduled broadcasts are sent by the worker when due (previously only by "Send now").
- **Secrets**: per-school provider secrets encrypted with ASP.NET Data Protection (keys on the `messaging-keys` volume), write-only in the API; provider errors are stored with phone numbers, emails and token-like strings removed.

## API (EngagementService, via `/services/engagement/…`)

| Method | Path | Who |
|---|---|---|
| GET | `api/messaging/channels` | communicators: which channels can send now |
| GET, PUT `{channel}`, DELETE `{channel}` | `api/messaging/providers` | school admin |
| POST | `api/messaging/providers/{channel}/test` `{to}` | school admin: real test send |
| GET | `api/messaging/messages/{id}/counts`, `…/deliveries?status&channel` | communicators |
| POST | `api/messaging/messages/{id}/retry-failed`, `…/cancel-queued` | communicators |
| GET | `api/messaging/usage?from&to` | communicators |
| GET/POST, DELETE `{id}` | `api/messaging/suppressions` | school admin |
| GET/POST | `api/messaging/optins` `{phones[], source}` | school admin |
| POST | `api/BroadcastMessages` (+ `templateId`, `idempotencyKey`) | unchanged route |
| GET | `api/BroadcastMessages/{id}/delivery-summary` (+ `queued, sent, skipped`) | unchanged route |
| POST | `api/messaging/webhooks/twilio/{configId}` · `msg91/{configId}?token=` · `brevo/{configId}?token=` · GET+POST `whatsapp/{configId}` | providers (anonymous, verified) |

AcademicService: `POST internal/contacts` (service key) → `{students, staff, guardians}` with names, phones, emails, login ids, pinned to the tenant in the request.

## Database

EngagementService migration `20261022190039_RealMessagingDelivery` (script: `sql/02-engagement-messaging-delivery.sql`): new `MessagingProviderConfigs`, `MessagingSuppressions`, `MessagingOptIns`; `DeliveryLogEntries` + recipient name, address, idempotency key (unique), provider + message id, attempts, next attempt, lease, last error, timestamps, cost, rowversion; `MessageTemplates` + language, SMS template id, WhatsApp template name/language; `BroadcastMessages` + template id, idempotency key (unique per tenant), dispatch lease. Existing delivery rows keep their old Delivered/Failed values.

## Configuration

| Key | Purpose |
|---|---|
| `Services__AcademicServiceUrl` + `ServiceAuth__Secret` | Contact lookup. Without them, only in-app messages can be sent (others get a clear 503). |
| `Messaging__PublicBaseUrl` | Public URL providers call back on (`https://APP_DOMAIN`). Without it Twilio callbacks are not requested and webhook URLs are not shown. |
| `DataProtection__KeysPath` | Where encryption keys live (`messaging-keys` volume). Back it up with the database. |
| `Messaging__Defaults__Email__*` | Optional platform-wide SMTP default (`PLATFORM_EMAIL_PROVIDER=Smtp` reuses the `SMTP_*` relay settings). |
| `RateLimiting__MessagingWebhookPerMinute` | Webhook cap per configuration (default 1200). |

Added to the three compose files and `.env` examples. Per-school provider credentials are entered in the UI, not in environment files.

## Provider setup

- **SMTP / SES / Brevo SMTP**: Communication → Settings → Email → SMTP server: host, port 587, TLS true, username/password, from address and school name. Send test.
- **Brevo API**: create an API key (Brevo → SMTP & API), verify the sender, paste. Add the shown webhook URL in Brevo → Transactional → Webhooks.
- **MSG91**: auth key, DLT-registered sender id. For each message template, register a DLT template whose variable takes the message text, create a Flow with variable `body` (or set "Flow variable"), and put the Flow id in the template's "SMS DLT template / MSG91 flow id" (or set a default flow). Add the webhook URL under MSG91 delivery reports.
- **Twilio**: account SID, auth token, a from number or messaging service SID. Status callbacks are requested per message (needs `Messaging__PublicBaseUrl`). For India, Twilio also requires DLT registration of sender and templates.
- **WhatsApp Cloud API**: Meta Business account, verified WhatsApp number, a system-user permanent token with `whatsapp_business_messaging`; phone number id; app secret; any verify token. Create and get approved a utility template with one body variable `{{1}}` (e.g. `school_announcement`: "{{1}}"). Webhook: callback URL from Settings + the verify token, subscribe to `messages`. Record opt-ins or attest admission opt-in.

## Tests

- EngagementService: `tests/…/Messaging/MessagingTests.cs` (address normalisation/masking/sanitising, HTML escaping, dispatch queue/skip reasons, guardian fan-out and de-duplication, WhatsApp opt-in/template/suppression, push hand-off, daily limit, contacts unavailable, idempotent compose, processor send/backoff/dead-letter/permanent failure/per-minute deferral/late opt-out/removed config, scheduler, Twilio signature + no status regression, MSG91 token + failure mapping, Brevo bounce suppression, WhatsApp verify/signature/status/STOP, admin secrets encrypted and write-only, enable validation, real test result, retry/cancel, opt-ins vs STOP, usage). Full suite: 278 passed.
- AcademicService: full suite 815 passed after adding the contact endpoint.
- Live: migration applied to a throwaway SQL Server database; end-to-end run with a local SMTP server and a local Twilio stand-in: test email received, broadcast email received with HTML part, SMS accepted then marked Delivered by a signed callback, invalid number failed with Twilio's error 21211, WhatsApp skipped (not set up), in-app delivered, usage and retry correct, unauthenticated webhook refused.
- SMS UI: `messaging/api.test.ts`, `components/Messaging.test.tsx`; browser check of History → message details (real per-recipient statuses) and Settings (stored secret not shown, last test result).

## Real-provider acceptance test (needs your accounts)

1. Settings → Email: connect SMTP or Brevo → Send test to your address → it arrives; "Last test: Accepted".
2. Settings → SMS: connect MSG91 or Twilio (with DLT for India) → Send test to your phone → it arrives.
3. Create a template with the SMS flow id (and WhatsApp template name) → Compose to a group with Email + SMS (+ WhatsApp) using that template.
4. History → View details: rows go Queued → Sent within seconds, then Delivered as receipts arrive (Twilio/MSG91/Brevo/WhatsApp). A wrong number shows Failed with the provider's reason; Retry failed re-queues it.
5. Reply STOP on WhatsApp → the number appears under Do not contact and is skipped next time.

## Not done / limits

- Email attachments are not supported (the composer has no attachment field).
- Amazon SES bounces arrive through SNS, which is not wired; use SES's account-level suppression list or Brevo.
- Inbound SMS (STOP to an SMS sender) is only handled through Twilio's error 21610; MSG91 handles DND/NDNC itself.
- Students have no phone/email in AcademicService, so student-addressed SMS/email is skipped ("No mobile number on record"); parents and staff work.
- Delivery uses one worker per EngagementService instance with leases and row versions; Data Protection keys must be shared if you ever run more than one instance.
