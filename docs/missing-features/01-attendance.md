# 1. Attendance capture: QR, RFID, biometric, face

Status: built and verified (2026-10-22). Uncommitted in **AcademicService** and **SMS UI**.

## What changed

Before: manual registers worked; QR/RFID/biometric/face were a label in the UI ("Simulated…") that was stamped onto a manual save.
Now every method takes attendance only from real, validated events, and says plainly when it cannot.

| Method | How it works | Needs |
|---|---|---|
| Manual | Unchanged register screen. A register can no longer claim a device mode; rows marked by a scan keep their source when the status is unchanged. | — |
| QR pass | Each student/staff member opens **My attendance pass** (user menu, `/account/attendance-pass`): an HMAC-signed pass (`SSAP1.…`) valid for 60 s (configurable), single use. A teacher opens a **scanning session** for a section (admins: for staff) and scans with the device camera (BarcodeDetector or jsQR) or a USB/Bluetooth handheld scanner. The server checks signature, expiry, school, single use (nonce), session open, and that the person is in that section. | Switch on in Setup |
| RFID | Readers or a local gateway POST card taps to the device API with the device's key. Cards are linked to people under Setup → Cards & ids (stored as a keyed hash plus `••••1F2B`). | A registered reader that has called in |
| Biometric | Same device API for vendor middleware/gateways, **or** native ZKTeco ADMS push (`/iclock/cdata`) for ZKTeco/eSSL terminals, matched by registered serial number. Terminal user ids (PINs) are linked like cards. | A registered terminal |
| Face | Pluggable `IFaceRecognitionProvider`; ships with **CompreFace** (open source, self-hosted, so face data stays on the school's server) and a Disabled provider. Needs a consent record per person; photos are forwarded to the provider, never stored by School Sphere. Match ≥ threshold marks attendance, between review and match thresholds waits for an admin, below → rejected with "use manual attendance". Withdrawing consent deletes the subject at the provider. Used from a teacher's camera inside a session, or by a registered face kiosk. | `FaceRecognition:Provider=CompreFace` + consent |

Also:
- **Settings per branch**: methods on/off, time zone, late cut-offs (students, staff), duplicate window, QR pass lifetime, face thresholds, scan-event retention, "lock past days".
- **Status** (`methods/status`): never "ready" unless a device has called in within 10 minutes / the face service answers.
- **Scan events**: every event is stored with its result (Accepted, Duplicate, Rejected, PendingReview) and reason. Device resends are idempotent (unique device event id), QR passes are single use (unique nonce).
- **Staff**: check-in / check-out times (first scan in, later scans out, or by device/session direction).
- **Corrections**: request → admin approve/reject (requester cannot approve their own unless admin), applied with audit entry.
- **Audit trail**: every change (register saves, scans, corrections, consent, enrolment).
- **Exceptions report**: refused scans, unknown cards, pending reviews, scanned-but-absent, present-without-scan, staff not checked out, offline devices.
- **Parent portal**: guardians give or withdraw face-recognition consent for their own child (Attendance tab).
- **Retention worker**: closes expired sessions; deletes scan events past each branch's retention (never pending reviews).

## API (AcademicService, via gateway `/services/academic/…`)

Signed-in (JWT):

| Method | Path | Policy |
|---|---|---|
| GET/PUT | `api/attendance/methods/settings` | read: ManageAttendance, write: ManageAttendanceSetup (module.administration) |
| GET | `api/attendance/methods/status` | ManageAttendance |
| GET/POST, PUT/DELETE `{id}`, POST `{id}/rotate-key` | `api/attendance/devices` | Setup |
| GET/POST, DELETE `{id}` | `api/attendance/credentials` | Setup |
| GET | `api/attendance/qr/my-pass` | any signed-in user linked to a student/staff record |
| GET/POST, GET `{id}`, POST `{id}/close`, POST `{id}/scan` `{token}`, POST `{id}/face` (multipart `image`) | `api/attendance/qr/sessions` | ManageAttendance (staff sessions: admins) |
| GET/POST, POST `{id}/withdraw` | `api/attendance/face/consents` | Setup |
| POST (multipart `personType, personId, image`), DELETE `{type}/{id}` | `api/attendance/face/enrollments` | Setup |
| GET, POST `{studentId}/grant`, POST `{studentId}/withdraw` | `api/attendance/face/my-children` | guardian (own children only) |
| GET | `api/attendance/events?from&to&result&source&deviceId&personType&personId&take` | ViewAttendanceReports |
| POST | `api/attendance/events/{id}/review` `{approve, note}` | Setup |
| GET/POST, POST `{id}/decide`, POST `{id}/cancel` | `api/attendance/corrections` | ManageAttendance (decide: Setup) |
| GET | `api/attendance/audit`, `api/attendance/exceptions?date` | ViewAttendanceReports |

Devices (anonymous at the gateway, authenticated by key, rate limited per key):

```
POST api/attendance/device/heartbeat   X-Device-Key: adk_…   {"firmwareVersion":"2.1","error":null}
POST api/attendance/device/events      X-Device-Key: adk_…   {"events":[{"eventId":"log-123","identifier":"04A31F2B","occurredAt":"2026-10-22T08:05:00+05:30","direction":"in"}]}
   → {"received":1,"accepted":1,"duplicates":0,"rejected":0,"pendingReview":0,"items":[{"eventId":"log-123","result":"Accepted","reason":null}]}
POST api/attendance/device/face        X-Device-Key: adk_…   multipart image=<jpeg>
```
`occurredAtLocal` (school-local, no offset) may be sent instead of `occurredAt`. Up to 500 events per call; scans older than 7 days or more than 10 minutes in the future are refused.

ZKTeco ADMS (no key in the protocol; registered serial only): `GET /iclock/cdata?SN=…` (handshake), `POST /iclock/cdata?SN=…&table=ATTLOG` (punches), `GET /iclock/getrequest`, `POST /iclock/devicecmd`.

## Database

Migration `20261022181315_AttendanceCaptureMethods` (applied automatically at start-up; idempotent script in `sql/01-academic-attendance-capture.sql`):
new tables `AttendanceSettings, AttendanceDevices, AttendanceCredentials, AttendanceQrSessions, AttendanceScanEvents, AttendanceCorrectionRequests, AttendanceAuditEntries, FaceConsents, FaceEnrollments`;
`AttendanceRecords` + `ScanEventId, CheckInAt`; `StaffAttendanceRecords` + `CaptureMode` (existing rows `Manual`), `CheckInAt, CheckOutAt, Remarks, ScanEventId`.
Filtered unique indexes: one active owner per card hash; one device per serial; one event per (tenant, source, device, external id).

## Configuration

| Key (env) | Purpose |
|---|---|
| `Attendance__SigningKey` (`ATTENDANCE_SIGNING_KEY`) | Signs QR passes and keys the card-id hash. Defaults to the study-material key / JWT secret. Changing it invalidates linked cards (re-link). |
| `FaceRecognition__Provider` (`FACE_RECOGNITION_PROVIDER`) | `None` (default) or `CompreFace`. |
| `FaceRecognition__CompreFace__BaseUrl` (`COMPREFACE_URL`) | e.g. `http://compreface-api:8080` (private network only). |
| `FaceRecognition__CompreFace__ApiKey` (`COMPREFACE_API_KEY`) | API key of a CompreFace *Recognition* service. |
| `FaceRecognition__CompreFace__DetectionProbabilityThreshold` | default 0.85 |
| `RateLimiting__AttendanceDevicePerMinute` | default 600 per device key; keyless callers share 1/20 of that. |

Added to `docker-compose.yml`, `deploy/live`, `deploy/azure` compose files and `.env` examples. The live/azure `Caddyfile` has a commented, IP-restricted `/iclock/*` block for ADMS terminals.

## Setting up hardware and services

**RFID readers.** Most USB/serial readers are "keyboard wedge" devices: plug one into a gate PC and run a small gateway that reads the UID and posts it to `device/events` with the reader's key (sample below). Network readers with HTTP push can post directly if they let you set a header; otherwise use the gateway. Link cards under Setup → Cards & ids (tap the card on a USB reader with the field focused).

```bash
curl -X POST https://APP_DOMAIN/services/academic/api/attendance/device/events \
  -H "X-Device-Key: adk_xxxxxxxx" -H "Content-Type: application/json" \
  -d '{"events":[{"eventId":"gate1-000123","identifier":"04A31F2B","occurredAt":"2026-10-22T08:05:00+05:30"}]}'
```
Gateways should keep a local queue and resend with the same `eventId` after a network failure (resends are recognised).

**ZKTeco / eSSL biometric terminals (ADMS).** Register the terminal as *Biometric* with its serial number. On the terminal: Comm → Cloud Server Setting → server address = `APP_DOMAIN`, port 443 (HTTPS) or the port you expose, enable "Domain name". Enable the commented `/iclock/*` block in the Caddyfile with the school's public IP(s). Enrol fingerprints on the terminal as usual, then link each terminal user id (PIN) to the person. Punches arrive within seconds; Setup → Devices shows "Online".
Other vendors: use their middleware/SDK to forward punches to `device/events`.

**Face recognition (CompreFace).** Run CompreFace on the school/VPS private network (Docker, from exadel-inc/CompreFace releases; ~4 GB RAM). Create an application and a *Recognition* service, copy its API key. Set `FACE_RECOGNITION_PROVIDER=CompreFace`, `COMPREFACE_URL`, `COMPREFACE_API_KEY`, restart AcademicService. In CompreFace set `save_images_to_db=false` so only embeddings are kept. Switch Face on under Setup → Methods (refused until the service is configured), record consent, add 2–3 photos per person.
A face kiosk is a tablet/PC registered as *Face kiosk* that posts camera frames to `device/face` with its key.

**Data protection (India DPDP Act 2023).** Face data is biometric personal data: collect verifiable consent (guardian for children), state the purpose, keep it on infrastructure you control, delete on withdrawal (automatic here), and keep the consent forms. Scan events are deleted after the retention period. Do not enable face recognition until consent is collected.

## Tests

- AcademicService: `tests/AcademicService.UnitTests/Attendance/AttendanceMethodsTests.cs` (36 tests: processor rules, idempotency, late/duplicate/backfill, staff in/out, signer tamper/expiry, QR sessions and replay, device keys/rotation/disable, card uniqueness, ADMS parsing and resend, method status, face consent/thresholds/review/withdrawal, guardian scoping, corrections, register preservation, past-day lock, exceptions). Full suite: 815 passed.
- Migration applied to a throwaway SQL Server database; live API smoke test (`devices`, heartbeat, events, resend, ADMS handshake/punch, exceptions, audit, rate limit): all checks passed.
- SMS UI: `methods/api.test.ts`, `components/AttendanceMethods.test.tsx`. Browser check against the live API: settings save, device registration/key dialog, staff session, forged pass refused, real pass accepted, replay refused, pass page renders.

## End-to-end test procedure (real hardware)

1. Setup → Methods: switch on RFID. Setup → Devices: register "Gate reader" → copy key.
2. Configure the gateway with the key; status shows Online within a minute.
3. Link a test card to a test student. Tap it: Exceptions shows 1 accepted; the student's register shows "RFID card hh:mm".
4. Tap an unlinked card: Exceptions → Unknown cards lists it.
5. Tap the linked card again within the duplicate window: counted as a duplicate, no change.
6. Unplug the gateway for 10+ minutes: status shows Not ready / device Offline.

## Not done / limits

- The mobile apps do not have a pass screen or a native scanner yet; the web pass page and the web scanner work in phone browsers.
- No vendor SDKs are bundled (Suprema, Realtime, Mantra…); they connect through `device/events`. Only ZKTeco ADMS is spoken natively.
- Face liveness (anti-spoofing) depends on the provider/kiosk; CompreFace's basic setup has none, so keep a teacher present or use the review threshold.
- Exceptions "present without scan" lists students marked by hand while any device method is on; it is informational.
