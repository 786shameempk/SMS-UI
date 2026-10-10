---
id: students-register
title: Register a student
module: students
kind: task
access: public
route: students.list
summary: Enrol a student directly, without going through the admissions pipeline.
order: 10
status: reviewed
related: [students-edit-transfer]
tasks:
  - id: register-student
    label: Register a student
    phrases: [add a student, register a student, enrol a student, enroll a student, new student, create a student record]
    route: students.list
keywords: [student, enrol, enroll, admission number, guardian, class, section, roll number]
---

Use this to put a student on the school's roll straight away. If the student is still applying, use the **Admissions** tab instead.

## Before you start

- You need access to the **Students** module. If **Students** is missing from your **Academics** menu, ask your school administrator.
- Have the student's class and section, date of birth, address and a guardian's name and phone number ready.
- The class and section must already exist for the branch you choose.

## Steps

![The Register student form with School, Student details, Class placement and Address & guardian sections.](shot:students-register-form-desktop "The Register student form.")

1. Open **Academics**, then **Students**. The page is headed **Student management**.
2. Stay on the **Students** tab and select **Register student**.
3. Under **School**, check the **Branch**.
4. Under **Student details**, fill in **First name**, **Last name**, **Date of birth** and **Gender** (Male, Female or Other).
5. Under **Class placement**, choose the **Class**, then the **Section**. Add a **Roll number** if you use one.
6. Under **Address & guardian**, fill in **Address**, **Guardian name**, **Relation** and **Guardian phone**.
7. If you have them, fill in **Student email** and **Parent email**. Both are optional and appear only when you are registering, not when you are editing.
8. Select **Register student**.

A "Student registered" message appears and the student is listed on the **Students** tab.

## Fields and checks

| Field | Required | What is checked |
|---|---|---|
| **Branch** | Yes | Shows "Select a branch" if empty. |
| **First name** | Yes | Shows "First name is required". |
| **Last name** | Yes | Shows "Last name is required". |
| **Date of birth** | Yes | Shows "Date of birth is required". |
| **Class** | Yes | Shows "Select a class". |
| **Section** | Yes | Shows "Select a section". |
| **Address** | Yes | Shows "Address is required". |
| **Guardian name** | Yes | Shows "Guardian name is required". |
| **Guardian phone** | Yes | Shows "Guardian phone is required". |
| **Student email** | No | Shows "Enter a valid email address" if it is not an email address. |
| **Parent email** | No | Shows "Enter a valid email address" if it is not an email address. |

> **Important:** Each email you enter creates a login automatically (a student login for **Student email**, a parent login for **Parent email**), linked to the student, and a temporary password is emailed to that address. Leave the emails empty if you do not want logins created yet.

> **Note:** If the school cannot save the student, the message shown is the one the server returns, or "Could not register student" when it returns none.

[Open Students](route:students.list)
