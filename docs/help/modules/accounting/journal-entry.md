---
id: accounting-journal-entry
title: Add accounts and post a journal entry
module: accounting
kind: task
access: public
route: accounting.home
summary: Create ledger accounts, record a balanced journal entry as a draft, and post it to the ledger.
order: 10
status: reviewed
tasks:
  - id: add-account
    label: Add an account
    phrases: [add an account, new ledger account, chart of accounts, create account head]
    route: accounting.home
  - id: post-journal-entry
    label: Post a journal entry
    phrases: [journal entry, post a journal entry, new journal entry, record a transaction, post to ledger]
    route: accounting.home
keywords: [accounting, ledger, journal, debit, credit, balanced, draft, post, trial balance, GST]
---

## Add an account

1. Open **Accounting** from the menu and stay on the **Chart of Accounts** tab.
2. Select **Add account**.
3. Enter the **Code**, **Name** and **Type**: Asset, Liability, Equity, Income or Expense. A **Description** is optional.
4. Select **Create account** ("Account created"). The checks are "Account code is required" and "Account name is required".

## Create a journal entry

1. Open the **Journal** tab and select **New entry**. The dialog says every entry is created as a draft.
2. Set the **Date** and an optional **Reference**, and write the **Narration** (required).
3. Under **Lines**, choose an account for each line and enter either a **Debit** or a **Credit** amount. Use **Add line** for more. At least two lines are needed ("Add at least two lines").
4. Watch the total at the bottom. It reads **Balanced** when debits equal credits and **Not balanced** otherwise.
5. If GST applies, fill in the **Tax amount**.
6. Select **Save as draft** ("Journal entry saved as draft").

## Post it

On the entry's row, choose **Post to ledger**. A message such as "… posted to the ledger" confirms it. Posted entries count in the **Trial Balance**, **Profit & Loss** and **GST** tabs.

> **Warning:** A posted entry can no longer be edited or deleted, because it is part of the books. To correct a mistake, post a new correcting entry. Only draft entries can be deleted.

[Open Accounting](route:accounting.home)
