# 14 — Tenant Isolation and Financial Integrity: audit and remediation

Date: 2026-10-10. Scope: AcademicService, FinanceService, CampusService, EngagementService, MeetingService (central tenant filter), FinanceService (financial workflows), AiService (retrieval and caches, reviewed), AuthService (platform operations, reviewed), SMS UI (payment call, journal screen).
All fixes are **uncommitted** on the current feature branches. Nothing was deployed.

Legend — Confirmed: reproduced or read directly. Probable: strongly indicated by code, not reproduced. Needs verification: not established.

## 1. Findings, ranked

| ID | Severity | Confidence | Finding | Status |
|---|---|---|---|---|
| TF-001 | High | **Confirmed (reproduced)** | Two cashiers saving payments at the same moment: all but one get a server error. Receipt numbers came from `COUNT(*)+1`. | Fixed, tested |
| TF-002 | High | Confirmed by code; lost update not reproduced (the unique index failed first) | `FeeInvoice` had no concurrency token and `PaidAmount` was incremented from a value read earlier, so two writers could overwrite each other and the total could drift from the receipts. | Fixed, tested |
| TF-003 | High | **Confirmed (reproduced)** | A refund for 5000 was accepted on a 1000 invoice. Five people processing one refund at once all got "success". | Fixed, tested |
| TF-004 | High | Confirmed by code and by an existing test that documented it | A counter payment above the amount due was accepted; the receipt kept the full amount while the invoice was capped, so receipts exceeded what the invoice was worth. | Fixed, tested |
| TI-001 | High (design) | Confirmed | Tenant isolation was hand-written in every handler. No exploitable leak was found in the paths read, but a single forgotten `TenantId ==` would leak. A heuristic scan flagged 84 id lookups with no tenant term in the statement; most are child lookups behind a tenant-checked parent (see §3). | Fixed (central filter) |
| TF-005 | Medium | Confirmed by code | A retried counter payment (double click, timeout) took the money twice. | Fixed, tested |
| TF-006 | Medium | Probable | Two online orders for one invoice, both paid, produced two full receipts and no refund for the excess. | Fixed, tested |
| TF-007 | Medium | Confirmed by code | A posted journal entry could be deleted ("matches the mock"), erasing the ledger trail. A posted entry was not re-checked for balance. | Fixed, tested |
| TF-008 | Medium | Confirmed by code | Invoice generation and discounts stored caller-supplied student ids that were never checked to belong to the school (soft reference into another database). | Fixed, tested live |
| TF-009 | Low | Confirmed | No money CHECK constraints, no unique `ProviderPaymentId`, no reconciliation. | Fixed |
| TI-002 | Low | Confirmed | `GET homework/assigned/{studentId}` loaded the student without a tenant term (results were still scoped; probe returned 0 rows). | Covered by the central filter |
| TI-003 | Info | Confirmed by test | Tenant switching: a header cannot move a school user, an admin, a parent or a student into another school; only a platform administrator picks a school. 10 tests per service, no change needed. | Verified |
| TI-004 | Info | Confirmed by code and existing tests | AI retrieval is tenant-filtered inside the vector query; caches are keyed by tenant (or hold no school data). | Verified, no change |
| TI-005 | Info | Confirmed | Razorpay verification is sound: constant-time HMAC for the checkout signature and the webhook, webhook refused when no secret is set, amount, currency and order are checked against our own record before capture, `OnlinePayment` has a RowVersion, webhook replays are no-ops. | Verified, no change |

## 2. Evidence for the reproduced defects (committed code, SQL Server, 6 and 5 parallel callers)

Run on a throwaway database against the committed FinanceService (worktree at commit `053240b`), output kept in `scratchpad/fin-old-repro.txt`:

```
PAYMENTS: outcomes=[DbUpdateException x5, ok] receipts=1 receiptsTotal=400 invoiceNet=1000 invoicePaidAmount=400
REFUND:   outcomes=[ok,ok,ok,ok,ok] invoicePaidAmount=700   (one 300 refund processed "successfully" five times)
REFUND_OVER: a 5000 refund was accepted on a 1000 invoice -> Pending
```

Root causes: receipt number computed by counting rows (unique-index collision); invoice total stored and incremented with no concurrency token; refund status check done after reading, not atomically; no upper bound on refund or payment amounts.

## 3. What changed

