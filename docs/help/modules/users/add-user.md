---
id: users-add
title: Add a user and manage their account
module: users
kind: task
access: admin
route: users.list
summary: Create a staff or administrator account, and reset, lock, deactivate or remove it later.
order: 10
status: reviewed
related: [account-temporary-password, account-sign-in]
tasks:
  - id: add-user
    label: Add a user
    phrases: [add a user, create a user, create an account, new staff login, add a staff account, make a login]
    route: users.list
  - id: reset-user-password
    label: Reset a user's password
    phrases: [reset a user password, user forgot password, send temporary password, give a new password]
    route: users.list
keywords: [user, account, role, branch, department, temporary password, activate, deactivate, lock, unlock, delete]
---

Use this to give a member of staff a login, and to look after it afterwards. This screen is for staff and administrator accounts.

## Before you start

- You need access to **User Management**. It is for administrators.
- Decide the person's **Role**. Roles are set up in **Roles & Permissions**.

## Add a user

![The Add user form with Full name, Email, Phone, Department, Role and Branch fields.](shot:users-add-form-desktop "The Add user form.")

1. Open **User Management**. The page is headed **User management**.
2. Select **Add user**.
3. Enter the **Full name** and **Email**. The **Phone** and **Department** are optional.
4. Choose the **Role**.
5. If the form shows a **Branch** field, choose the branch. It is shown for roles that do not have access to all branches.
6. Select **Create user**.

A message shows the new user's temporary password for 30 seconds, for example "…created. Temporary password: …". Pass it to the person safely. They are asked to change it when they first sign in; see [Sign in with a temporary password](help:account-temporary-password).

| Field | Required | What is checked |
|---|---|---|
| **Full name** | Yes | Shows "Name is required". |
| **Email** | Yes | Shows "Email is required", or "Enter a valid email". |
| **Role** | Yes | Shows "Select a role". |

## Look after an account

Open the actions menu on the user's row:

- **Edit user** changes the details (**Save changes**).
- **View profile** opens the profile.
- **Reset password** asks you to confirm ("A temporary password will be generated and sent to" the user's email), then shows the new temporary password.
- **Deactivate** or **Activate** changes whether the person can use the account.
- **Lock account** or **Unlock account** locks a person out, or lets them in again.
- **Delete user** permanently removes the account. It cannot be undone.

To change several accounts at once, tick their rows and use the buttons that appear to activate or deactivate them.

To find someone, use **Search by name or email** and the **Role** and **Status** filters. The statuses are **Active**, **Inactive** and **Locked**.

> **Warning:** **Delete user** cannot be undone. Use **Deactivate** if the person may return.

[Open User Management](route:users.list)
