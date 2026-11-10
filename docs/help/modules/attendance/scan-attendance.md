---
id: attendance-scan
title: Take attendance by scanning QR passes or faces
module: attendance
kind: task
roles: [admin, principal, teacher]
access: public
route: attendance.home
summary: Open a scanning session, scan students' or staff members' QR passes (or recognise faces), and see who was accepted.
order: 40
status: reviewed
related: [attendance-mark-students, account-attendance-pass, attendance-corrections, attendance-setup]
tasks:
  - id: scan-attendance
    label: Scan attendance with QR passes
    phrases: [scan attendance, qr attendance, scan qr pass, scanner attendance, face attendance, scanning session, handheld scanner, attendance by camera]
    route: attendance.home
keywords: [scan, qr, pass, face, camera, handheld scanner, session, arrival, departure]
---

Scanning is a faster way to take attendance than ticking a register. It only works when an administrator has switched on QR or face attendance for the branch (see [Set up attendance methods and devices](help:attendance-setup)). The manual register always works.

## Open a scanning session

1. Open **Attendance** from the menu and select the **Scan** tab.
2. Under **Open a scanning session**, choose who it covers: **Students of a section** (then choose the **Section**) or **Staff**.
3. Choose **Scans mean**: **Arrival** or **Arrival (first scan), then departure**.
4. Choose how long it stays open in **Open for**, then select **Open session**. A "Scanning session opened" message appears.

Today's sessions are listed under **Today's sessions**. Use **Close session** when you are finished, or **Resume** on a closed one. A closed session accepts no more scans.

## Scan people in

- **Camera:** select **Start camera** and hold each QR pass in front of it. Select **Stop camera** when done. If the browser has no camera access, use a handheld scanner.
- **Handheld scanner:** click in the **Handheld scanner: focus here and scan** box and scan the passes.
- **Face:** where face attendance is on, choose **Recognise**. If a face is not matched with enough confidence the page says to mark the person in the register instead.

Results appear as people are scanned, with the count against those expected. A pass is accepted only while the session is open and only for the people the session covers. Anything else shows as **Not accepted** with the reason.

Students and staff show the pass from their app or from **My attendance pass** ([Show your attendance QR pass](help:account-attendance-pass)).

## After scanning

Anyone not scanned stays unmarked until you mark them in the register. Scanned people are marked present, or late if they arrive after the school's late time. Mistakes are fixed through [Attendance corrections](help:attendance-corrections), and administrators review odd scans in **Exceptions**.
