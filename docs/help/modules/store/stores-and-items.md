---
id: store-stores-and-items
title: Set up stores, categories, items and suppliers
module: store
kind: task
access: public
roles: [admin, principal]
route: store.items
summary: Create stores, categories, the item master and suppliers before buying or issuing anything.
order: 10
status: draft
related: [store-overview, store-purchasing]
tasks:
  - id: create-store-item
    label: Add an item to the store
    phrases: [add item, new item, item master, sku, barcode, minimum stock, reorder level, add category, add supplier]
    route: store.items
keywords: [item, sku, barcode, category, subcategory, supplier, store, warehouse, unit, tax, minimum stock]
---

## Stores and warehouses

Open **Stores & Warehouses** and select **New store**. Give it a name, a short code and (optionally) a location. Add the **managers and authorised staff**: anyone listed on a store can only work in the stores they are assigned to. People not listed anywhere can use every store of the campus. The same page holds the **Store rules**: require approval before issuing, require approval of goods receipts, and low-stock alerts.

## Categories

**Categories** starts with ten school categories (stationery, books, uniforms, laboratory, sports, IT, furniture, cleaning, electrical, general). Add your own, and a **Subcategory** under any of them. A category in use cannot be deleted.

## Items

Open **Items** and select **New item**. Enter the name and unit (Nos, Box, Kg, Litre...), choose a category, and set the **minimum level**, **reorder quantity** and **maximum level**. Leave the **item code** empty and one is generated. Add a **selling price** to sell the item from the store, a **tax %**, and the suppliers who provide it. An item that has been used is **made inactive** instead of deleted so history stays readable.

## Suppliers

**Suppliers** holds contact details, GST number, payment terms and (for people who can edit) bank details. Select a supplier to see its purchase orders, invoices and what is still owed.
