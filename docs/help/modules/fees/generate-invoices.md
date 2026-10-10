---
id: fees-generate-invoices
title: Generate fee invoices for a term
module: fees
kind: task
access: public
route: fees.home
summary: Create invoices in bulk for every student covered by a fee structure.
order: 10
status: reviewed
related: [fees-record-payment]
tasks:
  - id: generate-invoices
    label: Generate fee invoices
    phrases: [generate invoices, create fee invoices, bill students, raise fees for a term, bulk invoices]
    route: fees.home
keywords: [fee structure, term, due date, academic year, invoice]
---

Use this to bill a whole class, or the whole school, for a term in one go.

## Before you start

- A fee structure must exist on the **Fee Structures** tab. Invoices are created from it.
- Have the academic year, the term and the due date decided.

## Steps

![Fee management with the Fee Structures, Discounts & Scholarships, Student Invoices, Receipts and Refunds tabs.](shot:fees-home-desktop "Fee management on the Fee Structures tab, with Generate invoices at the top right.")

1. Open **Fee Management** from the menu. The page is headed **Fee management**.
2. On the **Fee Structures** tab, select **Generate invoices**.
3. Choose the **Fee structure**, **Academic year** and **Term**, and set the **Due date**. All four are required.
4. Select **Generate invoices**.

The dialog explains that invoices are created for every active student covered by the fee structure: the structure's class, or all students if the structure has no class.

A message tells you how many invoices were generated, and how many already existed. If every student already has an invoice for that term, you see "No new invoices generated — they already exist for this term".

| Field | What is checked |
|---|---|
| **Fee structure** | Shows "Select a fee structure". |
| **Academic year** | Shows "Select an academic year". |
| **Term** | Shows "Select a term". |
| **Due date** | Shows "Due date is required". |

> **Note:** If it fails, the message shown is the server's, or "Could not generate invoices".

[Open Fee Management](route:fees.home)
