---
id: academic-setup-structure
title: Set up academic years, terms, classes and sections
module: academic-setup
kind: task
roles: [admin, principal]
access: public
route: academic-setup.home
summary: Create the academic year, its terms, the classes and their sections that other modules rely on.
order: 10
status: reviewed
tasks:
  - id: create-academic-year
    label: Create an academic year
    phrases: [create academic year, new academic year, set up academic year, add a term]
    route: academic-setup.home
  - id: create-class-section
    label: Create a class and section
    phrases: [create a class, add a class, add a section, new section, set up classes]
    route: academic-setup.home
keywords: [academic year, term, class, section, department, subject, capacity, class teacher]
---

Attendance, timetable and examinations all use the academic year, classes and sections set up here.

## Create an academic year and terms

1. Open **Academic Setup** from the menu. The page is headed **Academic management**.
2. On the **Academic Years** tab, create a new academic year: enter the **Name**, **Start date**, **End date** and **Status**. Tick **Set as current year** if it is the one in use. Select **Create academic year** ("Academic year created").
3. Open the **Terms** tab and create a term: **Name**, **Academic year**, **Start date**, **End date** and **Status**, then **Create term** ("Term created").

The checks are "Name is required", "Start date is required", "End date is required" and "Select an academic year".

## Create a class and its sections

1. Open the **Classes & Sections** tab and select **New class**.
2. Enter the **Name** and choose the **Academic year**. A **Department / stream** is optional.
3. Select **Create class** ("Class created").
4. Select **New section** (or **Add section** on the class). Enter the **Name**, choose the **Class**, set **Capacity** (at least 1) and **Current strength**, and optionally a **Class teacher**.
5. Select **Create section** ("Section created").

## Add a calendar event

1. Open the **Academic Calendar** tab and select **Add event**.
2. In **New calendar event**, enter the **Title** and choose the **Type**: Term start, Term end, Exam window, Holiday or Other.
3. Set the **Start date** (required) and an optional **End date**, and choose the **Academic year**.
4. Select **Add event** ("Event added").

Holidays and other dates added here show on the school [Calendar](help:calendar-overview).

Departments, subjects and class capacity have their own tabs.

[Open Academic Setup](route:academic-setup.home)
