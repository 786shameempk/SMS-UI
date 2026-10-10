---
id: extracurricular-approve-enrollments
title: Approve activity requests
module: extracurricular
kind: task
access: public
roles: [admin, principal, teacher]
route: extracurricular.enrollments
summary: Approve or reject requests and manage the waiting list.
order: 30
status: reviewed
related: [extracurricular-join-activity]
tasks:
  - id: approve-enrollments
    label: Approve activity requests
    phrases: [approve enrollment, approve activity request, approve club request, reject activity request, activity approvals, waiting list]
    route: extracurricular.enrollments
keywords: [approve, reject, requests, waiting list, capacity, enrollment]
---

## Decide requests

1. Open **Extra-Curricular** and select **Enrollments**. It opens on **Requested**.
2. Filter by activity if you like.
3. Select **Approve** or **Reject** on one row, or tick several rows and use **Approve** / **Reject** at the top.
4. Rejecting asks you to confirm.

An approval into an activity that is already full puts the student on the **Waiting list** instead. When someone withdraws, the student who has waited longest takes the place.

> **Warning:** If the school stops clashing sessions (Settings), an approval is refused when the student would be in two sessions at the same time. The message names the session they clash with.

## Other actions

- **Mark completed** closes an approved place at the end of the season.
- **Withdraw** gives a place back.
- Staff with setup rights can enroll a student directly from **Activities** with **Enroll**; that skips the request step.
