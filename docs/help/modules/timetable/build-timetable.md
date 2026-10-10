---
id: timetable-build
title: Build a section's timetable and set up periods
module: timetable
kind: task
roles: [admin, principal, teacher]
access: public
route: timetable.home
summary: Define the school day's periods, fill a section's weekly grid, and assign a substitute teacher for one date.
order: 10
status: reviewed
tasks:
  - id: edit-timetable
    label: Edit the timetable
    phrases: [edit timetable, build timetable, set the timetable, assign a teacher to a period, change a period, timetable for a class]
    route: timetable.home
  - id: set-periods
    label: Set up periods
    phrases: [set up periods, add a period, change period timings, add a break, school day timings]
    route: timetable.home
  - id: assign-substitute
    label: Assign a substitute teacher
    phrases: [assign substitute teacher, substitute teacher, cover a class, teacher absent cover]
    route: timetable.home
keywords: [timetable, period, break, room, substitute, section, auto-generate]
---

Use this to set up the school day and plan each section's week.

## Set up the periods

1. Open **Timetable** from the menu. The page is headed **Timetable management**.
2. Open the **Periods** tab.
3. Edit the label, start and end times of each period. Use **Add period or break** to add a row, and the remove button on a row to take one out.
4. Select **Save periods** ("Periods saved"). **Discard changes** puts back what was saved.

## Fill in a section's weekly grid

1. Open the **Class/Section View** tab and choose the section.
2. Select a cell of the grid (a day and period).
3. In the dialog, choose the **Subject**, **Teacher** and **Room**, and select **Save** ("Slot updated"). **Clear** empties the cell ("Slot cleared").
4. To start from a suggestion, select **Auto-generate draft**. The message "Draft timetable generated. Review and adjust manually before publishing." reminds you to check it.

If the teacher is already teaching another section at that time, a warning says so.

## Assign a substitute for one date

1. Open the **Substitutions** tab and select **Assign substitute**.
2. In **Assign substitute teacher**, choose the **Date**, **Section**, **Scheduled period** and **Substitute teacher**. A **Reason** is optional.
3. Select **Assign substitute**.

The substitution covers a single date only; the recurring weekly timetable is left untouched. The checks are "Date is required", "Section is required", "Select a scheduled period" and "Substitute teacher is required".

## Other views

**Teacher View** and **Student/Parent View** show a timetable from those points of view, and **Rooms** manages rooms.

[Open Timetable](route:timetable.home)
