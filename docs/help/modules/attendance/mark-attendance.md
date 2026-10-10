---
id: attendance-mark-students
title: Mark student attendance
module: attendance
kind: task
roles: [admin, principal, teacher]
access: public
route: attendance.home
summary: Record who is present, absent, late, on half day or on leave for one class section on one date.
order: 10
status: reviewed
related: [attendance-mark-staff]
tasks:
  - id: mark-attendance
    label: Mark student attendance
    phrases: [mark attendance, take attendance, record attendance, mark students present, mark absent, daily attendance]
    route: attendance.home
keywords: [attendance, present, absent, late, half day, leave, roster, section, capture mode]
---

Use this to record attendance for the students of one section on one day.

## Before you start

- You need access to the **Attendance** module.
- The section must have students in its roster. If none appear, the page says "No students found for this section."
- If the chosen academic year has no classes, the page says "No rosters seeded for this academic year."

## Steps

![Attendance management on the Mark Attendance tab with Academic year, Class, Section, Date and Capture mode.](shot:attendance-mark-desktop "The Mark Attendance tab.")

1. Open **Attendance** from the menu. The page is headed **Attendance management**; stay on the **Mark Attendance** tab.
2. Choose the **Academic year**, **Class** and **Section**, then pick the **Date**.
3. Leave **Capture mode** on **Manual**. The other modes are described below.
4. Every student starts as **Present**. If attendance for this section and date was saved before, the saved marks are shown instead.
5. Change the status of anyone who was not present. The statuses are **Present**, **Absent**, **Late**, **Half Day** and **Leave**.
6. Check the totals above the list, then select **Save attendance**.

A "Attendance saved" message confirms it. If it cannot be saved you see "Could not save attendance".

To mark everyone present in one step, select **Mark all present** before changing the exceptions.

## Capture modes

The choices are **Manual**, **QR Code**, **RFID Card**, **Biometric**, **Face Recognition** and **Mobile App**. Only **Manual** is working in the web app. Choosing another mode shows "Simulated" with a note that the hardware integration is not available; keep using the grid to record attendance.

> **Note:** If attendance was already saved for this section and date, the saved marks are shown when you pick them again. Check the date before you save.

[Open Attendance](route:attendance.home)
