---
id: store-stock-control
title: Stock levels, adjustments, transfers and physical counts
module: store
kind: task
access: public
roles: [admin, principal]
route: store.stock
summary: See what every store holds, move stock between stores, correct it with a reason, and reconcile a physical count.
order: 30
status: draft
related: [store-purchasing, store-reports]
tasks:
  - id: adjust-stock
    label: Adjust stock or enter opening stock
    phrases: [adjust stock, opening stock, damaged stock, expired stock, lost stock, stock correction, write off]
    route: store.stock
  - id: stock-count
    label: Do a physical stock count
    phrases: [stock count, physical verification, stocktake, reconcile stock, inventory count]
    route: store.stock
  - id: transfer-stock
    label: Transfer stock between stores
    phrases: [transfer stock, move stock, store transfer, warehouse transfer]
    route: store.stock
keywords: [stock, ledger, adjustment, transfer, count, damaged, expired, opening stock, reconciliation]
---

Open **Stock Management**. Its tabs are **Stock levels**, **Movement history**, **Adjustments**, **Transfers** and **Physical counts**.

## Stock levels and movement history

**Stock levels** shows quantity, average cost and value by store and item, with **Low stock** and **Out of stock** flags. **Movement history** is the ledger: every change with its date, document number, reason and who did it. It cannot be edited or deleted.

## Adjust stock

Select **Adjust stock**. Choose the type: **Opening stock** and **Stock inward** add stock; **Outward**, **Damaged**, **Expired** and **Lost** take it out; **Correction** can go either way. **A reason is required for every adjustment.** Stock cannot go below zero.

## Transfer between stores

Select **Transfer**, choose the two stores and the items. Both stores change at once, at the cost the items were held at.

## Physical count

Select **Start a count**, choose the store (and optionally one category). The system records what it holds, you enter what you counted and select **Reconcile**. Each difference becomes an adjustment (an explanation is required). Movements made while the count was open are kept: only the difference you found is applied.
