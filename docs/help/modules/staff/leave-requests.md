---
id: staff-leave-requests
title: Request leave and approve staff leave
module: staff
kind: task
access: public
route: staff.list
summary: Staff request leave; people who manage staff approve or reject pending requests.
order: 10
status: reviewed
tasks:
  - id: request-staff-leave
    label: Request leave
    phrases: [request leave, apply for leave, staff leave, take a day off, sick leave, casual leave]
    route: staff.list
  - id: approve-staff-leave
    label: Approve or reject staff leave
    phrases: [approve leave, reject leave, pending leave requests, staff leave approval]
    route: staff.list
keywords: [leave, sick, casual, earned, unpaid, approve, reject, pending, HR]
---

Use this to ask for leave, or to decide on leave that staff have asked for.

## Request leave

1. Open **Staff Management** from the menu and select the **Leave Requests** tab.
2. Select **Request leave**. People who manage staff see **New leave request** instead, and can record leave for any staff member.
3. In **New leave request**, choose the **Type**: **Sick leave**, **Casual leave**, **Earned leave** or **Unpaid leave**.
4. Set **From** and **To**, and type a **Reason**.
5. Select **Submit request**.

A "Leave request created" message appears. A request you make for yourself goes to HR for approval.

The checks are "Select a staff member", "Start date is required", "End date is required" and "Reason is required".

> **Note:** If your login is not linked to a staff record, the screen tells you to ask an administrator to link it, and **Submit request** stays off.

## Approve or reject

People who can manage staff see **Approve** and **Reject** on each request whose status is pending. Choosing one updates the request and shows a message with the staff member's name and the new status.

[Open Staff Management](route:staff.list)
