# School Sphere: missing features plan and progress

Started 2026-10-22. Work is uncommitted across the repos (the user commits everything together).
Each feature gets its own doc in this folder once built: what changed, endpoints, configuration, setup, tests.

Legend: `[ ]` not started, `[~]` in progress, `[x]` done and verified, `[!]` needs something outside the code (hardware, account, approval).

## What exists today (discovery, 2026-10-22)

| Area | Owner service | Working today | Simulated / missing |
|---|---|---|---|
| Attendance | AcademicService (`api/attendance`) | Manual student register (section + date, whole-register replace), staff daily status, reports | QR/RFID/biometric/face are a UI label only: the chosen mode is stamped on a manual save. No devices, credentials, scan events, corrections, audit, settings. Staff records have no capture mode or check-in/out. |
| Messaging | EngagementService (`api/BroadcastMessages`) | Templates, groups, compose, delivery summary, in-app notifications, Web/Expo push for app events | `BroadcastRecipients.SimulateDelivery()` picks success with `Random`. No contact lookup (phones/emails live in AcademicService), no providers, no queue, no scheduler, no webhooks. |
| Online exams | AcademicService (`api/online-exams`) | Server deadline + grace, worker auto-close, autosave, idempotent submit, attempt limits, negative marking, shuffles, manual evaluation | No proctoring events, consent, pre-check, monitoring dashboard, incident review/appeal, question pools. |
| i18n / RTL | SMS UI | Per-user `PreferredLanguage` (admin-only edit), tenant `Language` setting (saved, unused) | No i18n library, ~6,000 hard-coded strings, physical CSS classes, Inter font only. |
| Offline / PWA | SMS UI | Manifest + push-only service worker | No caching, no IndexedDB, no offline queue on web. Mobile teacher app queues whole registers without idempotency or conflict detection. |
| Payments | FinanceService (`api/payments`) | Razorpay order/verify/webhook, single settlement path `ConfirmAsync`, receipt idempotency, reconciliation endpoints | Razorpay-only types and routes, global config, no gateway refunds, no other gateways, no UI for reconciliation/config. |
| Certificates / visitors | CampusService | Certificate issue/print, visitor check-in/out, pre-approvals, watchlist | No verification token/QR, no revoke/reissue, racy numbering, hard delete; visitor passes have no QR or scan validation. No rate limiting in Campus. |

## Plan, in order

### 1. Attendance methods: AcademicService + SMS UI  `[x]` (see 01-attendance.md; mobile pass screen not done)
- Settings per branch: enabled methods, late-after time, QR pass lifetime, duplicate window, face thresholds, consent required, retention days, past-edit approval.
- Devices (RFID, biometric, face kiosk): registration, hashed API key shown once, heartbeat, status, error log.
- Credentials: RFID card / biometric user id mapped to student or staff (HMAC-hashed identifier, last-4 label).
- Scan events: one table for every QR/RFID/biometric/face event, idempotent per device event id, result Accepted/Duplicate/Rejected/PendingReview with a reason.
- Applying events: per-student upsert (not the register replace), staff check-in/check-out, late rule, duplicate window.
- QR: signed time-limited personal pass (HMAC, nonce, replay store), scan session opened by a teacher for a section/date or by an admin for staff. Web scanner with camera (`BarcodeDetector`, `jsQR` fallback) and keyboard-wedge scanner input.
- RFID/biometric ingestion: authenticated JSON device API plus a ZKTeco ADMS (iclock) push adapter for common biometric terminals.
- Face: `IFaceRecognitionProvider` with CompreFace (self-hosted) adapter and a Disabled provider; consent records, enrolment by authorised staff (image forwarded, never stored), threshold + manual review queue, withdrawal deletes the provider subject.
- Corrections: request → approve/reject workflow, audit entries for every change, exception/reconciliation report.
- Register save keeps device-sourced capture modes for unchanged rows.
- UI: settings + devices + credentials + face + review + corrections + exceptions tabs; scanner page; "My attendance pass" for students and staff; honest status ("No device configured").

