---
id: online-exams-bank-evaluate
title: Build a question bank, evaluate answers and publish results
module: online-exams
kind: task
roles: [admin, principal, teacher]
access: public
route: online-exams.question-bank
summary: Keep reusable questions, mark written answers, and publish results to students.
order: 30
status: reviewed
related: [online-exams-create, online-exams-take]
tasks:
  - id: add-bank-question
    label: Add a question to the question bank
    phrases: [add a question, question bank, new question, import questions, upload questions csv]
    route: online-exams.question-bank
  - id: evaluate-answers
    label: Evaluate student answers
    phrases: [evaluate answers, mark written answers, pending evaluation, grade online exam, check descriptive answers]
    route: online-exams.evaluations
  - id: publish-exam-results
    label: Publish online exam results
    phrases: [publish exam results, release online exam results, show results to students, publish results]
    route: online-exams.results
keywords: [question bank, question, marks, evaluation, pending, publish results, csv, difficulty, tags, topic]
---

## Question bank

The **Question bank** page holds reusable questions for your subjects. Exams copy a question when it is added, so editing a question here never changes an exam that has already been set.

1. Open **Question Bank** in the **Online Exams** menu.
2. Select **Add question**. Choose the **Subject**, and optionally a **Class**, **Chapter / topic** and **Tags** (comma separated). Choose the **Difficulty**.
3. Choose the **Question type**, set the **Marks**, and type the **Question**. What else you fill in depends on the type: options with the correct one marked, a **Correct answer** for true or false, **Accepted answers** for fill in the blank (any one counts as correct; use underscores to show the blank), or an **Expected answer** for written answers (a guide for the teacher, not an exact match).
4. Save. A message says "Question added to the bank".

Other buttons are **Import CSV** and, where the school has AI on, **Generate with AI**. Filter by **Subject**, **Class**, **Topic**, **Difficulty** and **Question type**, and use **Clear filters** to reset. Selecting questions lets you delete them; exams that already use them keep their own copy.

## Evaluate answers

Written answers need a teacher's marks.

1. Open **Evaluations**. The page is headed **Pending evaluation**; if nothing is waiting it says "All caught up".
2. Choose **Start evaluating** on an exam.
3. For each answer that needs marks, enter the marks (between 0 and the question's marks) and an optional comment. Answers marked automatically show "Auto-marked".
4. Select **Save**, or **Save & next student** to move on. For the last one the button reads **Complete evaluation**; it stays off while any answer still needs marks.

## Results and publishing

1. Open **Results**, or an exam's **Results** from its row. The page shows how many students took it, **Passed**, **Failed** and the **Average score**.
2. **Analysis** opens exam reports, **Export CSV** downloads the results, and **Print** opens a printable sheet (allow pop-ups if asked).
3. Select **Publish results** and confirm **Publish results?**. Students see their marks and are notified straight away. If answers still need evaluation, the dialog says so.

[Open the Question Bank](route:online-exams.question-bank)
