---
id: hostel-daily-operations
title: Hostel attendance, visitors, fees and the mess menu
module: hostel
kind: task
access: public
route: hostel.home
summary: Take hostel attendance, log hostel visitors, generate and collect hostel fees, and edit the weekly mess menu.
order: 20
status: reviewed
related: [hostel-allocate-student]
tasks:
  - id: hostel-attendance
    label: Mark hostel attendance
    phrases: [hostel attendance, mark hostel attendance, night roll call, hostel roll call]
    route: hostel.home
  - id: hostel-visitor
    label: Log a hostel visitor
    phrases: [hostel visitor, log a hostel visitor, visitor to hostel student]
    route: hostel.home
  - id: hostel-fees
    label: Generate hostel fees
    phrases: [hostel fees, generate hostel fees, collect hostel fee, hostel fee paid]
    route: hostel.home
  - id: edit-mess-menu
    label: Edit the mess menu
    phrases: [mess menu, edit mess menu, hostel food menu, change meal menu]
    route: hostel.home
keywords: [hostel, attendance, visitor, fees, mess menu, meal, resident]
---

All of these are tabs on the **Hostel** page (**Hostel management**).

## Hostel attendance

1. Open the **Hostel Attendance** tab.
2. Choose the **Hostel** and the **Date**.
3. Use **Mark all present**, then change the exceptions.
4. Select **Save attendance** ("Hostel attendance saved").

## Visitor register

1. Open the **Visitor Register** tab and select **Check in visitor**. The dialog logs a visitor against the resident student they are here to see.
2. Choose the **Hostel** and the **Resident student**, then enter the **Visitor name**, **Relation** and **Phone**. **Purpose** is optional.
3. Select **Check in** ("Visitor checked in").
4. When they leave, choose **Check out** on their row ("Visitor checked out").

The checks are "Select a hostel", "Select a student", "Visitor name is required", "Relation is required" and "Phone number is required".

## Hostel fees

1. Open the **Hostel Fees** tab, choose the **Month**, and select **Generate for month**. A message says how many fee records were generated, or that every active allocation already has one.
2. When a fee is paid, choose **Mark paid** on its row ("Payment marked paid").

## Mess menu

1. Open the **Mess Menu** tab and choose the **Hostel**.
2. Select a day and meal in the grid. The dialog is titled with the day and meal, and says to edit the menu items served for this meal.
3. Enter the **Menu items** ("Enter at least one menu item") and select **Save** ("Menu updated").

[Open Hostel](route:hostel.home)
