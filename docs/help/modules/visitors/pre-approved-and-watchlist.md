---
id: visitors-preapproved-watchlist
title: Schedule a pre-approved visit and manage the watchlist
module: visitors
kind: task
access: public
route: visitors.home
summary: Schedule an expected visitor so the front desk can check them in on arrival, and keep a security watchlist.
order: 20
status: reviewed
related: [visitors-check-in]
tasks:
  - id: schedule-visit
    label: Schedule a pre-approved visit
    phrases: [pre approve a visitor, schedule a visit, visitor appointment, expected visitor, pre-approved visit]
    route: visitors.home
  - id: add-watchlist
    label: Add someone to the visitor watchlist
    phrases: [visitor watchlist, add to watchlist, block a visitor, flag a visitor]
    route: visitors.home
keywords: [visitor, appointment, pre-approved, watchlist, security, scheduled]
---

## Schedule a pre-approved visit

1. Open **Visitors** and select the **Pre-Approved Visits** tab, then **Schedule visit**. The dialog says the front desk can check the visitor in on arrival against this appointment.
2. Enter the **Visitor name** and **Phone**, choose the **Purpose**, and set **Scheduled for**.
3. Under **Here to see**, choose a student, a staff member or somewhere else, and pick who or where. **Notes** are optional.
4. Select **Schedule visit** ("Visit scheduled").

The checks are "Visitor name is required", "Phone number is required" and "Scheduled date/time is required".

When the visitor arrives, choose **Check in now** on the visit ("… checked in — badge …"). A visit can also be cancelled ("Visit cancelled") or deleted ("Pre-approval deleted"). For a visitor who has no appointment, see [Check a visitor in and out](help:visitors-check-in).

## Watchlist

1. Open the **Watchlist** tab and select **Add to watchlist**. The dialog says the front desk sees a warning if this name is entered during check-in.
2. Enter the **Name** and a **Reason** (both required: "Name is required", "Reason is required"). **Phone** is optional.
3. Select **Add to watchlist** ("Added to watchlist").

To take someone off, choose the remove option on their row and confirm **Remove from watchlist** ("Removed from watchlist").

The **Reports** tab shows **Visits by purpose** and **Most-visited hosts**.

[Open Visitors](route:visitors.home)
