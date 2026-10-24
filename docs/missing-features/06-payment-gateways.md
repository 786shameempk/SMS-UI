# 6. Online fee payment through several gateways

Razorpay, Cashfree, PayU and Stripe. Each school saves its own keys (encrypted), switches the gateways it wants on, and parents choose how to pay. Refunds can go back through the gateway that took the money.

## How a payment works

1. The parent opens **Fees → Pay online**, picks a gateway (if the school offers more than one) and gives the details that gateway insists on (Cashfree: mobile number; PayU: name, email, mobile).
2. FinanceService opens an order with that gateway (`POST /api/payments/orders`) and answers how to open checkout: Razorpay's popup, Cashfree's JS SDK, a redirect (Stripe) or a signed form post (PayU).
3. The parent pays on the gateway's own page. Card, UPI and bank details never reach School Sphere.
4. FinanceService **asks the gateway** what happened (`POST /api/payments/verify`, or the gateway's webhook, or reconciliation) and only then records the payment and receipt. Status and amount are never taken from the browser or from a webhook body. All paths share one routine (`OnlinePaymentRules.SettleAsync`): checks the amount and currency first, captures an authorized payment, is safe to run twice, and one gateway payment can never produce two receipts.

Redirect gateways send the parent back to `/parent-portal?tab=fees&payment=return&gateway=…&order=…`; the Fees tab confirms the order automatically and tidies the address.

## What changed

### FinanceService
| Piece | Where |
|---|---|
| `IPaymentGateway` and the shared records (`GatewayAccount`, order, payment, refund, webhook envelope) | `Application/Interfaces/IPaymentGateway.cs` |
| Adapters: Razorpay, Cashfree (API 2023-08-01), PayU hosted checkout, Stripe Checkout | `Infrastructure/Payments/*Gateway.cs` |
| Which keys apply to a school: its own saved row (enabled or not: a disabled row also switches the platform default off), else the platform's Razorpay account from configuration | `Application/Common/PaymentAccounts.cs` |
| Per-school config, encrypted with Data Protection; only a "••••1234" hint ever leaves the server | `Domain/Entities/PaymentGateways.cs`, `PaymentGatewayAdmin.cs` |
| Append-only ledger: orders, captured and failed payments, refunds, every verified webhook (a redelivered webhook is recognised by `(Provider, ProviderEventId)`) | `PaymentTransaction`, `PaymentLedger` |
| Webhooks: signature checked with the secret of the school that owns the order; then the gateway is asked again | `HandlePaymentWebhookCommandHandler`, `POST /api/payments/{provider}/webhook` |
| Refunds through the gateway: saved as *Initiated* first (a double click can't send two), sent with the refund id as the gateway's idempotency key, counted against the invoice only when the gateway says it succeeded (at once, by webhook, or by reconciliation) | `RefundGateway.cs`, `POST /api/refunds/{id}/send-to-gateway` |
| Reconciliation now covers every gateway and refunds still with a gateway | `POST /api/payments/reconciliation/online` |
| Migration `MultiplePaymentGateways` (existing online payments become `Live`, existing refunds `NotSent`) | `Infrastructure/Persistence/Migrations` |

The old routes (`/api/payments/razorpay/orders`, `/razorpay/verify`, `/razorpay/webhook` now `/{provider}/webhook`) and the `config` fields the mobile app reads still work, so the mobile app needs no change.

### SMS UI
* Parent portal: gateway picker and payer details (`OnlinePaymentDialog`), checkout for all four (`parent-portal/onlineCheckout.ts`), return handling in `FeesTab`.
* Fees → **Payment gateways** (school administrators): keys per gateway, Test/Live, on/off, "offer first", webhook address with copy button, **Test keys**, remove.
* Fees → **Gateway activity**: the ledger with filters, and **Check with gateways** (reconciliation).
* Fees → Refunds: **Refund to payer** (through the gateway) beside **Mark processed**; status of the gateway side shown.

## Configuration

| Setting | Purpose |
|---|---|
| `Payments__AppBaseUrl` | The web app's public address. Redirect checkouts (Cashfree, PayU, Stripe) return to its parent portal. |
| `Payments__ApiBaseUrl` | FinanceService as the internet sees it, e.g. `https://app.example.com/services/finance`. PayU posts back to it and webhook addresses are built from it. |
| `DataProtection__KeysPath` | A folder on a **persistent volume** (default `./keys`). The saved gateway secrets are encrypted with these keys; if they are lost the secrets cannot be read and must be entered again. Treat the folder like a secret. |
| `Razorpay__KeyId`, `Razorpay__KeySecret`, `Razorpay__WebhookSecret` | Optional platform-wide Razorpay account for schools that have not saved their own. |

## Setting a gateway up (per school)
1. In the gateway's dashboard create **test** keys and a webhook pointing at the address shown on the card (Fees → Payment gateways).
2. Enter the keys, choose **Test**, switch the gateway on, **Test keys**, then pay a small invoice with the gateway's test card/UPI.
3. When it works, enter the live keys, choose **Live** (live Razorpay and Stripe also need the webhook secret) and save.

## Honest limits
* **Not run against the gateways' sandboxes** (no accounts were available). The adapters follow each gateway's documented API and are tested with canned responses; the whole service was run against a real database to check migrations, wiring, encryption and the first outbound call (Stripe rejected a made-up key with a readable message). Before going live, make one test payment and one test refund per gateway you switch on.
* Details to confirm in the sandbox: **PayU** refund status lookup (`check_action_status` response shape is read loosely) and its dashboard webhook; **Cashfree** webhook signature (the code accepts the documented timestamp+body form and the dotted variant).
* Currency is INR only. Fees elsewhere would need amounts in other currencies end to end.
* Data Protection keys are stored unencrypted on disk (there is no certificate configured); protect the volume.
* PayU needs payer name, email and phone on every payment; they are passed to PayU and not stored by us.

## Verified
* FinanceService unit tests: 278 pass (adapters for all four gateways, handlers, settings, refunds, webhooks, controller contracts); the 22 database tests pass against SQL Server with the real migrations (`SMS_TEST_SQL`).
* SMS UI tests for the fees and parent-portal modules (gateway admin API, checkout for each gateway, dialog, gateways tab).
* Live run: service started on a throwaway database, `gateways`, `config`, save (secret stored as an encrypted blob, hints returned), validation error, webhook for an unknown order (200, ignored), PayU return (redirect), keys check (outbound call to Stripe).
