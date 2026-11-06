---
id: students-promotion-graduation
title: Promote a class to the next year and graduate the final class
module: students
kind: task
roles: [admin, principal]
access: public
route: students.list
summary: At year end, move every active student of a section to the next class, and move a final-year class to alumni.
order: 60
status: reviewed
related: [academic-setup-structure, students-edit-transfer]
tasks:
  - id: promote-students
    label: Promote students to the next class
    phrases: [promote students, promotion, move class to next year, year end promotion, next class]
    route: students.list
  - id: graduate-students
    label: Graduate a class
    phrases: [graduate students, graduation, alumni, final year class, pass out]
    route: students.list
keywords: [promotion, graduation, alumni, next class, year end, section]
---

Teachers do not see the **Promotion & Graduation** tab. Administrators and principals do.

## Before you start

- Create the next academic year, and the target class and section, in [Academic Setup](help:academic-setup-structure).
- Clear fee dues and record any transfers first. See [Edit a student or mark a student as transferred](help:students-edit-transfer).

## Promote a section

1. Open **Academics** > **Students** and select **Promotion & Graduation**.
2. In **Promote students**, choose **From class** and **Section**.
3. Choose **To class** and the target **Section**. The two sections must differ, or the screen says **Source and target sections must differ.**
4. Select **Promote** and confirm. The confirmation says how many students will move from one section to the other.
5. A message reports how many students were promoted.

Repeat for each section. It moves every active student of the section.

## Graduate the final class

1. In **Graduate students**, choose the class under **Graduate class**.
2. Select **Graduate** and confirm. The confirmation says how many students will be marked as graduated.
3. A message reports how many students graduated.

> **Warning:** Graduation moves all active students in the class to alumni status. Check the class before you confirm.

[Open Students](route:students.list)