### Financial integrity (FinanceService)
- **Totals come from the ledger.** `InvoiceLedger` reads receipts and refunds from the database; `PaymentRecorder.ApplyTotals` derives `PaidAmount` and `Status` from them. `FeeInvoice` and `Refund` now have a SQL Server `rowversion`; every payment, refund request and refund processing touches the invoice so two writers conflict instead of overwriting.
- **Retry that cannot duplicate.** `FinanceRetry` re-runs an operation that lost a race (concurrency exception, duplicate-key, deadlock victim) from fresh rows, up to 4 attempts, then returns a clear 409.
- **Receipt numbers** come from a per-school `ReceiptSequences` row (bumped in the same save), seeded from the existing receipt count so numbering continues.
- **Limits:** a counter payment cannot exceed what is due; a refund cannot exceed money held minus open refunds; amounts must be positive with at most two decimals.
- **Idempotency:** `Idempotency-Key` header (or body field) on counter payments; unique per school; the same key with a different amount, invoice or mode is refused. The web UI now sends one key per unfinished payment.
- **Online payments:** confirmation records inside the retry from fresh rows; a gateway payment id can only produce one receipt (unique index + lookup); two paid orders for one invoice keep both receipts and open a pending refund for the excess.
- **Journal:** posted entries cannot be deleted; posting re-verifies debits = credits. The accounting screen no longer offers Delete on posted entries and its help article was corrected.
- **Student references** in invoice generation and discounts are checked against AcademicService as the caller (rejected with 400 if any id is not in the school).
- **Reconciliation:** `GET api/payments/reconciliation` (finance staff) reports paid-amount and status mismatches, unrefunded excess, refunds above receipts, online payments without receipts, receipts without online payments, and orders unconfirmed after 30 minutes. `POST api/payments/reconciliation/online` asks Razorpay about those orders (max 25 per run) and settles captured ones through the same safe path as the webhook.
- **Migration `FinancialIntegrity`:** adds two rowversion columns, `Receipts.IdempotencyKey`, `ReceiptSequences`, two filtered unique indexes (`ProviderPaymentId`, `TenantId+IdempotencyKey`) and three `WITH NOCHECK` CHECK constraints (money non-negative, paid ≤ net, receipt and refund amounts > 0). It applied cleanly to the dev database (900 existing invoices).

### Tenant isolation (all five services)
- A `TenantIsolation` component on each database context adds a query filter to **every entity with a string `TenantId`** (so new entities are protected automatically) and checks every save (async **and** sync).
  - School user: sees and writes only their own school. Token with no school: sees nothing. Anonymous or background code: sees nothing.
  - Platform administrator with no school chosen: the platform view. With `X-Tenant-Id`: that school only.
  - Writes: saving a row for another school, moving a row to another school, or deleting another school's row throws `ForbiddenAccessException`.
- **Explicit, named exceptions only.** `TenantScope.System("reason")` lifts the filter for code with no school user; every use is named and logged (once per reason per ten minutes). Used by: the Razorpay webhook; signed people-file and study-material links; signed meeting-file links and the LiveKit webhook; the GPS device report; the Engagement integration-event endpoint; the online-exam, blob-migration, push and meeting job workers; Meeting's anonymous health probe.
- **Cross-school by design** (listed in each `TenantIsolation.cs` with the reason): Academic `StudyMaterial` (platform-wide materials); Engagement `TalentShowcase`, `TalentSchoolSettings`, `TalentReport` (the cross-school Talent Showcase). Handlers for these keep their own checks.
- Meeting combines the tenant filter with its existing soft-delete filter; its three `IgnoreQueryFilters()` sites now state the tenant explicitly.

## 4. Tests and actual results

| Suite | Result |
|---|---|
| FinanceService unit + SQL Server integration | **222 passed** (22 need `SMS_TEST_SQL`; ran against the dev SQL Server) |
| CampusService | 502 passed, 2 skipped (pre-existing) |
| AcademicService | 609 passed |
| EngagementService | 235 passed |
| MeetingService | 147 passed |
| AuthService / AiService / ApiGateway | 688 / 235 / 7 passed |
| SMS UI (vitest, typecheck:test, build) | 897 of 898 on the full run; the one failure (`DashboardPage … focus the dashboard on one child`) passes alone (23/23) and is a timing flake I did not touch; typecheck and build clean |

