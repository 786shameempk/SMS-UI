---
id: online-exams-create
title: Create and publish an online exam
module: online-exams
kind: task
roles: [admin, principal, teacher]
access: public
route: online-exams.new
summary: Build an online exam step by step, then schedule it or publish it now.
order: 10
status: reviewed
related: [online-exams-take]
tasks:
  - id: create-online-exam
    label: Create an online exam
    phrases: [create an online exam, new online exam, schedule an online exam, set an online test, make an exam online]
    route: online-exams.new
keywords: [online exam, wizard, question bank, duration, attempts, shuffle, passing marks, assign students, publish]
---

Use this to set up an exam that students take on screen.

## Steps

1. Open **Exams** in the **Online Exams** menu and start a new exam. The wizard has six steps: **Basic information**, **Schedule**, **Configuration**, **Questions**, **Assign students** and **Review & publish**. A stepper shows "Step … of 6".
2. **Basic information:** enter the **Exam name** (at least 3 characters), choose the **Exam type**, **Subject** and **Class**. **Description / instructions** (shown to students before they start), **Academic year** and **Teacher** are optional.
3. **Schedule:** set the **Start date**, **Start time**, **End date** and **End time**, the **Exam duration (minutes)** (1 to 600, the countdown each student gets once they start) and the **Time zone**.
4. **Configuration:** set **Passing marks** and **Number of attempts** (1 to 5). Total marks come from the questions. Switch on the options you want: **Shuffle questions**, **Shuffle options**, **Show question numbers**, **Allow back navigation**, **Auto submit when time expires**, **Allow review before submit**, **Show result immediately** and **Show answers with results**.
5. **Questions:** add questions, from the question bank or new ones. Each must be complete.
6. **Assign students:** choose sections or individual students (at least one).
7. **Review & publish:** check the summary. Select **Save draft** to keep working later, **Schedule exam** to open it at the start time, or **Publish now** to open it immediately.

## Checks you may see

- "Give the exam a name (at least 3 characters)."
- "Enter the start and end date and time."
- "The exam must end after it starts."
- "The duration can't be longer than the exam window (… min)."
- "Question … is incomplete - open it to fix."
- "Choose at least one section." / "Choose at least one student."

> **Note:** The server always closes an attempt when time is up, whatever the auto-submit setting.

[Create an exam](route:online-exams.new)
