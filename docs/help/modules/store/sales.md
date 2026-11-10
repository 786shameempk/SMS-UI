---
id: store-sales
title: Sell uniforms, books and stationery
module: store
kind: task
access: public
roles: [admin, principal]
route: store.sales
summary: Record a sale to a student, parent or staff member, take payment and print the receipt.
order: 50
status: draft
related: [store-issues-and-returns]
tasks:
  - id: new-sale
    label: Sell items from the store
    phrases: [store sale, sell uniform, sell books, sell stationery, receipt, collect payment, store shop]
    route: store.sales
keywords: [sale, receipt, uniform, books, payment, discount, tax, partial payment]
---

Open **Store Sales** and select **New sale**. Choose the store and the buyer (a student, a parent buying for a student, a staff member, or a walk-in), then add the items. The price comes from the item; the discount and tax are worked out for you. Changing a price at the counter needs permission to edit store records.

Add the **payment**: cash, online, card, cheque or bank transfer, in one or more parts. Leave it empty to record the sale as **Unpaid** and collect later from the receipt (**Collect payment**). A sale is **Paid**, **Part paid** or **Unpaid**.

Stock is deducted when the sale is recorded, and a sale cannot be larger than the stock in hand. The **receipt** opens straight away with the school's letterhead; select **Print**.

Sales are recorded in the store only. They are not posted to Fee Management or Accounting.
