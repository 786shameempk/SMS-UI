---
id: teachers-assign
title: Assign subjects and class teachers, and keep lesson plans
module: teachers
kind: task
roles: [admin, principal]
access: public
route: teachers.list
summary: Give a teacher subjects to teach, name class teachers for sections, and write a lesson plan.
order: 10
status: reviewed
tasks:
  - id: assign-teacher-subject
    label: Assign a subject to a teacher
    phrases: [assign subject to teacher, give a teacher a subject, teacher subject assignment]
    route: teachers.list
  - id: assign-class-teacher
    label: Assign class teachers
    phrases: [assign class teacher, make a class teacher, class teacher for a section]
    route: teachers.list
  - id: write-lesson-plan
    label: Write a lesson plan
    phrases: [write a lesson plan, new lesson plan, weekly lesson plan, add lesson plan]
    route: teachers.list
keywords: [teacher, subject, class teacher, section, lesson plan, week]
---

## Assign a subject

1. Open **Teachers** from the menu. The page is headed **Teacher management**.
2. On the teacher's row, open the actions menu and choose **Assign subject**.
3. Choose the **Class** and the **Subject** ("Select a class", "Select a subject") and select **Assign**.

A "Subject assigned" message confirms it.

## Assign class teachers

1. Select **Assign class teachers**. The dialog says: "Pick a teacher to be the class teacher for each section."
2. Choose a teacher for each section.

Messages "Class teacher assigned" and "Class teacher removed" confirm changes.

## Write a lesson plan

1. Open the teacher's profile and open the **Lesson Plans** tab.
2. Select **New lesson plan**.
3. Choose the **Class** and **Subject**, enter a **Title** and **Description**, and set the **Week of**. An **Attachment note** is optional.
4. Set the **Status** to draft or published and save.

A "Lesson plan created" message appears. The checks are "Title is required", "Description is required" and "Week is required". Plans can be edited ("Lesson plan updated") or deleted ("Lesson plan deleted").

The profile also has tabs for **Overview**, **Qualifications & Experience**, **Salary**, **Attendance**, **Performance**, **Documents**, **Subjects & Classes** and **Student Performance**.

## Subjects & Classes on the profile

On a teacher's profile, the **Subjects & Classes** tab lists their assignments. Select **Assign subject** to add one, and the remove button on a row, then confirming **Remove assignment**, to take one away.


[Open Teachers](route:teachers.list)
