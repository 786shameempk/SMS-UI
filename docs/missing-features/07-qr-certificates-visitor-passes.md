# 7. QR-verified certificates and visitor passes

Anyone holding a printed certificate can scan its QR code and see whether it is genuine and still valid. Visitors get a QR badge (after check-in) or a QR visit pass (before they arrive), and the gate scans them.

## Certificates

### How it works
1. Every certificate gets a random 160-bit **verification token** when issued (never derived from its number, so numbers cannot be used to guess tokens). It is printed as a QR code and as text, with the address `…/verify/certificate/<token>`.
2. The address opens a **public page** (no sign-in). It shows only: valid / revoked / replaced, the certificate kind and number, who it was issued to, which school, and the dates. Never the wording of the certificate.
3. **Revoke** (a certificate issued by mistake) makes the page say "Revoked: not valid". **Reissue** issues a corrected certificate with its own number and QR code, marks the old one *Replaced* and links to the new one. A certificate never becomes valid again and its number is never reused. A revoked or replaced certificate is stamped on screen and in print, so a reprint cannot pass for a valid one.
4. Two people issuing at once can no longer get the same number: numbers are unique per school (database index), with retry and jitter. A number given by the caller (a transfer certificate's TC number) that is taken is refused, not changed.

### Protection of the public endpoint
* `GET /api/public/certificates/{token}` is the only anonymous controller in CampusService (a contract test pins this).
* Rate limited per client address (default 20 a minute; answers 429 with `Retry-After`). Behind Caddy the real address is read from `X-Forwarded-For`, but only from trusted proxy networks, so a caller cannot pick its own bucket.
* Every look-up is audited, including unknown tokens: outcome, time and a **salted hash** of the address (the salt changes on every restart; the address itself is never stored). Look-up counts show on the certificate.
* Malformed or unknown tokens give the same plain 404.
* Responses carry `Cache-Control: no-store`, so a revoke shows at once.

### Staff screens (Certificates)
* Issued list: **Status** column, **Revoke** and **Reissue** (both ask for a reason).
* Certificate view: QR code, the address in words, status badge and stamp.
* Public page: `/verify/certificate/:token` (listed in the route registry as public).

### Upgrading existing schools
Migration `CertificateVerificationAndVisitorPasses` gives every existing certificate a random token and status *Valid*, renames later duplicates of a number to `…-D2`, `…-D3` (keeping the first as it is) so the unique index can be created, and gives visits still waiting for their visitor a pass. Existing printed certificates have no QR; reprint them from the list to get one.

## Visitor passes

### How it works
* Check-in creates a **badge token** (valid 24 hours from check-in). Scheduling a visit creates a **pass token** (valid until a day after the scheduled time). After either, a dialog shows the QR with name, badge number and code in words, with a Print button.
* The QR value is `SSV:<token>`; the prefix keeps visitor passes distinct from attendance passes (`SSAP1.…`).
* **Visitors → Visitor log → Scan pass**: camera (QR detector built into the browser, else jsQR), or type / scan the code with a handheld reader. `POST /api/visitorentries/scan` says what it is and records the scan; it **checks nobody in or out**. The answer is one of: inside (offer *Check out*), already left, expired (check by hand), arrival expected (offer *Check in*), pre-approval closed, not today, unknown. A result this version of the app does not know is shown as unknown, never as a green light.
* Scanning needs the **Visitors → Check in** action (front desk and gate staff have it). Check in and check out keep their own permissions.
* A pass from another school or campus is simply "unknown".

### Retention
A background worker (CampusService) removes personal data once it is no longer needed, in batches of 500:

| Setting | Default | What goes |
|---|---|---|
| `Retention__VisitorIdProofDays` | 90 | ID proof type and number of visits checked out longer ago than this (the visit itself stays in the log) |
| `Retention__VisitorScanDays` | 90 | Gate scan records |
| `Retention__CertificateVerificationDays` | 180 | Public look-up audit records |

`0` switches a rule off.

## Configuration

| Setting | Default | Purpose |
|---|---|---|
| `RateLimiting__Enabled` | `true` | Leave on |
| `RateLimiting__PublicVerifyPerMinute` | `20` | Public verification look-ups per client address per minute |
| `RateLimiting__TrustedProxyNetworks__0…` | private ranges | Networks whose `X-Forwarded-For` is believed. Add your proxy's network if it is not in a private range |

## Where the code is
* CampusService: `Entities/IssuedCertificate.cs`, `Entities/FrontOfficePasses.cs`; `Commands/IssueCertificate`, `RevokeCertificate`, `ReissueCertificate`, `ScanVisitorPass`; `Queries/VerifyCertificate`; `API/Controllers/PublicCertificatesController.cs`, `API/Extensions/RateLimitingExtensions.cs`; `Infrastructure/Retention/RetentionWorker.cs`.
* SMS UI: `features/certificates` (`verifyUrl.ts`, `CertificateView`, `IssuedCertificatesTab`, `pages/VerifyCertificatePage`), `features/visitors` (`passCode.ts`, `PassQrDialog`, `ScanPassDialog`).

## Testing
* CampusService: `dotnet test` (`CertificatesAndPassesTests`, contract tests). With `SMS_TEST_SQL` set to a SQL Server connection string (no `Database=`), `SqlServerCampusTests` also run against a real database: ten parallel issues, taken numbers, unique tokens, revoke versus reissue race, and the upgrade path from an older database.
* SMS UI: `npx vitest run src/features/certificates src/features/visitors`.
* By hand: issue a certificate, open its QR address in a private window (no sign-in), revoke it and reload (page changes at once), reissue another and follow the link; check a visitor in, print the badge, scan the code, press Check out.

## Not covered
* Printed certificates cannot prove the paper is untouched, only that a certificate with that number and name exists and is valid: the page asks the reader to compare name and number.
* Scanning is not a gate-lock: it informs staff; it does not open doors.
* Certificates issued before this release have no QR until reprinted.
