# 5. Taking attendance offline (web)

A teacher can open a class register, mark it and save it with no connection. It is kept on the device and sent when the connection is back, without ever saving twice, and without silently overwriting a register someone else changed meanwhile.

## What changed

### AcademicService
* `POST /api/attendance` accepts `operationId`, `baseVersion` and `force` (all optional: the mobile app, which sends none of them, behaves exactly as before).
  * `operationId`: the server remembers it (`AttendanceSyncOperations`, migration `AttendanceOfflineSync`); sending the same id again returns the register as it is without saving.
  * `baseVersion`: the version of the register the edit started from. If the register has changed since, the server answers **409** with `currentVersion` and `current` (what it holds now) instead of saving. `force: true` saves anyway (the teacher chose "Keep my version").
* `GET /api/attendance/sections/{id}/date/{date}/register` returns `{ version, records }`. The version is the newest `MarkedAt` of the day's records, or `none` when there are none.

### SMS UI
| Piece | Where |
|---|---|
| Service worker caches the app shell only: the page, hashed `/assets/*`, `/config.js`, manifest, icon. Network first for the page and config (a deploy shows at once), cache first for hashed assets. Never API calls, other sites, or anything under `/services` or `/api` | `public/sw.js` |
| IndexedDB tables (`cache`, `queue`) with memory fallback | `features/attendance/offline/storage.ts` |
| Saved rosters, registers and class lists (per user and school/branch) with "answer from the device only when the server could not be reached" | `offline/cache.ts` |
| The queue: one operation per register, states `pending → syncing → synced / conflict / rejected` | `offline/queue.ts` |
| Sync engine: oldest first, one at a time, one pass per browser (Web Locks), safe to repeat | `offline/sync.ts` |
| Triggers: browser comes online, tab shown again, every minute while something waits | `offline/hooks.ts` (`useAttendanceSyncDriver`, mounted in `AppLayout`) |
| Status list, offline notice, conflict dialog | `offline/OfflineStatusBar.tsx` |
| "Save classes for offline use" button | `offline/prepare.ts`, Mark Attendance tab |
| Removing saved data on sign-out | `offline/purge.ts`, `Header.tsx` warns first |

## Behaviour worth knowing
* **Open the class once online first.** A class is available offline after it was opened (or "Save classes for offline use" was pressed) on that device, because the roster and the attendance screen's code come from the device's saved copy.
* **A second offline edit of the same class and day** replaces the first if that was never sent; if the first may already have reached the server (no answer came back), the second becomes its own operation that looks up the register's version first, so it is checked against what the first saved.
* **Conflict**: the queue entry waits as "Needs your decision". The dialog lists only the students whose status differs, by name, and offers "Keep my version" (re-sent with `force`) or "Use the school's version" (drops the device copy).
* **Refused saves** (a past day locked by the branch, no access) are kept visibly as "Not accepted" with the server's reason; the teacher can retry or discard. Server errors (5xx) are retried up to five times first.
* **Privacy**: saved rosters (student names) are deleted at sign-out and when someone else signs in. Waiting registers hold only student ids and statuses. A deliberate sign-out deletes them too, after a warning; an expired session keeps them so signing in again sends them. Registers of someone who never returns are removed after 14 days.
* The scan, correction and staff screens are not offline-capable; only the student register is.
* A phone's Chrome keeps IndexedDB and the service worker like a desktop's; Safari may clear them after a week unused, so open the app once a week or save the classes again.

## Verified
* `npx vitest run src/features/attendance`: 39 tests (api error mapping, queue rules, every sync outcome, saved-answer rules, sign-out purge, status list and conflict dialog).
* AcademicService attendance tests (76) pass.
* In the browser (production build): after one online visit the app opens with the server stopped; IndexedDB persists across reload; with a stubbed backend: offline save → "Saved on this device", reconnect → sent, forced conflict → review dialog → "Keep my version" sends with `force`.
