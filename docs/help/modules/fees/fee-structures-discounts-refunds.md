---
id: fees-structures-discounts-refunds
title: Set up fee structures and discounts, and handle refunds and receipts
module: fees
kind: task
access: public
route: fees.home
summary: Define what is charged, create discounts and scholarships, process refund requests and view receipts.
order: 30
status: reviewed
related: [fees-generate-invoices, fees-record-payment]
tasks:
  - id: create-fee-structure
    label: Create a fee structure
    phrases: [create a fee structure, add a fee, set up fees, new fee type, define school fees, late fine]
    route: fees.home
  - id: create-discount
    label: Create a discount or scholarship
    phrases: [create a discount, add a scholarship, fee concession, new discount, sibling discount]
    route: fees.home
  - id: process-refund
    label: Process a refund
    phrases: [process a refund, refund a fee, mark refund processed, refund request]
    route: fees.home
  - id: view-receipt
    label: View a receipt
    phrases: [view a receipt, fee receipt, find a receipt, print receipt]
    route: fees.home
keywords: [fee structure, frequency, late fine, discount, scholarship, refund, receipt, percentage, flat]
---

## Create a fee structure

1. Open **Fee Management** and stay on the **Fee Structures** tab. Select **New fee structure**.
2. Enter a **Name** and choose the **Academic year**. Choose a **Class** if the fee applies to one class only; leave it empty for all students.
3. Choose the **Fee type**: Tuition, Bus, Hostel, Library, Exam or Miscellaneous.
4. Choose the **Frequency**: One time, Monthly, Term-wise or Annual, and enter the **Amount (per cycle)**.
5. Optionally set a **Flat late fine** and a **Per-day late fine**.
6. Select **Create structure** ("Fee structure created").

The checks are "Name is required", "Select an academic year" and "Amount must be greater than zero". A structure can be edited ("Fee structure updated") or deleted ("Fee structure deleted") from its row. Then follow [Generate fee invoices for a term](help:fees-generate-invoices).

## Create a discount or scholarship

1. Open the **Discounts & Scholarships** tab and select **New discount**.
2. Enter a **Name**, choose the **Type** (**Percentage** or **Flat amount**) and the **Value** (greater than zero).
3. Under **Applies to**, choose all students or specific students, and pick the **Students** if specific.
4. Select **Create discount** ("Discount created").

To use a discount on one invoice, choose **Apply discount** on the invoice; see [Record a fee payment](help:fees-record-payment).

## Refunds

A refund is requested from an invoice that has a payment (**Refund**, then **Submit refund request**, with the **Amount** and a **Reason**). On the **Refunds** tab, choose **Mark processed** on a request once the money has been returned ("Refund marked as processed").

## Receipts

Open the **Receipts** tab and choose **View** on a receipt to see it.

[Open Fee Management](route:fees.home)
