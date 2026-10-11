---
id: dashboard-tabs
title: Read the dashboard tabs
module: dashboard
kind: task
access: member
route: dashboard.home
summary: Switch between Overview, Executive, Finance, Admissions, Campus operations, Engagement, My day, HR & Payroll and Academics, and see what each one answers.
order: 20
status: reviewed
tasks:
  - id: open-dashboard-tab
    label: Open a dashboard tab
    phrases: [dashboard tabs, executive dashboard, finance dashboard, admissions dashboard, campus operations dashboard, engagement dashboard, hr dashboard, academics dashboard, my day dashboard]
    route: dashboard.home
  - id: see-what-needs-attention
    label: See what needs attention
    phrases: [what needs attention, school health, overdue fees overview, tickets past target, dues by age, seats against capacity]
    route: dashboard.home
keywords: [dashboard, tabs, executive, finance, admissions, campus, engagement, hr, payroll, academics, my day, teacher, principal]
---

Below the greeting, the **Dashboard** has a row of tabs. **Overview** is your home page of cards, which you can [customize](help:dashboard-customize). The other tabs are fixed views that each answer one question. You only see the tabs your role and modules allow, so a teacher and a principal see different rows.

Select a tab to open it. The address bar updates (for example `?tab=finance`), so you can bookmark a tab or send its link to a colleague who has the same access.

## What each tab shows

| Tab | Who sees it | What it answers |
| --- | --- | --- |
| **Executive** | Administrator, Principal | How the school is doing: attendance today, fees collected, pass rate, enrolments, staff on leave and open complaints. **Needs your attention** lists what to look at first, worst first. It also compares branches (for roles that cover every branch) and lists students at risk. |
| **Finance** | Administrator, Principal, Accountant, or anyone with Fees, Accounting or Payroll | Collected today, this month against what falls due, dues by age, defaulters, refunds waiting, how people paid, and fee income against payroll cost. |
| **Admissions** | Administrator, Principal, Receptionist, or anyone with Students | The admission funnel, seats against capacity for each class, applications by month, and who is in school or has left. |
| **Campus operations** | Administrator, Principal, Librarian, Receptionist, or anyone with a campus module | **Needs action today**, then Library, Transport, Hostel, Inventory, Visitors and Health. Only the modules you can open are shown. |
| **Engagement** | Administrator, Principal, Receptionist, or anyone with Help Desk, Surveys or Communication | Open tickets and whether they are inside their response target, survey satisfaction, and how many messages were delivered. |
| **My day** | Teacher | Today's classes (including periods you cover), attendance to mark, homework to grade, marks to enter, and how your classes are doing. |
| **HR & Payroll** | Administrator, Principal, or anyone with Staff or Payroll | Headcount, today's staff attendance, leave, joiners and leavers. |
| **Academics** | Administrator, Principal, Teacher, or anyone with Examinations or Reports | Results by class and subject, grade distribution, students to celebrate and to support, and exams that still need marks. |

## Choose the period

The date range at the top applies to every tab except **Campus operations**, which always shows today. Choose **This year**, **Last 3 months**, **Last 6 months** or **Custom range**.

## Refresh the figures

Select the refresh button (it shows **Updated … ago**) to reload the tab you are on. Figures are also cached for about a minute on the server, so a change you just made may take a moment to appear.

## Good to know

- **Response targets** in the Help Desk are fixed by priority for every school: Urgent 4 hours, High 24 hours, Medium 72 hours, Low 120 hours.
- **Payroll** amounts on the Finance tab are shown to administrators, principals and people with Payroll access. Other finance staff see fee figures only.
- **Satisfaction** is the average of rating answers (out of 5) in surveys answered within the period.
- If your login is not linked to a staff record, **My day** asks you to contact your administrator.
- A red **Demo data** banner means the figures are sample values. Only developer and demo set-ups show it.

> **Note:** If a tab you expect is missing, your role may not include the module behind it. Ask your administrator; see [Create a role and set its permissions](help:roles-manage).

[Open the Dashboard](route:dashboard.home)
