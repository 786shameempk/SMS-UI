---
id: examinations-schedule-and-marks
title: Create an exam, schedule subjects and enter marks
module: examinations
kind: task
roles: [admin, principal, teacher]
access: public
route: examinations.home
summary: Set up an exam for a class and term, add subject papers, then record each student's marks.
order: 10
status: reviewed
tasks:
  - id: create-exam
    label: Create an exam
    phrases: [create an exam, schedule an exam, new exam, set up exam, add exam timetable]
    route: examinations.home
  - id: enter-marks
    label: Enter exam marks
    phrases: [enter marks, add marks, record exam marks, mark entry, upload results, enter exam results]
    route: examinations.home
keywords: [exam, term, class, subject schedule, max marks, pass marks, absent, marks entry]
---

Use this to prepare an exam and record the marks.

## Create the exam

1. Open **Examinations** from the menu. The page is headed **Examination management**; stay on the **Exams** tab.
2. Select **New exam**. The dialog says exams are scoped to a class and term, with subject schedules added separately.
3. Enter the **Name** and choose the **Exam type**: **Internal**, **Mid-term**, **Final**, **Practical** or **Viva**.
4. Choose the **Class**, the **Term** and the **Status**: **scheduled**, **ongoing** or **completed**.
5. Set the **Start date** and **End date**.
6. Select **Create exam**.

An "Exam created" message appears. The checks are "Name is required", "Select a term", "Select a class", "Start date is required" and "End date is required".

## Add subject schedules

1. Choose the exam in the subject schedules section on the same tab.
2. Select **Add subject**.
3. Choose the **Subject** and set the **Date**, **Start time** and **End time**.
4. Set **Max marks** (at least 1) and **Pass marks** (not negative). They start at 100 and 35. A **Room** is optional.
5. Select **Add subject schedule**. A "Subject schedule added" message appears.

## Enter marks

1. Open the **Marks Entry** tab.
2. Under **Select exam and subject**, choose the exam and then the subject.
3. For each student, type the **Marks obtained**, or tick **Absent**.
4. Select **Save marks**.

A "Marks saved" message confirms it, or "Could not save marks" if it failed. Marks above the maximum are brought down to the maximum.

Grades, rankings, report cards and transcripts are on the **Results & Ranking**, **Report Cards** and **Transcript** tabs.

[Open Examinations](route:examinations.home)
