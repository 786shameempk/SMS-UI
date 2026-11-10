---
id: attendance-setup
title: Set up attendance methods and devices
module: attendance
kind: task
roles: [admin]
access: admin
route: attendance.home
summary: Switch on QR, card, biometric or face attendance, set the rules, register devices and record face consent.
order: 60
status: reviewed
related: [attendance-scan, attendance-corrections]
tasks:
  - id: attendance-setup
    label: Set up QR, card or face attendance
    phrases: [attendance setup, switch on qr attendance, face attendance setup, register attendance device, card reader, biometric terminal, face consent, lock past days, late after time]
    route: attendance.home
keywords: [setup, methods, devices, cards, biometric, face, consent, thresholds, late time, time zone, retention, audit]
---

Administrators see a **Setup** tab in **Attendance**. Manual registers always work; each other method only takes attendance when it is switched on here and its device or service is connected.

## Methods and rules

1. Open **Attendance** and select **Setup**, then **Methods**.
2. Under **Methods and rules**, switch on the methods you want. Each shows **Ready** or **Not ready**.
3. Set the rules: **Students are late after**, **Staff are late after**, **School time zone**, **QR pass lifetime (seconds)**, **Ignore repeat scans within (minutes)** and **Keep scan events for (days)**.
4. For face recognition, set **Face: accept automatically from (0.5–1)** and **Face: send for review from (0.5–1)**. Matches in between go to **Exceptions** for review.
5. Turn on **Lock past days** so teachers send a correction request instead of editing earlier registers; administrators approve it.
6. Select **Save settings**. "Attendance settings saved" appears.

## Devices

Under **Devices**, add card readers, biometric terminals and face kiosks. Each gets a device key.

> **Important:** Copy the device key when it is shown. It is not stored in readable form and cannot be shown again; issue a new key if it is lost.

A device shows as online once it has called in within 10 minutes. ZKTeco terminals use their serial number instead of a key.

## Cards and ids

Under **Cards & ids**, link a **Card number / UID** or **Biometric user id** to a student or staff member so scans are recognised.

## Face consent

Under **Face consent**, record that the person (or a guardian for a student) gave consent before adding any **face photo**. Use **Delete face data** to withdraw consent and delete what is held. Add two or three clear, front-facing photos for better matching.

## Audit trail

**Audit trail** lists every change to attendance and to these settings, with who and when.

For staff and students using the QR method, see [Show your attendance QR pass](help:account-attendance-pass) and [Take attendance by scanning](help:attendance-scan).