What the new tests prove (SQL Server, real concurrency, isolated tenants in a throwaway database built by the real migrations):
- 6 parallel 400 payments on a 1000 invoice → exactly 2 succeed, receipts = paid = 800, never above the invoice.
- Same idempotency key sent 6 times at once → one receipt, every caller gets the same receipt number; key reused for a different payment → refused.
- Receipt numbers unique under parallel saves; overpayment refused by the handler **and** by the database; a second receipt for one gateway payment id rejected by the database.
- One refund processed by 5 callers → processed once, invoice reduced once; 5 racing refund requests cannot claim more than was received.
- Webhook + app confirming one online payment 6 times → one receipt; two orders for one invoice → settled once plus a pending refund, reconciliation clean; wrong amount → never recorded.
- Reconciliation clean for honest books and flags a tampered invoice; teachers cannot read it.
- School A cannot read, update, delete or plant rows in school B's data even when a query never names a school; a row cannot be moved by editing its tenant; tokenless/anonymous callers see nothing; a named system scope lifts the filter only while open; platform administrator views behave as specified; a signed webhook can settle its order with no school user and a bad signature cannot.
- Per service (Finance, Campus, Academic, Engagement, Meeting): 9 isolation tests, including a structural test that fails if any tenant-owned entity is left unfiltered; 10 tenant-switching tests.
- **The tests have teeth:** with retries switched off, 5 of the concurrency tests fail. The sync-save bypass in my own first version of the write guard was found by these tests and fixed before it shipped.

Live checks against the running dev stack (rebuilt images, JWT RS256 on):
- Isolation through the real APIs with a second school created by the platform administrator (invoice and receipt in school B): school A's admin gets 404 on fetch, payment and refund against B's invoice, sees none of B's rows in invoices, receipts, fee structures or reconciliation, and cannot switch with `X-Tenant-Id`; the platform administrator can see and act inside B and has a platform view — **28/28 passed**.
- 8 parallel 300 payments on a 1000 invoice over HTTP → 3 succeed, paid 900, receipts sum 900, receipt numbers distinct; idempotent retry ×5 once; overpayment and over-refund 409; one refund processed by 4 callers once — included in the 28/28.
- Regression: Extra-Curricular API 31/31 and 43/43; family isolation probes unchanged (parent and student get 404 or empty for other students); posted-journal delete 409, draft delete 204; signed people-file link works with no login and a forged signature is refused; study materials, talents, meetings load. (`GET notifications` as a teacher is 403 by design; the check was wrong, not the service.)

## 5. Not verified, unresolved, and deployment requirements

**Not verified / not done**
- AuthService has no central filter (its users, roles and tenants follow different rules, and sign-in is anonymous); its platform operations were confirmed to require SuperAdmin, but its tenant-owned queries rely on handler-level checks. Recommend a dedicated pass.
- A platform administrator's no-school "platform view" is allowed and not separately audit-logged beyond request logs. Recommend an audit entry for platform-view writes.
- Razorpay: refunds are recorded in our books only; no refund call is made to the gateway. The signature/amount logic was read, not exercised against the real Razorpay API.
- Fee receipts do not post to the accounting journal automatically, so the journal and the fee ledger are separate books (no cross-check).
- File and blob storage tenant paths, Redis keys in AuthService, mobile apps and the SignalR chat hub were not audited in this pass.
- Distributed load: concurrency was exercised with 5–8 parallel callers on one instance, not at production volume.
- The filter applies to EF queries. Raw SQL and `ExecuteUpdate` bypass query filters: the only `ExecuteUpdate` found (study-material view counter) is keyed by an id taken after a signed-link check.

**Deployment requirements**
1. Apply the Finance migration `FinancialIntegrity` (it needs no downtime; constraints are `NOCHECK` for existing rows). Before or just after, run the reconciliation and fix anything it reports; check there are no duplicate non-null `Receipts.ProviderPaymentId` (the unique index would fail).
2. Deploy the five services together with the web UI (the UI now sends `Idempotency-Key`; the API works without it, but retries are only safe with it).
3. Services that read a school's data from background code must keep their named scopes; any **new** worker, webhook or anonymous endpoint must open `TenantScope.System("…")` or it will see nothing (by design).
4. A service whose JWT has no `tenant_id` and is not a platform administrator now sees no rows; confirm every integration that calls these APIs uses a school token or a named scope.
5. `SMS_TEST_SQL` (a SQL Server connection string without `Database=`) enables the database tests in CI; the tests create and drop their own databases.
6. Finance dev appsettings carries a placeholder JWT secret; the service now refuses to start with it (see the JWT roll-out document).
