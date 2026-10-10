---
id: students-edit-transfer
title: Edit a student or mark a student as transferred
module: students
kind: task
access: public
route: students.list
summary: Find a student, change their details, or record that they have left for another school.
order: 20
status: reviewed
related: [students-register]
tasks:
  - id: find-student
    label: Find a student
    phrases: [find a student, search for a student, look up a student, student list]
    route: students.list
  - id: edit-student
    label: Edit a student's details
    phrases: [edit a student, change student details, update a student, correct a student record]
    route: students.list
  - id: transfer-student
    label: Transfer a student
    phrases: [transfer a student, student left the school, issue transfer, mark student as transferred]
    route: students.list
keywords: [student, transfer certificate, TC number, quick view, profile, filter]
---

Use this to find a student on the roll, correct their details, or record a transfer out of the school.

## Find a student

![Student management on the Students tab: a table of students with their class, roll number, status and guardian, the search box, the class and status filters and the Register student button.](shot:students-list-desktop "The Students tab.")

1. Open **Academics**, then **Students**, and stay on the **Students** tab.
2. Type a name or admission number in **Search by name or admission no.**
3. To narrow the list, use the **Class** filter (**All classes** shows everyone) and the **Status** filter (**All statuses** shows everyone).

## Open or edit a student

![The actions menu on a student row with Quick view, View profile, Edit details and Transfer student.](shot:students-row-actions-desktop "The actions menu on a student row.")

1. On the student's row, open the actions menu (**Actions for** the student's name).
2. Choose one of:
   - **Quick view** for a short summary.
   - **View profile** to open the full profile.
   - **Edit details** to change the student's core details.
3. In **Edit student**, change what you need and select **Save changes**.

A "Student updated" message confirms it. The form is the same as in [Register a student](help:students-register), without the optional email fields.

## Mark a student as transferred

![The Transfer student dialog with Destination school, Transfer certificate number and Reason fields and the Confirm transfer button.](shot:students-transfer-dialog-desktop "The Transfer student dialog.")

Only students whose status is active show this option.

1. On the student's row, open the actions menu and choose **Transfer student**.
2. Fill in **Destination school**, **Transfer certificate number** and **Reason**.
3. Select **Confirm transfer**.

The student is marked as transferred, and a message names them.

| Field | Required | What is checked |
|---|---|---|
| **Destination school** | Yes | Shows "Destination school is required". |
| **Transfer certificate number** | Yes | Shows "TC number is required". |
| **Reason** | Yes | Shows "Reason is required". |

> **Important:** Check the name in the dialog description before you confirm. This records that the student has left the school.

[Open Students](route:students.list)
