---
id: online-exams-monitor-reports
title: Monitor a proctored exam, import questions and read exam reports
module: online-exams
kind: task
roles: [admin, principal, teacher]
access: public
route: online-exams.dashboard
summary: Watch candidates during a proctored exam and decide on flagged events, import questions from a CSV file, and see how each exam went question by question.
order: 40
status: reviewed
related: [online-exams-create, online-exams-bank-evaluate]
tasks:
  - id: monitor-exam
    label: Monitor a proctored exam
    phrases: [monitor exam, proctoring, live candidates, flagged student, tab switch, misconduct, cheating, appeal]
    route: online-exams.dashboard
  - id: import-questions-csv
    label: Import questions from a CSV file
    phrases: [import questions, upload questions csv, question import template, bulk add questions]
    route: online-exams.question-bank
  - id: read-exam-reports
    label: Read exam reports
    phrases: [exam report, question analysis, which questions students got wrong, exam statistics, class average]
    route: online-exams.reports
keywords: [monitor, proctor, camera snapshot, warning, misconduct, appeal, import questions, csv, reports, question analysis, dashboard]
---

## Exam Dashboard

**Exam Dashboard** is the home of the module. **Summary** shows **Total exams**, **Drafts**, **Live now**, **Completed**, **Students appeared**, **Average score** and the numbers who **Passed** and **Failed**. **Upcoming & live** lists the next exams, and **Quick actions** includes **Create exam**. **Evaluate →** jumps to answers waiting for marks.

## Monitor a proctored exam

1. Open **Online Exams** > **Exams**, open the exam and select **Monitor**.
2. The page refreshes every 10 seconds. It lists the **Candidates** with a status: **Not started**, **Taking the exam** or **Submitted**. It also shows whether each is **Connected** or **Not connected**, and when they were last seen.
3. A row shows the incident and warning counts. Select a candidate to open the **Timeline** of recorded events. A **Camera snapshot** can be shown with **Show photo**.
4. Decide on a flagged candidate. Write a **Decision note**, which is required for a warning, misconduct or an appeal reply. Then choose **Clear**, **Warning** or **Misconduct**. If the student has appealed, choose **Accept appeal** or **Keep decision**. A message says **Decision saved**.

If the exam is not proctored, the page says so and shows only progress.

> **Important:** Events show what the browser reported. A tab switch could be a notification. Treat events as reasons to look, not as proof.

## Import questions from a CSV file

You can import in the **Question Bank** and when adding questions to an exam.

1. Select **Import questions**.
2. Select **Download template** to get the file, then fill in one question per row. The columns are type, question, marks, difficulty, topic, options (`A|B|C`), correct (`B` or `A|C`), answers, explanation, model_answer and tags.
3. Choose the CSV file, or paste the rows under **…or paste CSV**. In the question bank, also choose the subject and class.
4. Every row is checked before import and problems are listed. Select **Import** to bring in the valid rows. A message says how many questions were imported.

## Read exam reports

1. Open **Online Exams** > **Exam Reports** and choose an exam under **Choose an exam**. Reports appear once students have submitted.
2. See **Students appeared** out of those assigned, the class average and average marks.
3. **Question analysis** shows correct, incorrect and skipped answers for every question.
4. **Worth revisiting** lists the questions fewest students got right.

[Open Online Exams](route:online-exams.dashboard)
