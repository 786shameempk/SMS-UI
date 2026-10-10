---
id: staff-join-promote-resign
title: Add a staff member, promote them or record a resignation
module: staff
kind: task
access: public
route: staff.list
summary: Onboard a new member of staff, change their designation, record that they have left, or reactivate them.
order: 20
status: reviewed
related: [staff-leave-requests, users-add]
tasks:
  - id: add-staff
    label: Add a staff member
    phrases: [add a staff member, new staff joining, new joining, register staff, onboard a teacher, add an employee]
    route: staff.list
  - id: promote-staff
    label: Promote a staff member
    phrases: [promote a staff member, change designation, staff promotion]
    route: staff.list
  - id: staff-resign
    label: Record a resignation
    phrases: [record a resignation, staff resigned, staff leaving the school, reactivate staff]
    route: staff.list
keywords: [staff, joining, promote, designation, resignation, reactivate, department, last working date]
---

## Add a staff member

1. Open **Staff Management** from the menu. The page is headed **Staff management**; stay on the **Staff** tab.
2. Select **New joining**. The dialog says "Onboard a new staff member."
3. Choose the **Branch**, then enter the **First name**, **Last name**, **Date of birth** and **Gender**.
4. Choose the **Designation** and enter the **Department**.
5. Enter the **Phone**, **Email** and **Address**.
6. Select **Add staff member** ("Staff member added").

All fields are required: "Select a branch", "First name is required", "Last name is required", "Date of birth is required", "Department is required", "Phone is required", "Email is required" (or "Enter a valid email") and "Address is required".

Adding a staff member does not give them a login. Create one in [Add a user and manage their account](help:users-add), then link it from the **Login** tab of the staff profile (administrators).

## Promote

On the staff member's row, open the actions menu and choose **Promote**. Choose the **New designation**, set the **Effective date** (required) and optional **Remarks**, and select **Promote** ("… promoted").

## Record a resignation or reactivate

- Choose **Record resignation**, enter the **Last working date** and a **Reason** (both required) and select **Confirm resignation** ("… marked as resigned").
- For someone who has resigned, **Reactivate** brings them back ("… reactivated").

## The staff profile

**View profile** opens tabs for **Overview**, **Qualifications & Experience**, **Salary**, **Attendance**, **Performance** and **Documents**.

[Open Staff Management](route:staff.list)
