---
id: academic-setup-departments-subjects
title: Set up departments, subjects and class capacity
module: academic-setup
kind: task
roles: [admin, principal]
access: public
route: academic-setup.home
summary: Create departments or streams and choose their head and members, add subjects and link them to classes, merge two sections, and check seats against capacity.
order: 20
status: reviewed
related: [academic-setup-structure, teachers-assign]
tasks:
  - id: create-department
    label: Create a department
    phrases: [create department, add department, add stream, department head, set department head, reporting person]
    route: academic-setup.home
  - id: create-subject
    label: Add a subject
    phrases: [add subject, create subject, new subject, link subject to class, core subject, elective subject]
    route: academic-setup.home
  - id: check-class-capacity
    label: Check class capacity
    phrases: [class capacity, seats available, section strength, how many seats left, full section, merge sections]
    route: academic-setup.home
keywords: [department, stream, head, employee, reporting person, subject, code, core, elective, capacity, seats, merge sections]
---

These tabs on the **Academic Setup** page sit beside the ones in [Set up academic years, terms, classes and sections](help:academic-setup-structure). Do that first, because subjects link to classes.

## Create a department

Departments or streams group classes, for example Primary, Secondary, Science or Commerce.

1. Open **Academics** > **Academic Setup** and select the **Departments** tab.
2. Select **New department**.
3. Enter the **Name** (for example Science) and a **Code** (for example SCI). Add a **Description** if you like.
4. Leave **Active** ticked. Inactive departments cannot take new members.
5. Select **Create department**. A message says **Department created**.

To change one later, select **Edit** on its row, then **Save changes**. **Delete** asks you to confirm because it is permanent.

## Choose the head and the people

1. On the department's row, open **Head and employees**.
2. Under **Department head**, choose a person or **No head**, then select **Save head**. The department must be active to change its head.
3. Under **Employees**, pick someone from **Add an employee…** and select **Add**.
4. For each employee, set the **Reporting person**. Choose **Administrators (no reporting person)** if nobody sits above them.

> **Note:** Profile changes go for approval to a person's reporting person, or to the department head. See [View and update your profile](help:account-my-profile).

## Add a subject

Subjects are core or elective and can be linked to one or more classes.

1. Open the **Subjects** tab and select **New subject**.
2. Enter the **Name** (for example Mathematics) and the **Code** (for example MATH).
3. Choose the **Type**.
4. Under **Classes**, tick every class that studies it.
5. Save. A message says **Subject created**. Use **Edit** or **Delete** on the row to change it later.

Teachers are attached to subjects in [Assign subjects and class teachers](help:teachers-assign).

## Check class capacity

1. Open the **Class Capacity** tab. **Overall enrollment** shows total students against total seats.
2. Use **Filter by class** to look at one class. For each section you see **Capacity**, **Enrolled** and **Utilization**.
3. The **Status** badge reads **Available**, **Near capacity** (75% or more) or **Full** (100%).

## Merge two sections

On the **Classes & Sections** tab, select **Merge sections**.

1. Choose the **Class**.
2. Choose the section to **Keep** and the section to **Merge into it**.
3. Select **Merge** and confirm with **Confirm section merge**.

> **Warning:** A merge cannot be undone, and the screen says student records are not moved automatically. Check the students of both sections afterwards.

[Open Academic Setup](route:academic-setup.home)
