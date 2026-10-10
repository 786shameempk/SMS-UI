---
id: settings-profile-backup
title: Update the school profile, logo and academic year, and take a backup
module: settings
kind: task
access: admin
route: settings.home
summary: Change the school's name, logo and details, set the current academic year, and export or restore the school's configuration.
order: 10
status: reviewed
tasks:
  - id: update-school-profile
    label: Update the school profile
    phrases: [update school profile, change school name, change school logo, upload logo, school details, school address]
    route: settings.home
  - id: set-academic-year
    label: Set the current academic year
    phrases: [set academic year, change current academic year, switch academic year]
    route: settings.home
  - id: backup-settings
    label: Export or restore a backup
    phrases: [backup, export backup, restore backup, download school settings]
    route: settings.home
keywords: [settings, school profile, logo, academic year, backup, restore, audit log, localization, templates]
---

## Update the school profile

1. Open **Settings** from the menu. The page is headed **Settings & administration**; stay on the **School Profile** tab.
2. Under **School profile**, change the **School name** (required: "School name is required"), **Tagline**, **Address**, **Contact number**, **School email**, **Principal** and **Established year**.
3. Select **Save profile** ("School profile saved").

A contact number needs at least 6 characters ("Enter a valid contact number"), and the email must be valid ("Enter a valid email").

## Change the logo

Under **School logo**, select **Upload logo** (or **Replace logo**) and choose a PNG, JPG, WebP or SVG image of 2 MB or smaller. **Remove** goes back to School Sphere's own logo. The logo is shown on the login page, the sidebar and documents.

## Set the current academic year

Under **Academic year**, choose the **Current academic year**. It is treated as current across Academics, Attendance, Timetable and Examinations ("Current academic year updated").

## Export or restore a backup

1. Open the **Backup & Restore** tab.
2. Select **Export backup** to download the school's configuration as a JSON file: profile, localization, appearance, message templates and feature toggles. Student and fee records are not in it.
3. To go back to an earlier export, select **Restore from file**, choose the file and confirm **Restore backup**.

> **Warning:** Restoring replaces the school's current configuration and reloads the app.

## Other tabs

**Plan & Subscription**, **Appearance**, **Dashboard**, **Localization**, **Templates** and **Audit Log** are also on this page.

[Open Settings](route:settings.home)
