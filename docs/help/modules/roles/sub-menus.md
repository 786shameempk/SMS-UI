---
id: roles-sub-menus
title: Show or hide tabs inside a module for a role
module: roles
kind: task
access: admin
route: roles.home
summary: Choose which tabs of each module's pages a role can see, such as hiding Refunds from front-office staff.
order: 20
status: reviewed
related: [roles-manage]
tasks:
  - id: hide-tabs-for-role
    label: Hide tabs from a role
    phrases: [hide a tab, hide sub menu, sub-menus, show only some tabs, hide refunds tab, hide salary tab, tabs for a role, why can't a user see a tab]
    route: roles.home
keywords: [sub-menu, tabs, role, hide, show, module, permission matrix]
---

The permission matrix decides which modules a role can open. **Sub-menus** goes one step further and decides which **tabs** inside those modules the role sees, for example showing Fee Management to the front office but hiding **Refunds**.

## Choose the tabs

1. Open **Roles & Permissions** from the Administration menu and select the **Sub-menus** tab.
2. In **Choose a role**, pick the role.
3. The page lists every module the role can open, with its tabs. Everything is visible until you untick it. Untick a tab to hide it, or use **Hide all** and **Show all** for a module.
4. Each module shows how many tabs are visible, for example "5 of 6 tabs shown".
5. Select **Save**. "Sub-menus saved. They apply when each user next opens a page." appears.

Select **Show every tab** to return the role to the default; "Every tab is visible again." appears and the role is no longer marked **Customised for this school**.

## Things to know

- Only modules the role can already open are listed. If the page says the role can't open any module with sub-menus yet, turn on the module's **Menu** cell for it in the **Permission matrix** first.
- Administrators always see every tab, so the school can't be locked out of its own settings.
- If you hide every tab of a module, that role sees an empty page. Keep at least one tab, or turn the module off in the **Permission matrix**.
- Hiding a tab only changes what the person sees. To control what they can do, use the **Staff actions** tab.
- When a school adds features, new tabs are visible to every role until you hide them here.
