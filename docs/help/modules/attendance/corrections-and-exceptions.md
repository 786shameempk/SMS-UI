---
id: attendance-corrections
title: Correct attendance and review exceptions
module: attendance
kind: task
roles: [admin, principal, teacher]
access: public
route: attendance.home
summary: Ask for a recorded day to be changed, approve or reject requests, and review unusual scans.
order: 50
status: reviewed
related: [attendance-mark-students, attendance-scan, attendance-setup]
tasks:
  - id: request-attendance-correction
    label: Request an attendance correction
    phrases: [attendance correction, change attendance, wrong attendance, edit past attendance, fix attendance, correct a marked day]
    route: attendance.home
  - id: review-attendance-exceptions
    label: Review attendance exceptions
    phrases: [attendance exceptions, refused scans, unknown card, offline device, scanned in marked absent, did not check out]
    route: attendance.home
keywords: [correction, approve, reject, exceptions, refused scans, unknown cards, offline devices, audit]
---

When your school has **Lock past days** switched on, teachers cannot edit an earlier register directly. They send a correction request, and an administrator decides.

## Request a correction

1. Open **Attendance** and select the **Corrections** tab.
2. Select **Request a correction**.
3. Choose the **Person type** (**Student** or **Staff member**), the person and the **Day**.
4. Choose what it **Should be**, then write the **Reason**: say what should change and why.
5. Select **Send request**. A "Correction requested" message appears.

The current record stays until an administrator approves the request.

## Approve or reject a request

1. On the **Corrections** tab, use **Correction status** to show **Pending** requests.
2. Select **Approve** to update the record and the audit trail ("Correction applied"), or **Reject** ("Correction rejected"). A rejection asks **Why is this rejected?**.

Decided requests show who decided and the reason.

## Exceptions

Administrators and principals also see an **Exceptions** tab that collects what needs a human look:

- **Waiting for review** — scans (for example a face match below the automatic threshold) that need **Approve** or **Reject**.
- **Refused scans** and **Accepted scans**, and **Duplicates ignored**.
- **Unknown cards and ids** — cards or terminal ids that are not linked to a person.
- **Offline devices** — devices that have not reported in recently.
- **Scanned in, marked absent**, **Present without a scan** and **Staff who did not check out**.

Select **Approve** on a waiting item to mark the person; select **Reject** to refuse it.
