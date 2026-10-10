---
id: homework-assign
title: Assign homework to a class
module: homework
kind: task
roles: [admin, principal, teacher]
access: public
route: homework.manage
summary: Create homework for a class or one section, publish it, and review what students hand in.
order: 10
status: reviewed
related: [homework-submit]
tasks:
  - id: assign-homework
    label: Assign homework
    phrases: [assign homework, give homework, create homework, set homework, new assignment, post an assignment]
    route: homework.manage
  - id: grade-homework
    label: Review homework submissions
    phrases: [grade homework, check homework submissions, see who submitted homework, mark homework]
    route: homework.manage
keywords: [homework, assignment, subject, class, section, due date, draft, published, submissions]
---

Use this to give a class homework for a subject.

## Steps

1. Open **Homework** from the **Academics** menu. The page is headed **Homework & assignments**; stay on the **Homework** tab.
2. Select **New homework**.
3. Enter a **Title** (up to 200 characters) and a **Description** (up to 2000 characters).
4. Choose the **Class**. Choose a **Section** if only one section should get it; this is optional.
5. Choose the **Subject** and who it was **Assigned by**.
6. Set the **Assigned date** and **Due date**. An **Attachment note** is optional.
7. Set the **Status** to **Draft** while you are still working on it, or **Published** to give it to students.
8. Select **Create homework**.

A "Homework created" message confirms it.

| Field | What is checked |
|---|---|
| **Title** | "Title is required"; "Title can be at most 200 characters". |
| **Description** | "Description is required"; "Description can be at most 2000 characters". |
| **Class** | "Select a class". |
| **Subject** | "Select a subject". |
| **Assigned by** | "Select a teacher". |
| **Assigned date** | "Assigned date is required". |
| **Due date** | "Due date is required". |

## Review submissions, edit or delete

On the homework's row, open the actions menu:

- **View / grade submissions** opens what students handed in.
- **Edit** changes the homework ("Homework updated").
- **Delete** removes it ("Homework deleted").

[Open Homework](route:homework.manage)
