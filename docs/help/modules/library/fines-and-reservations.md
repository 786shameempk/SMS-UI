---
id: library-fines-reservations
title: Collect library fines and manage reservations
module: library
kind: task
access: public
route: library.home
summary: Mark a fine as paid, reserve a book that has no copies left, and fulfil or cancel a reservation.
order: 30
status: reviewed
related: [library-issue-return]
tasks:
  - id: library-mark-fine-paid
    label: Mark a library fine as paid
    phrases: [library fine paid, mark fine paid, collect library fine, overdue book fine]
    route: library.home
  - id: reserve-book
    label: Reserve a book
    phrases: [reserve a book, book reservation, put a book on hold, reserve a library book]
    route: library.home
keywords: [library, fine, overdue, reservation, hold, fulfil, cancel]
---

## Library fines

Fines are worked out automatically when a late book is returned; see [Issue and return library books](help:library-issue-return). Open the **Fines** tab to see them. On a fine's row, select **Mark paid** once it is settled ("Fine marked as paid").

## Reserve a book

Reservations are only for books with no copies currently available.

1. Open the **Reservations** tab and select **Reserve book**.
2. Choose the **Book** and the **Member** ("Select a book", "Select a member").
3. Select **Reserve** ("Reservation placed").

## Fulfil or cancel a reservation

On the reservation's row:

- **Fulfill** (available once a copy is back) asks you to confirm **Fulfill reservation** with **Fulfill & issue**. A message says the book was issued to the member.
- **Cancel** asks you to confirm with **Cancel reservation**. The member must place a new reservation if they still want the title ("Reservation cancelled").

[Open Library](route:library.home)
