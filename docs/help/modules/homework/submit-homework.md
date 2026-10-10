---
id: homework-submit
title: Submit your homework
module: homework
kind: task
access: member
roles: [student, parent]
route: homework.mine
summary: See assigned homework for a student and hand in an answer.
order: 20
status: reviewed
related: [homework-assign]
tasks:
  - id: submit-homework
    label: Submit homework
    phrases: [submit homework, hand in homework, upload my homework, send my assignment, my homework]
    route: homework.mine
keywords: [my homework, resubmit, answer, student]
---

Use this to see homework and send your answer.

## Steps

1. Open **My Homework** from the menu. The page is headed **My homework**.
2. If you can see more than one student, choose one in **Select a student**.
3. On the **My Homework** tab, find the homework and select **Submit**. For homework you have already handed in, the button reads **View**.
4. Type your answer in **Your answer**. The submit button stays off until you have typed something.
5. Select **Submit**.

A "Homework submitted" message confirms it. If it fails, the message is the server's, or "Could not submit homework".

If your teacher asks for another attempt, the dialog says "Your teacher asked you to resubmit:" and the button reads **Resubmit**.

The **Resources** tab lists learning resources shared with the student.

[Open My Homework](route:homework.mine)
