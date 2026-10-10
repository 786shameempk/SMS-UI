---
id: payroll-run
title: Run monthly payroll and pay payslips
module: payroll
kind: task
access: public
route: payroll.home
summary: Generate a month's draft payslips, finalize the run, and mark payslips as paid.
order: 10
status: reviewed
tasks:
  - id: run-payroll
    label: Run payroll
    phrases: [run payroll, generate payroll, process salaries, monthly salary, create payslips]
    route: payroll.home
  - id: pay-payslip
    label: Mark a payslip as paid
    phrases: [mark payslip paid, pay salary, pay a payslip, salary paid]
    route: payroll.home
keywords: [payroll, payslip, salary, month, finalize, draft run]
---

Use this to prepare and pay staff salaries each month.

## Generate the month's payroll

1. Open **Payroll** from the menu and stay on the **Payroll Runs** tab.
2. Select **Generate payroll**.
3. Choose the **Month** (required: "Month is required") and select **Generate**.

The dialog explains that it creates a draft payslip for every active or on-leave staff member who has not already been paid for that month, using their current salary structure. A message says how many payslips were generated, and how many were skipped because they were already paid.

## Finalize or remove a draft run

On the row of a draft run (finished runs have no actions), open the actions menu:

- **Finalize** closes the run ("… payroll finalized").
- **Delete** removes a draft run after you confirm in **Delete draft payroll run**. Its payslips are removed and it cannot be undone ("Draft run removed").

## Pay a payslip

1. Open the **Payslips** tab.
2. On the payslip's row, choose **Mark paid**. A message confirms who was paid and for which month.
3. Open a payslip to view it.

[Open Payroll](route:payroll.home)
