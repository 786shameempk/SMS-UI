---
id: fees-previous-dues
title: Add and collect previous dues
module: fees
kind: task
access: public
route: fees.home
summary: Record old balances from earlier years or from before the school used School Sphere, then collect payments against them.
order: 40
status: reviewed
related: [fees-record-payment, fees-generate-invoices]
tasks:
  - id: add-previous-dues
    label: Add previous dues
    phrases: [previous dues, old balance, opening balance, arrears, add old fees, carry forward dues, dues from last year, pending fees from earlier year]
    route: fees.home
keywords: [previous dues, arrears, balance, opening balance, bulk, receipt]
---

Use this when students owe money from an earlier year, or from before your school started using School Sphere, and you want those balances tracked and collected alongside normal fees.

## Add previous dues

1. Open **Fee Management** and choose the **Previous dues** tab. It reads "Old balances from earlier years, or from before your school used SchoolSphere", followed by the number of records.
2. Select **Add previous dues**.
3. Type a **Name of these dues**, for example `2023-24 balance`. The name groups the entries; adding the same name for a student twice is skipped.
4. Set the **Due date**.
5. Under **Add a student**, search by name or admission number and pick each student. Type the **Amount** due for every student. Select **Remove** to drop one.
6. Check the summary line ("N student(s), total ...") and select **Add previous dues**.

A message such as "3 previous dues added" or "2 added, 1 skipped (already recorded under this name)" confirms the result.

Errors you may see: "Enter a name for these dues", "Due date is required", "Add at least one student", and "Enter an amount greater than zero for every student".

## Collect a payment

On the **Previous dues** tab the list shows each student, the **Dues from** name, **Amount**, **Due date** and **Status**. Select **Record payment** on a row, enter the payment, and confirm. "Payment recorded and receipt generated" appears and the row shows how much is paid. The receipt is also listed under **Receipts**.

[Open Fee Management](route:fees.home)
