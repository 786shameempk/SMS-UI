---
id: store-reports
title: Store reports, exports and the audit trail
module: store
kind: reference
access: public
roles: [admin, principal]
route: store.reports
summary: The seventeen store reports, how to filter and export them, and the audit trail.
order: 60
status: draft
related: [store-stock-control]
tasks:
  - id: open-store-reports
    label: Run a store report
    phrases: [store report, stock report, stock valuation, purchase register, low stock report, sales register, consumption report, audit trail]
    route: store.reports
keywords: [report, valuation, purchase register, issue register, sales register, export, print, audit]
---

Open **Reports**, choose a report on the left, set the filters and read the table. Totals are shown under it. All filtering and paging happen on the server.

| Group | Reports |
|---|---|
| Stock | Current stock, Stock valuation, Low stock, Out of stock, Stock movement, Damaged / expired / lost stock, Stock adjustments, Store transfers |
| Purchasing | Purchase register, Supplier-wise purchases, Item-wise purchase history |
| Issues | Item issue register, Student-wise issues, Staff-wise issues, Department-wise consumption |
| Sales | Sales register, Sales collection |

Filters offered depend on the report: date range, store, category, supplier, a type or status, and a search box. **Print this page** prints what is on screen. **Export** (CSV that opens in Excel, or PDF through the browser's Save as PDF) takes every row and needs the **Export** permission.

## Audit trail

The **Audit trail** entry at the bottom of the list shows who changed what and when for every store record, with the document number. It is permanent: entries cannot be edited or deleted.
