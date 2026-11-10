---
id: store-issues-and-returns
title: Issue items to people and places, and take returns
module: store
kind: task
access: public
roles: [admin, principal, teacher]
route: store.issues
summary: Issue items to students, staff, departments, classes or labs, request items for approval, and record returns.
order: 40
status: draft
related: [store-permissions, store-stock-control]
tasks:
  - id: issue-items
    label: Issue items to a student, teacher or department
    phrases: [issue items, give items, distribute, bulk issue, hand over, issue to student, issue to department]
    route: store.issues
  - id: request-items
    label: Request items from the store
    phrases: [request items, item request, ask the store, need stationery]
    route: store.issues
  - id: record-return
    label: Record a return
    phrases: [return items, item return, supplier return, return to supplier, damaged return, sale return]
    route: store.returns
keywords: [issue, distribution, request, approval, returnable, return, damaged, supplier return, bulk issue]
---

## Issue or request

Open **Item Issue / Distribution**. Someone who can issue selects **Issue items**; stock leaves the store at once. Everyone else selects **Request items**, and the request waits for an approver. If the school requires approval, every issue is a request first: an approver selects **Approve**, then a store keeper selects **Hand over and issue**.

Choose who the items are for (student, teacher, non-teaching staff, department, class, laboratory, other facility), the purpose, and whether the items are **returnable** and when they are due back. **Bulk issue** gives the same items to many recipients, each with their own record; if stock runs short, nothing is issued.

## Returns

Open **Returns** and select **New return** (or **Record a return** on an issue).

- **Issued item returned**: choose the issue and how much of each item is coming back.
- **Sale return**: choose the sale.
- **Return to supplier**: choose the store, the supplier and the items; a reason is required.

Each line has a **condition**. **Good** goes back on the shelf. **Damaged** and **Expired** are written off (both movements are recorded). **Lost** is written off without a stock movement. Stock changes when the return is **approved**; a rejected return changes nothing. You cannot return more than is outstanding, and non-returnable issues cannot be returned.
