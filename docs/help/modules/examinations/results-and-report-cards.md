---
id: examinations-results-report-cards
title: See results and rankings, write report card remarks and view a transcript
module: examinations
kind: task
roles: [admin, principal, teacher]
access: public
route: examinations.home
summary: Review an exam's grades and ranking, add remarks to a student's report card, and see a student's transcript.
order: 20
status: reviewed
related: [examinations-schedule-and-marks]
tasks:
  - id: exam-results-ranking
    label: See exam results and rankings
    phrases: [exam results, exam ranking, class ranking, see results of an exam, grades for an exam]
    route: examinations.home
  - id: report-card
    label: Open a report card
    phrases: [report card, student report card, add remarks to report card, report card remarks]
    route: examinations.home
  - id: student-transcript
    label: View a transcript
    phrases: [student transcript, view a transcript, academic transcript, all exam results for a student]
    route: examinations.home
keywords: [results, ranking, grade, GPA, report card, remarks, transcript, percentage]
---

Results appear after marks have been saved; see [Create an exam, schedule subjects and enter marks](help:examinations-schedule-and-marks).

## Results and ranking

1. Open **Examinations** and select the **Results & Ranking** tab.
2. Choose an exam in **Select an exam**.
3. The list shows each student's **Rank**, **Admission No.**, **Student**, **Section**, **Total**, **Percentage**, **Grade** and **GPA**.

Where the school has AI on, **Draft remarks with AI** opens a dialog that drafts remarks for the class. Read them before using them.

## Report cards

1. Open the **Report Cards** tab. Under **Select student and exam**, choose the student and the exam.
2. The report card lists each subject with **Marks obtained** (or Absent), **Max marks** and **Grade**, and a **Total**.
3. Type teacher or principal comments in **Remarks** and select **Save remarks** ("Remarks saved").

## Transcript

Open the **Transcript** tab and choose a student. It lists that student's exam results. Until you choose, it says "Select a student to view their transcript."; if there are none, "No exam results recorded for this student yet."

[Open Examinations](route:examinations.home)
