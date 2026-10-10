---
id: library-add-book-member
title: Add a book and a library member
module: library
kind: task
access: public
route: library.home
summary: Add a book to the catalog, and register a student or staff member as a library member.
order: 20
status: reviewed
related: [library-issue-return]
tasks:
  - id: add-book
    label: Add a book to the library
    phrases: [add a book, new book, add book to catalog, library catalog, register a book]
    route: library.home
  - id: add-library-member
    label: Add a library member
    phrases: [add library member, library membership, register library member, new library member]
    route: library.home
keywords: [book, isbn, copies, author, publisher, category, shelf, member]
---

## Add a book

![Library management on the Books tab: the catalog with title, author, publisher, category, availability and shelf, and the New book button.](shot:library-books-desktop "The Books tab.")

1. Open **Library** and stay on the **Books** tab.
2. Select **New book**.
3. Enter the **Title**, the **ISBN** (at least 6 characters) and the **Total copies** (at least one).
4. Choose the **Author**, **Publisher** and **Category**. If one is missing, add it first on the **Authors & Publishers & Categories** tab.
5. Optionally enter the **Shelf location** and a **Note**.
6. Select **Create book**.

A "Book added to catalog" message appears. The checks are "Title is required", "ISBN must be at least 6 characters", "Select an author", "Select a publisher", "Select a category" and "Must have at least one copy".

## Add a library member

1. Open the **Members** tab and select **New member**.
2. In **New library member**, choose the **Person type** (student or staff), then the person.
3. Set the **Status**: active or suspended.
4. Select **Add member**.

A "Member added" message appears. "Select a person" is shown if you skip the person.

[Open Library](route:library.home)
