---
id: store-permissions
title: Who can do what in the store
module: store
kind: reference
access: admin
roles: [admin, principal]
route: store.home
summary: The store permissions a school can give each role, and how they hide tabs and buttons.
order: 70
status: draft
related: [store-overview]
tasks:
  - id: store-permissions
    label: Give a role access to the store
    phrases: [store permissions, store manager role, store keeper role, who can approve purchases, store roles]
    route: store.home
keywords: [permission, role, store manager, keeper, purchase approver, accountant, approve, issue, receive, sell]
---

Store access is given in **Roles & Permissions**. Turning on the **Store Management** module lets a role see the menu; the store **actions** decide what it can do. Nothing is based on the role's name, so a school can build its own roles (Store Manager, Store Keeper, Purchase Manager, Purchase Approver, Accountant, Department Head, Authorised Staff) from these actions:

| Action | Allows |
|---|---|
| View | See stores, items, stock, movements, suppliers, orders and the dashboard |
| Request | Raise purchase requisitions and item requests (the default for teachers) |
| Create | Create items, categories, suppliers, requisitions, orders, invoices and payments |
| Edit | Change those records, store rules, and selling prices at the counter |
| Delete | Delete or deactivate records, cancel invoices |
| Approve / Reject | Decide requisitions, item requests, goods receipts and returns |
| Issue | Issue and bulk-issue items |
| Receive | Record goods received |
| Transfer | Move stock between stores |
| Sell | Sell from the store and collect payments |
| Return | Record returns |
| Adjust | Stock adjustments and physical counts |
| Reports / Export | Open reports and the audit trail / export and print whole reports |

Menu entries and buttons a person cannot use are hidden, and the server refuses them as well. People assigned to a store (on **Stores & Warehouses**) can only work in their own stores.
