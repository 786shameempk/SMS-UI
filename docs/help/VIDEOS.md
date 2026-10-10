# Help videos: recording and publishing

No help video has been recorded yet. `docs/help/assets/videos.json` is empty, and no article claims a video.

## Rules

- Record the real application, with **synthetic data only**: invented names, no real students, staff, phone numbers, emails or fee figures. Use a demo school, never a live one.
- Keep each video to one task and under about 2 minutes. Speak or caption every step; add a caption file (WebVTT).
- Do not store videos in the repository. Upload the MP4 (and a poster image) to the school's object storage or CDN and list the URL in `videos.json`.
- Re-record when the screen changes. Note the app version in the title field or the manifest entry.

## Manifest entry (`docs/help/assets/videos.json`)

```json
{
  "id": "register-student",
  "title": "Register a student",
  "url": "https://cdn.example.com/help/register-student.mp4",
  "poster": "https://cdn.example.com/help/register-student.jpg",
  "captions": "https://cdn.example.com/help/register-student.vtt",
  "durationSeconds": 95,
  "recordedOn": "2026-10-10"
}
```

Then add `video: register-student` to the article's front matter and run `npm run help:check` (it reports a video that is named but not in the manifest).

## Recording checklist

1. Start a demo environment with synthetic data. Sign in as the role the article is written for.
2. Close other windows and notifications. Use a 1280×720 or 1920×1080 browser window at 100% zoom.
3. Follow the article's steps exactly, so the video and the text agree. Do not skip validation messages the article mentions.
4. Review the finished video frame by frame for anything personal (browser bookmarks, other tabs, notifications).
5. Export MP4 (H.264) with captions, upload, and add the manifest entry.
6. After the video is live, set the article's `status` to `verified` only if someone also followed it end to end in the running app, and set `verifiedOn`.

## Priority list (not recorded)

| Order | Video | Article |
|---|---|---|
| 1 | Sign in and change a temporary password | `account-sign-in`, `account-temporary-password` |
| 2 | Register a student | `students-register` |
| 3 | Mark attendance | `attendance-mark-students` |
| 4 | Generate invoices and record a fee payment | `fees-generate-invoices`, `fees-record-payment` |
| 5 | Add a user and assign a role | `users-add`, `roles-manage` |
| 6 | Assign and submit homework | `homework-assign`, `homework-submit` |
| 7 | Create and publish an online exam | `online-exams-create` |
| 8 | Parent Portal: pay a fee and apply for leave | `parent-portal-guide` |
| 9 | Set up bus tracking and start a driver trip | `transport-buses-tracking`, `transport-driver-trip` |
| 10 | Ask School AI | `help-ask-school-ai` |
