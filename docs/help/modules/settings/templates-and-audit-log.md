---
id: settings-templates-audit-log
title: Edit system message templates and read the audit log
module: settings
kind: task
access: admin
route: settings.home
summary: Change the wording of the emails and SMS the system sends by itself, and review the record of administrative actions.
order: 30
status: reviewed
related: [settings-profile-backup, communication-send-message]
tasks:
  - id: edit-system-template
    label: Edit a system email or SMS template
    phrases: [edit email template, edit sms template, change welcome email, change system message, notification template, template variables]
    route: settings.home
  - id: view-audit-log
    label: View the audit log
    phrases: [audit log, who changed settings, activity log, admin activity, security log]
    route: settings.home
keywords: [templates, email, sms, subject, body, variables, audit log, settings, security, category]
---

## Edit a system template

The **Templates** tab holds the emails and SMS that School Sphere sends on its own, such as account messages. These are different from the one-off messages you write in the [Communication Center](help:communication-send-message).

1. Open **Administration** > **Settings** and select the **Templates** tab.
2. Each card shows the template name and a mail or message icon for its channel. Select the pencil on the card you want.
3. For an email template, change the **Subject**. For an SMS template there is no subject.
4. Change the **Body**. Keep the variables shown in the dialog, because the system fills them in for each recipient.
5. Select **Save changes**. A message says **Template updated**.

The change is recorded in the audit log.

## Read the audit log

1. Open the **Audit Log** tab. It is a running record of administrative and system actions.
2. To narrow it down, choose a category in the filter. The categories are **Settings**, **Security**, **Data**, **User** and **System**. **All categories** shows everything.
3. If nothing matches the filter, the tab says **No matching entries.**

> **Tip:** After you change settings, a role or a template, look here to confirm it was recorded.

[Open Settings](route:settings.home)
