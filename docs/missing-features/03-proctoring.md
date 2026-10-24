# 3. Online exams: proctoring and question pools

Status: built and tested (2026-10-23). Uncommitted in **AcademicService** and **SMS UI**.

## What already worked (kept)

Server-fixed deadline plus 30 s grace, worker auto-close of expired attempts, autosave, idempotent submit (row version), attempt limits, exam windows, assignment eligibility, shuffles, negative marking, auto-marking, manual evaluation.

## What was added

**Question pools.** `QuestionsPerAttempt` (0 = all): each attempt draws that many questions at random; marking, totals, answer validation, the student's result and the teacher's attempt review use only the drawn questions. Pools need equal marks (validated in the wizard and on the server) so every paper is worth the same. Answers to a question that was not drawn are refused.

**Proctoring (per exam, off by default).**

| Setting | Meaning |
|---|---|
| Mode | Off · Basic (browser events) · Webcam (browser events + camera must stay on) |
| Require fullscreen | Asks for fullscreen on the "I agree" click; every exit is recorded and an overlay asks the student to return |
| Flag after N incidents | Marks the attempt Flagged for a person to review; never a conclusion |
| Auto-submit after N incidents | 0 = never. When reached, the attempt is finalized and scored, and the student is told why |
| Camera photo every N s | Webcam only; 0 keeps no photos (the camera only has to stay on) |
| Keep evidence N days | Events and photos are deleted that many days after the exam window closes |

Flow:
1. **Notice and consent.** Before a proctored exam starts the student sees exactly what is recorded (generated from the settings, including "events are not proof" and the retention), runs a device check (camera test, fullscreen support) and ticks "I agree". The server refuses to start a proctored attempt without a consent record.
2. **Observation.** The exam page reports real browser events only: tab hidden (with time away), window blur, fullscreen exit/enter, copy, paste, right-click, 2 min inactivity, offline/online, extra screens (where the browser exposes it), camera stopped/unavailable. Batched every 10 s (also the heartbeat), sequence-numbered so resends do not double count, kept and resent after a network drop. The **server assigns severity** (Incident / Warning / Info); the browser cannot downgrade events or inject server-only ones.
3. **Monitor.** Exam page → **Monitor**: candidates with connected / last seen (45 s), state, incidents, last event, consent, outcome and open appeals; refreshes every 10 s. Timeline per attempt with photos (fetched with the user's token, never public).
4. **Review and appeal.** Reviewer chooses Cleared, Warning or Misconduct (a note is required for the last two). The student sees the decision on their result page and can appeal once; the reviewer accepts (outcome becomes Cleared) or keeps it, with a reply.

What it does not claim: a browser cannot stop a second device, another person in the room, or a phone camera pointed at the screen. The notice and the monitor say so; flags are prompts to look, not findings.

## API (AcademicService, `api/online-exams/{examId}/…`, Online Exams module)

| Method | Path | Who |
|---|---|---|
| GET | `proctoring` | student: settings, notice lines, consent state |
| POST | `proctoring/consent` `{noticeVersion, cameraAvailable, fullscreenAvailable, browser}` | student |
| POST | `proctoring/events` `{events:[{sequence, type, occurredAt, detail}]}` → `{incidents, warnings, flagged, autoSubmitted, message}` | student (empty = heartbeat) |
| POST | `proctoring/snapshot` multipart `image` (JPEG/WebP ≤ 1 MB) | student, webcam mode with photos only, rate limited to half the interval |
| GET | `proctoring/my-review` · POST `proctoring/appeal` `{text}` | student |
| GET | `monitor` | staff with access to the exam |
| GET | `attempts/{attemptId}/proctoring` · `…/proctoring/snapshots/{eventId}` | staff |
| POST | `attempts/{attemptId}/proctoring/review` `{outcome, note}` · `…/appeal-decision` `{upheld, note}` | staff |
| | Exam settings DTO gains `questionsPerAttempt, proctoring, requireFullscreen, warningThreshold, autoSubmitAfterIncidents, snapshotIntervalSeconds, evidenceRetentionDays` (all optional on input); the attempt session gains `proctoring` | |

## Database

Migration `OnlineExamProctoringAndPools` (script `sql/03-academic-proctoring.sql`): `OnlineExams` + 7 setting columns (existing exams: pools off, proctoring Off, threshold 3, retention 90); new `ProctoringConsents` (unique exam+student), `ProctoringEvents` (unique attempt+sequence), `ProctoringReviews` (one per attempt, row version). Photos are stored with the existing study-material storage (Azure Blob or local disk) under `proctoring/{tenant}/{exam}/{attempt}/`; `ProctoringRetentionWorker` deletes them with their events after retention.

## Tests

- AcademicService `Commands/ProctoringTests.cs`: consent gate and notice wording, unproctored exams unchanged, server severity/flag/resend idempotency, server-only events refused, auto-submit scores the attempt, monitor/timeline/decision/appeal round trip, students blocked from invigilator screens, photos only when configured + rate limit + retention purge, basic mode refuses photos; `QuestionPoolTests`: draw size, per-attempt totals and marking, answers outside the draw refused, pool validation. Full suite 825 passed. Migration applied to a throwaway SQL Server database.
- SMS UI `proctoring/proctoring.test.tsx`: API client, the event hook (real visibility events, same sequence on resend after a failure, nothing for unproctored exams), consent screen gating. Online-exams suite 58 passed.

## Not done / limits

- No live browser run of the exam-taking flow against a running service in this session (covered by the unit and component tests above).
- No face presence/multi-face detection in the camera feed (would need an ML model in the browser or the face service from feature 1).
- The mobile student app has its own exam screen; proctored exams should be taken in a desktop browser (the mobile app does not send events).
- Lockdown browsers (Safe Exam Browser) are not integrated.
