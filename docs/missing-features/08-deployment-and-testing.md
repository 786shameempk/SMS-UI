# 8. Configuration, deployment and testing for features 1-7

One place to see what to set, what to mount, and how to prove everything works. Each feature's own doc has the detail.

## What to set (placeholders only; real values go in the untracked `.env`)

| Variable | Service | Feature | Notes |
|---|---|---|---|
| `ATTENDANCE_SIGNING_KEY` | AcademicService | 1, 5 | Signs QR passes and card hashes. Empty = derived from the JWT key. Changing it invalidates printed passes |
| `FACE_RECOGNITION_PROVIDER`, `COMPREFACE_URL`, `COMPREFACE_API_KEY` | AcademicService | 1 | `None` by default |
| `MESSAGING_PUBLIC_BASE_URL` | EngagementService | 2 | Address providers call back on (delivery receipts) |
| `PLATFORM_EMAIL_PROVIDER`, `SMTP_*` | EngagementService | 2 | Optional platform-wide e-mail default for schools with no provider of their own |
| `PAYMENTS_APP_BASE_URL` | FinanceService | 6 | The web app's address; redirect checkouts return to its parent portal. Defaults to `https://$APP_DOMAIN` in the deploy files |
| `PAYMENTS_API_BASE_URL` | FinanceService | 6 | Finance as the internet sees it (`…/services/finance`); PayU posts back here. Defaults from `APP_DOMAIN` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | FinanceService | 6 | Optional platform default. Schools normally save their own keys in the app |
| `RETENTION_VISITOR_ID_PROOF_DAYS`, `RETENTION_VISITOR_SCAN_DAYS`, `RETENTION_CERTIFICATE_VERIFICATION_DAYS` | CampusService | 7 | Defaults 90 / 90 / 180; `0` keeps data |
| `RATE_LIMIT_PUBLIC_VERIFY_PER_MINUTE` | CampusService | 7 | Default 20 per client address |

Already present in `.env.docker.example`, `deploy/live/.env.example` and `deploy/azure/.env.example` (no real values in any of them).

## What to mount

| Volume | Service | Why |
|---|---|---|
| `finance-keys` → `/app/App_Data/keys` | FinanceService | **New.** Data Protection keys that decrypt every school's saved gateway keys. Lose it and each school must re-enter its keys. Back it up with the database |
| `messaging-keys` → `/app/App_Data/keys` | EngagementService | Same, for messaging provider secrets (feature 2) |

## Routing and proxies
* Caddy already sends `/services/*` to the gateway and the gateway routes `/services/finance` and `/services/campus`; no Caddy change is needed. The new public paths are `/services/campus/api/public/certificates/<token>` and the web app's `/verify/certificate/<token>` (hidden from search by `robots.txt`).
* **Gateway change (ApiGateway `Program.cs`):** the gateway now believes `X-Forwarded-For` from private networks (Caddy) and passes the client's address on, so CampusService rate-limits and audits the person rather than the proxy. Without this every visitor would share one rate-limit bucket. Add your proxy's network to `TrustedProxyNetworks` if it is not in a private range.
* Payment webhooks are public by design (`/services/finance/api/payments/<provider>/webhook`); they are verified by signature, then the gateway is asked again. Register this address in each gateway's dashboard (the app shows it with a copy button).

## Database
Each service applies its migrations on start. New in this work: AcademicService (attendance, proctoring, offline versions), FinanceService `MultiplePaymentGateways`, CampusService `CertificateVerificationAndVisitorPasses`, EngagementService (messaging), AuthService (language preference). Upgrades keep existing rows (the Finance and Campus migrations are tested against a database built at the previous migration).

## Test procedure

### Automated
```bash
# Web app
npm run typecheck:test
npm run test:coverage

# Each .NET service (AcademicService, FinanceService, CampusService, EngagementService, AuthService, ApiGateway)
dotnet test

# With a real database: tests skip themselves unless SMS_TEST_SQL is set (a SQL Server connection string without Database=)
SMS_TEST_SQL="Server=...;User Id=sa;Password=..." dotnet test
```
The database tests create their own throwaway databases and drop them.

### Manual, per feature
1. **Attendance methods (1):** follow "End-to-end test procedure" in `01-attendance.md`.
2. **Messaging (2):** follow "Real-provider acceptance test" in `02-messaging.md`.
3. **Proctoring (3):** run an online exam with proctoring on and check the flags on the result (`03-proctoring.md`).
4. **Language (4):** choose Arabic in the language picker: the page turns right-to-left, and a refresh keeps it (`04-i18n.md`).
5. **Offline attendance (5):** open Mark attendance, go offline in dev tools, mark and save (it queues), go online (it syncs); have a second person change the same register first to see the conflict screen.
6. **Payment gateways (6):** Fees → Payment gateways: save test keys, press *Test keys*; as a parent pay a term fee with the gateway's test card; refund it from Refunds.
7. **Certificates and passes (7):** see the manual steps in `07-qr-certificates-visitor-passes.md`.

## Rollback
Features are additive. To turn one off without removing data: attendance methods, gateways and messaging providers each have an off switch in their settings; clearing the `PAYMENTS_*` variables only disables redirect gateways. Migrations are not reversible in production; restore from backup.

## Known limits across the work
See the "Not done / limits" section of each feature doc, and `04-i18n.md` for the modules still shown in English.
