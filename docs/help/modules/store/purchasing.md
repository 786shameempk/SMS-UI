---
id: store-purchasing
title: "Buy goods: requisition, order, receipt and payment"
module: store
kind: task
access: public
roles: [admin, principal, teacher]
route: store.requisitions
summary: Raise a requisition, get it approved, order from a supplier, receive the goods and record the invoice and payments.
order: 20
status: draft
related: [store-stock-control, store-permissions]
tasks:
  - id: raise-requisition
    label: Raise a purchase requisition
    phrases: [purchase requisition, request to buy, need items, requisition, ask to purchase]
    route: store.requisitions
  - id: receive-goods
    label: Receive goods and update stock
    phrases: [grn, goods received, receive goods, goods receipt note, delivery, partial delivery]
    route: store.receipts
  - id: create-purchase-order
    label: Create a purchase order
    phrases: [purchase order, po, order from supplier, place order]
    route: store.purchase-orders
keywords: [requisition, purchase order, grn, goods receipt, supplier invoice, payment, partial receipt]
---

## 1. Requisition

Open **Purchase Requisitions**, select **New requisition**, choose the store, the items and quantities, then **Submit for approval** (or **Save as draft**). Someone who can approve opens it and selects **Approve** or **Reject** (a reason is required to reject). The person who raised it is alerted either way.

## 2. Purchase order

Open **Purchase Orders** and select **New purchase order**, or open an approved requisition and select **Create purchase order** to fill it in for you. Choose the supplier, the store the goods are for, and each item's quantity, price, discount % and tax %. The totals are worked out for you. **Place order** sends it on; a draft can still be edited. An order with nothing received can be cancelled.

## 3. Goods receipt (GRN)

When goods arrive, open **Goods Receipt (GRN)** and select **Receive goods**, or open the order and select **Receive goods**. Enter what actually arrived: **partial deliveries are fine**, and you cannot receive more than was ordered. **Stock is added only now.** If the school requires approval of receipts, the receipt waits and stock is added when an approver approves it. The order becomes **Partly received** and then **Received**. Use **Close as complete** on a partly received order that will not be fully delivered.

## 4. Supplier invoice and payments

On **Purchase Orders**, open the **Supplier invoices and payments** tab, or select **Record supplier invoice** on an order. Open an invoice to **Record a payment**; part payments are allowed and the status moves from **Unpaid** to **Part paid** to **Paid**. Invoices past their due date show **Overdue** and raise an alert.

To send goods back to a supplier, see **Issue items to people and places, and take returns**.
