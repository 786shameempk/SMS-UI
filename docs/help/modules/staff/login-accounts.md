---
id: staff-login-accounts
title: See and manage login accounts for staff, teachers and students
module: staff
kind: task
access: public
roles: [admin, principal]
route: staff.list
summary: Check who has a linked sign-in account, filter the lists by it, and send a temporary password to someone who is locked out.
order: 20
status: reviewed
related: [users-add, account-forgot-password, account-sign-in-with-code]
tasks:
  - id: login-account-status
    label: Find people without a login account
    phrases: [who has a login, account linked, not linked, staff without login, students without login, no login account, login account filter]
    route: staff.list
  - id: reset-person-password
    label: Reset someone's password
    phrases: [reset password, send temporary password, teacher forgot password, staff locked out, reset a teacher password, reset student password]
    route: staff.list
keywords: [login, account linked, not linked, reset password, temporary password, mobile login, email login, staff, teachers, students]
---

A staff member, teacher or student can only sign in once they have a login account linked to their record. The **Staff**, **Teachers** and **Students** lists show whether that has happened.

## Check the login account

1. Open **Staff Management**, **Teachers** or **Students** from the menu.
2. Look at the **Login account** column. It shows **Account linked** or **Not linked**.
3. Use the **Filter by login account** control to show **All login accounts**, only the linked, or only the **Not linked**.

Someone who is **Not linked** cannot sign in. Open their profile and use its **Login** (staff) or **Logins** (student) tab to create the account, or add them from **User Management** ([Add a user](help:users-add)).

## Email or mobile number

The email address and the mobile number on the form are both optional, but a login needs at least one of them. A person can then sign in with their password or with a one-time code sent to that email or mobile number ([Sign in with a one-time code](help:account-sign-in-with-code)). If the email or mobile number is already used by another login, the form says which field is taken.

## Reset a password

1. On the person's row, open the actions menu and select **Reset password**. It is offered only for a linked account that has an email, and only to people allowed to reset passwords.
2. Confirm **Reset password?**. The message explains that the person will be emailed a temporary password and signed out everywhere.
3. A "Password reset for {name}. A temporary password has been emailed." message appears.

They choose a new password when they next sign in ([Sign in with a temporary password](help:account-temporary-password)). If it fails, "Could not reset password" appears with the reason.

> **Note:** The temporary password goes to the person's email, not to you. If the account has no email, add one first.
