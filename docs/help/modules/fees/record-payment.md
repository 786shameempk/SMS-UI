---
id: fees-record-payment
title: Record a fee payment
module: fees
kind: task
access: public
route: fees.home
summary: Record a payment against a student's invoice and generate a receipt.
order: 20
status: reviewed
related: [fees-generate-invoices]
tasks:
  - id: record-fee-payment
    label: Record a fee payment
    phrases: [record payment, collect fee, receive fee payment, pay fees, fee received, take a payment]
    route: fees.home
keywords: [invoice, receipt, cash, card, online, cheque, balance due, discount, installments, refund]
---

Use this when a student's family pays, to record it and produce a receipt.

## Steps

1. Open **Fee Management** and select the **Student Invoices** tab.
2. Find the invoice. You can filter by class and by status.
3. Open the actions menu on the invoice row and choose **Record payment**. This option is not shown once the invoice is paid.
4. The dialog shows the term, the fee type and the **Balance due**. Choose the **Payment mode**: **Cash**, **Card**, **Online** or **Cheque**.
5. Enter the **Amount**. It must be greater than zero.
6. Select **Record payment**.

A "Payment recorded and receipt generated" message appears. The receipt is on the **Receipts** tab.

## Other actions on an invoice

| Action | When it is offered |
|---|---|
| **Apply discount** | Always. A "Discount applied" message confirms it. |
| **Generate installments** | When the fee is not one-time, has no installments yet, and is not paid. |
| **Refund** | When something has been paid. It submits a refund request ("Refund request submitted"); see the **Refunds** tab. |

> **Note:** If a payment cannot be recorded, the message is the server's, or "Could not record payment".

[Open Fee Management](route:fees.home)
