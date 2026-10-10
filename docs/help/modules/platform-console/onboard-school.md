---
id: platform-onboard-school
title: Onboard a new school as a tenant
module: platform-console
kind: task
access: platform
route: platform-console.home
summary: Add a school to the platform on a trial plan, change its plan, and post platform announcements.
order: 10
status: reviewed
tasks:
  - id: onboard-school
    label: Onboard a new school
    phrases: [onboard a school, add a new school, create a tenant, new tenant, add a school to the platform]
    route: platform-console.home
  - id: change-school-plan
    label: Change a school's plan
    phrases: [change plan, change a school's plan, upgrade a school, change subscription plan]
    route: platform-console.home
keywords: [tenant, school, plan, subdomain, trial, suspend, activate, billing contact, announcement]
---

This screen is for the platform administrator only.

## Add a school

1. Open **Platform Console** from the menu. The page is headed **Platform Console**; stay on the **Tenants** tab.
2. Select **New tenant**. The dialog says it onboards a new school as a trial tenant.
3. Enter the **School name** and a **Subdomain** (letters, numbers and hyphens only; the page shows the address the school will sign in at).
4. Choose the **Plan**, then enter the **Billing contact** name and **Billing email**.
5. Select **Create tenant**. A message says the school was onboarded as a trial tenant.

The checks are "School name is required", "Subdomain is required", "Letters, numbers, and hyphens only (no spaces)", "Select a plan", "Billing contact name is required" and "Enter a valid email".

## Manage a school

On the school's row, the actions are **Change plan**, **Activate**, **Suspend**, **Cancel subscription** and **Delete tenant**.

## Plans and announcements

- The **Plans** tab creates and edits plans: **Plan name**, **Tier**, **Monthly price (₹)**, **Max students**, **Max staff**, **Storage (GB)** and **Included modules**. Modules are listed under the same groups as the school menu (Everyday, Academics, Online Exams, Human Resources, Finance, Campus Operations, Engagement, Insights, Administration); use **Select group** or **Clear group** to switch a whole group, or tick single modules. Dashboard, User Management, Roles & Permissions and Settings are always included. When you edit a plan used by schools, a note says how many schools it reaches and what removing a module does: they follow at their next sign-in or refresh, their saved Roles & Permissions are kept, and adding the module back restores the same access. After saving, a message lists what was added and removed.
- The **Announcements** tab posts a message (**New announcement**) broadcast to every tenant admin, with an optional expiry.


## Reports

The **Reports** tab shows **Tenants by plan**, which plan tier schools are subscribed to.


[Open Platform Console](route:platform-console.home)
