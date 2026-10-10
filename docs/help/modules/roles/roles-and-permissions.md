---
id: roles-manage
title: Create a role and set its permissions
module: roles
kind: task
access: admin
route: roles.home
summary: Add a custom role, choose what it can do, and turn features on or off for the whole school.
order: 10
status: reviewed
related: [users-add]
tasks:
  - id: create-role
    label: Create a role
    phrases: [create a role, add a role, new role, custom role]
    route: roles.home
  - id: change-permissions
    label: Change role permissions
    phrases: [change permissions, give permission, role permissions, permission matrix, who can access a module, why can't a user see a menu]
    route: roles.home
  - id: toggle-features
    label: Turn features on or off
    phrases: [turn a feature on, turn a feature off, feature toggles, disable a module]
    route: roles.home
keywords: [role, permission, matrix, policy, feature toggle, staff actions, AI permissions, module access]
---

Roles decide which modules and actions a person gets. A person sees a menu entry only if their role has the module's permission.

## Create a role

1. Open **Roles & Permissions** from the menu. The page is headed **Roles & permissions**; stay on the **Roles** tab.
2. Select **Add role**. The dialog is **Add role**: "Create a custom role to assign fine-grained permissions."
3. Enter the **Role name** and a **Description**. Both are required ("Name is required", "Description is required").
4. Select **Create role** ("Role created").

Edit a role to change its name and description (**Save changes**, "Role updated"). Deleting a role shows a message with its name.

## Set what a role can do

1. Open the **Permission matrix** tab.
2. Choose a category from the list. Each category is named "… permissions".
3. Tick or untick a permission in the column of the role. Each box is labelled with the permission and the role name.

Rows are grouped under the menu groups (for example Campus Operations holds Library, Transport, Hostel, Inventory, Visitors and Health & Medical), and only the modules in your school's plan are listed. Under each role's name, **All** grants every permission shown in the chosen category and **None** clears them. If a change cannot be saved you see "Could not update permission"; a bulk change reports how many could not be changed.

You cannot change the permissions of a role you hold yourself unless you are a school administrator, and the administrator role always keeps access to User Management, Roles & Permissions and Settings.

> **Note:** People already signed in may need to sign in again before a change in their role shows in their menu.

## Other tabs

- **Policies** holds attribute-based policies.
- **Staff actions** and **AI permissions** control specific actions for staff and for the AI features.
- **Feature toggles** turns whole features on or off for the application, whoever has permission. A message says whether the feature was enabled or disabled.

Give the role to a person in [Add a user and manage their account](help:users-add).

[Open Roles & Permissions](route:roles.home)
