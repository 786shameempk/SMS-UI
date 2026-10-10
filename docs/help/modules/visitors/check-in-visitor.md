---
id: visitors-check-in
title: Check a visitor in and out
module: visitors
kind: task
access: public
route: visitors.home
summary: Record a visitor at the front desk, issue a badge, and check them out when they leave.
order: 10
status: reviewed
tasks:
  - id: check-in-visitor
    label: Check in a visitor
    phrases: [check in a visitor, register a visitor, visitor entry, front desk visitor, issue visitor badge]
    route: visitors.home
  - id: check-out-visitor
    label: Check out a visitor
    phrases: [check out a visitor, visitor leaving, visitor exit, sign out a visitor]
    route: visitors.home
keywords: [visitor, badge, front desk, host, purpose, watchlist, pre-approved]
---

Use this at the front desk to log everyone who visits the school.

## Check in

1. Open **Visitors** from the menu. The page is headed **Visitor Management**; stay on the **Visitor Log** tab.
2. Select **Check in visitor**.
3. Enter the **Visitor name** and **Phone**.
4. Optionally add the **ID proof type** and **ID proof number**.
5. Choose the **Purpose of visit**, and add **Notes** if useful.
6. Under **Here to see**, choose a student, a staff member, or somewhere else. Then pick the person, or describe the place in **Where / department**.
7. Select **Check in**.

The dialog says this issues a badge number and starts the visit. A message shows the visitor's name and badge number.

The checks are "Visitor name is required", "Phone number is required", "Select who they're visiting" and "Describe who or where they're visiting".

## Check out

On the visitor's row, open the actions menu and choose **Check out**. A message confirms it. **Delete** removes an entry from the log.

## Other tabs

**Pre-Approved Visits** holds scheduled appointments, **Watchlist** the security watchlist, and **Reports** the visitor reports.

[Open Visitors](route:visitors.home)
