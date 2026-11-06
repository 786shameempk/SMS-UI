---
id: students-bulk-import
title: Import many students from a CSV file
module: students
kind: task
roles: [admin, principal]
access: public
route: students.list
summary: Register a whole class at once by uploading a CSV file, then fix any rows that failed.
order: 50
status: reviewed
related: [students-register, academic-setup-structure]
tasks:
  - id: import-students-csv
    label: Import students from a CSV file
    phrases: [import students, bulk import students, upload students csv, add many students, student csv template, import class list]
    route: students.list
keywords: [import, bulk, csv, template, students, guardian, parent email, student email]
---

Use **Import** to register many students from one file. Class and section must already exist, so set those up first in [Academic Setup](help:academic-setup-structure).

## Steps

1. Open **Academics** > **Students** and select **Import**. The **Import students** dialog opens.
2. Select **Download template** and fill it in. Do not rename the headings.
3. The columns are: **First name\***, **Last name\***, **Date of birth\***, **Gender\***, **Class\***, **Section\***, **Roll number**, **Address\***, **Guardian name\***, **Guardian relation\***, **Guardian phone\***, **Student email** and **Parent email**. A star means required.
4. Write dates as `yyyy-mm-dd` or `dd/mm/yyyy`. Use the exact names of your classes and sections.
5. Choose the file in the dialog and start the import.
6. If any rows fail, select **Download failed rows**. The file adds **Row** and **Error** columns. Correct those rows and import only them.

## Logins

An email creates a login. A **Student email** creates one for the student, and a **Parent email** creates one for the parent. Leave both empty if you do not want a login created from the file.

## If it refuses the file

- **Missing columns** means a required heading is missing or misspelled. Use the template headings.
- **Gender must be…** or **Guardian relation must be…** lists the allowed values.
- **Missing…** names the required fields that were empty on that row.

> **Tip:** Import a few rows first to check the template, then the rest.

[Open Students](route:students.list)
