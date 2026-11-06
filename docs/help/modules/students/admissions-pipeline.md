---
id: students-admissions
title: Take an applicant through admissions
module: students
kind: task
access: public
route: students.list
summary: Record an inquiry and move the applicant through registration, entrance exam, interview and fee collection until you enrol them.
order: 40
status: reviewed
related: [students-register, students-bulk-import]
tasks:
  - id: new-admission-inquiry
    label: Record an admission inquiry
    phrases: [admission inquiry, new inquiry, new applicant, admissions, applicant, entrance exam, interview, waitlist, enroll applicant]
    route: students.list
keywords: [admissions, inquiry, registration, entrance exam, interview, fee collection, enrolled, waitlisted, rejected, withdrawn, applicant]
---

The **Admissions** tab tracks each applicant through stages: **Inquiry**, **Registration**, **Entrance Exam**, **Interview**, **Fee Collection** and **Enrolled**. An applicant can also end as **Waitlisted**, **Rejected** or **Withdrawn**. To enrol a student without this pipeline, use [Register a student](help:students-register).

## Before you start

- Create the classes and sections the applicant will join in [Academic Setup](help:academic-setup-structure).
- Open **Academics** > **Students** and select the **Admissions** tab.

## Add an applicant

1. Select **New inquiry**.
2. Fill in the applicant and the **Applied class**, then save. The applicant appears in the list at **Inquiry**.
3. Use the stage filter, **All stages**, to narrow the list.

## Move the applicant along

Each row offers the action for its current stage:

1. **Register** moves an inquiry to **Registration**. A message says **Application registered**.
2. **Edit exam details** records the **Entrance exam**. A message says **Entrance exam updated**.
3. **Edit interview details** records the **Interview**. A message says **Interview updated**.
4. **Decide** records the decision. Use **Reject** to mark the application **Rejected**.
5. **Record fee** records the admission fee payment. A message says **Fee payment recorded**.
6. **Promote** takes someone from the waitlist to fee collection.
7. **Enroll** turns the applicant into a student. A message says the applicant is enrolled with an admission number.
8. **Withdraw** marks an application **Withdrawn**.
9. **View student** opens the new student record.

> **Note:** If a parent sign-in account could not be created, the message says it **needs attention**. Open the student's profile and link or create the login under [Logins](help:students-profile).

[Open Students](route:students.list)
