---
id: extracurricular-schedule
title: Schedule sessions and take the register
module: extracurricular
kind: task
access: public
roles: [admin, principal, teacher]
route: extracurricular.schedule
summary: Plan one-off or repeating sessions, avoid clashes and mark attendance.
order: 50
status: reviewed
related: [extracurricular-activities]
tasks:
  - id: schedule-session
    label: Schedule an activity session
    phrases: [schedule a session, add practice, plan a practice session, repeat weekly, create a session, activity timetable]
    route: extracurricular.schedule
  - id: activity-attendance
    label: Take activity attendance
    phrases: [activity attendance, take the register, mark attendance for club, practice attendance, attendance for football]
    route: extracurricular.schedule
keywords: [session, schedule, recurring, weekly, venue, instructor, clash, register, attendance, cancel]
---

## Create a session

1. Open **Extra-Curricular**, then **Schedule**, and select **New session**.
2. Choose the **Activity**, an optional **Team**, a **Title**, the **Date**, **Starts** and **Ends**, the **Venue** and **Instructor**.
3. To repeat it, set **Repeats** to every day, week or month and give an end date or a number of sessions.
4. Select **Create session** (or **Create series**).

The venue, the instructor and the team are checked for clashes. If any session in a series clashes, nothing is saved and the message names the date.

## Change a session

On a session: **Reschedule**, **Cancel** (a reason is required), **Complete**, and for a cancelled one **Reinstate** or **Delete**.

## Take the register

1. Select **Take register** on a session.
2. Mark each student **Present**, **Late**, **Excused** or **Absent**, or use **Mark everyone present** and change the exceptions.
3. Select **Save attendance**. Saving again updates the same marks.

The list is the team's squad for a team session, otherwise the activity's approved students.

## Summary

**Attendance summary** shows sessions, present, late, excused, absent, the percentage and hours per student. Excused absences do not count against the percentage.