### 2. Messaging delivery: EngagementService + AcademicService + SMS UI  `[x]` (see 02-messaging.md)
- Provider abstraction per channel: SMS (MSG91, Twilio), Email (SMTP, Brevo API, Amazon SES via SMTP), WhatsApp (Meta Cloud API). Per-school config with secrets encrypted (Data Protection), env fallback.
- Contact resolution from AcademicService via a service-key internal endpoint (guardian phone/email, staff phone/email).
- Durable outbox (`MessageDelivery` rows) + worker with lease, exponential backoff, max attempts, dead letter, idempotency, rate limit per school.
- Webhooks: Twilio status, MSG91 DLR, WhatsApp status + inbound opt-out, Brevo events; bounce → suppression list.
- Scheduler for scheduled broadcasts. Opt-in/opt-out records. Templates gain provider template ids (DLT, WhatsApp name, language).
- UI: provider settings with test send, message history per recipient with real statuses, delivery/usage report; remove "simulated" labels.

### 3. Online exam proctoring: AcademicService + SMS UI  `[x]` (see 03-proctoring.md)
- Exam settings: proctoring mode (off/basic/webcam), consent text, thresholds for warnings, fullscreen required.
- Consent record + pre-exam device/permission check.
- Proctoring events endpoint (tab hidden, fullscreen exit, camera lost, inactivity, copy/paste, network drop), rate-limited and tied to the attempt.
- Monitor dashboard for invigilators: live candidates, last seen, incidents timeline; review outcome (no issue / warning / misconduct), student appeal.
- Question pools: draw N questions per attempt from a tagged pool.
- Retention worker for incident evidence. Webcam snapshots only if enabled, with notice.

### 4. i18n + RTL: SMS UI (+ AuthService self-service preference)  `[x]` (see 04-i18n.md; all feature modules wired to t() and translated into ml/hi/ta/ar; known gaps listed there)
- i18next + react-i18next, resources per language (en, ml, hi, ar, ta), lazy loaded; language picker in user menu; school default from TenantSettings; `me/preferences` endpoint.
- `dir`/`lang` on `<html>`, logical Tailwind classes, RTL-aware icons, Noto fonts for Malayalam/Tamil/Devanagari/Arabic.
- Locale-aware `formatDate/formatCurrency/formatNumber`.
- Extract strings module by module (shell, nav, shared components first, then features).

### 5. Web offline attendance (PWA): SMS UI + AcademicService  `[x]` (see 05-offline-attendance.md)
- Service worker app-shell caching (static assets only, never API responses with auth).
- IndexedDB store per user for rosters + queued registers; operation ids + idempotency; conflict detection via `baseVersion`; pending/synced/rejected/conflict states; cleared on logout.
- Server: idempotency key + optimistic version on register save (mobile keeps working without them).

### 6. Multiple payment gateways: FinanceService + SMS UI  `[x]` (see 06-payment-gateways.md; not run against gateway sandboxes)
- `IPaymentGateway` provider interface; Razorpay moved behind it (existing routes kept); Cashfree, PayU, Stripe adapters.
- Per-school gateway config (encrypted), test/live mode; generic order/verify/webhook routes; refunds through the gateway; transaction ledger + reconciliation UI.

### 7. QR certificates and visitor passes: CampusService + SMS UI  `[x]` (see 07-qr-certificates-visitor-passes.md)
- Certificates: random verification token, status (Valid/Revoked/Superseded), revoke/reissue, unique number, QR on print/PDF, public verify page + rate limit + audit.
- Visitor passes: pass token per approved visit/check-in, QR pass print, scan endpoint with clear results, retention worker.

### 8. Docs, config, tests, deployment  `[x]` (see 08-deployment-and-testing.md)
- `.env.example` / compose / deploy templates updated with placeholder keys only.
- Per-feature setup + test procedure docs. Final report.
