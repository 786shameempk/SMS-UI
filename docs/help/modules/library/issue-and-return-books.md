---
id: library-issue-return
title: Issue and return library books
module: library
kind: task
access: public
route: library.home
summary: Lend a book to a library member, and record its return.
order: 10
status: reviewed
related: [library-add-book-member]
tasks:
  - id: issue-book
    label: Issue a book
    phrases: [issue a book, lend a book, give a library book, borrow a book, check out a book]
    route: library.home
  - id: return-book
    label: Return a book
    phrases: [return a book, book returned, check in a book, library return, library fine]
    route: library.home
keywords: [library, loan, due date, fine, member, issue, return]
---

Use this when a member borrows or returns a book.

## Before you start

- The book must be in the catalog and available, and the person must be an active library member. See [Add a book and a library member](help:library-add-book-member).

## Issue a book

![Library management with the Books, Authors & Publishers & Categories, Members, Issue / Return, Fines and Reservations tabs.](shot:library-home-desktop "Library management and its tabs.")

1. Open **Library** from the menu. The page is headed **Library management**.
2. Open the **Issue / Return** tab and select **Issue book**.
3. Choose the **Book** and the **Member**, and set the **Due date**. All three are required.
4. Select **Issue book**.

A "Book issued" message appears. The checks are "Select a book", "Select a member" and "Due date is required".

## Return a book

1. On the **Issue / Return** tab, find the loan and select **Return**.
2. Confirm **Return book** with **Mark returned**.

A "Book returned" message appears. When the return is late, it reads "Book returned — fine of … applies"; fines are computed automatically and appear on the **Fines** tab.

[Open Library](route:library.home)
