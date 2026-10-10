---
id: inventory-stock
title: Record stock coming in, going out and adjustments
module: inventory
kind: task
access: public
route: inventory.home
summary: Record received stock, issue items to a department or class, and correct stock levels.
order: 10
status: reviewed
tasks:
  - id: stock-in
    label: Record stock received
    phrases: [stock in, receive stock, add stock, record purchase, restock items]
    route: inventory.home
  - id: issue-stock
    label: Issue stock
    phrases: [issue stock, stock out, give items to a department, take items from inventory]
    route: inventory.home
keywords: [inventory, stock, item, vendor, unit cost, issued to, adjustment, transaction]
---

Use this to keep the inventory counts right.

## Before you start

Add the item on the **Items** tab (**Item created**) and, if you want to name a supplier, a vendor on **Vendors & Categories**.

## Record stock received

1. Open **Inventory** from the menu. The page is headed **Inventory management**.
2. Open the **Stock Transactions** tab and select **Stock in**.
3. Choose the **Item**, then enter the **Quantity** and **Unit cost**. A **Vendor** and a **Reference** are optional.
4. Set the **Date**, then select **Record stock in** ("Stock in recorded").

The dialog describes this as newly received stock: a purchase, donation or restock.

## Issue stock

1. On the same tab, select **Issue stock**.
2. Choose the **Item**, enter the **Quantity** and **Issued to**, and optionally a **Purpose**. Set the **Date**.
3. Select **Issue stock** in the dialog. A "Stock issued" message appears.

## Adjust stock

Select **Adjust stock** to correct a count. An "Adjustment recorded" message confirms it.

| Field | What is checked |
|---|---|
| **Item** | "Select an item". |
| **Quantity** | "Quantity must be greater than zero". |
| **Unit cost** | "Cost can't be negative". |
| **Issued to** | "Enter who this is issued to". |
| **Date** | "Date is required". |

## Reports

The **Reports** tab shows a **Low stock alert** (items at or below their reorder level) and **Valuation by category** (current stock value).


[Open Inventory](route:inventory.home)
