---
id: appraisal-results-reports
title: Approve and finalize an appraisal, and use the dashboard, reports and history
module: appraisal
kind: task
roles: [admin, principal]
access: admin
route: appraisal.dashboard
summary: Follow a cycle on the dashboard, take one person's result through approval, finalization and release, add development goals, download reports and read the audit trail.
order: 50
status: reviewed
related: [appraisal-run-cycle, appraisal-overview]
tasks:
  - id: appraisal-dashboard
    label: See how a cycle is progressing
    phrases: [appraisal dashboard, cycle progress, reviews pending, overdue reviews, score distribution]
    route: appraisal.dashboard
  - id: finalize-appraisal
    label: Approve and finalize an appraisal result
    phrases: [finalize appraisal, approve appraisal, release result to employee, reopen appraisal, development goals, hide comments]
    route: appraisal.cycles
  - id: appraisal-reports
    label: Download appraisal reports
    phrases: [appraisal report, download appraisal csv, appraisal history, appraisal audit trail, past cycles]
    route: appraisal.reports
keywords: [appraisal, dashboard, result, approve, finalize, release, goals, moderation, reports, csv, history, audit]
---

These screens come after you have [run an appraisal cycle](help:appraisal-run-cycle). Appraisal records are confidential, so each screen shows only what your access allows.

## Dashboard

1. Open **Performance & Appraisal** and select **Appraisal dashboard**.
2. Choose a cycle under **Appraisal cycle**, or **All cycles**.
3. See **Eligible employees**, **Reviews assigned**, **Reviews completed**, **Reviews pending** and **Overdue**, plus **Awaiting approval** and **Finalized**.
4. **Score distribution** and the breakdowns **By department**, **By employee category** and **By reviewer group** show averages.

> **Note:** The dashboard shows counts only. Small anonymous groups show as **Hidden (too few responses)**, so nobody can be singled out.

## Approve and finalize one person's result

1. Open the cycle and go to **Approval & finalization**. Open a person's result.
2. Read **Scores by category**, **Feedback by reviewer group** and the **Reviewer roster**.
3. Use **Submit for approval**. At each stage, an approver chooses **Approve**, **Return** (send back for revision, with a **Reason**) or **Reject**.
4. Add **Final remarks**, then select **Finalize**. The score is recalculated and locked.
5. Select **Release to employee** when you want them to see the result.
6. To correct a finalized result, select **Reopen** and give a reason. It goes back to the finalize step and is recorded in the audit history.

### Development goals

Under **Development goals**, select **Add goal**, enter the **Goal**, a **Target date** and save. Update its **Goal status** later, or use **Remove goal**.

### Moderation

Use **Hide from employee** to **Hide** a reviewer's comments from the employee, and **Restore** to show them again. Hiding never edits what the reviewer submitted.

## Reports

1. Open **Reports** in the appraisal menu.
2. Filter by **Appraisal cycle**, **Department**, **Employee category** and a **From** and **To** date.
3. Pick the **Columns** you need, then select **Download CSV** or **Print**.

If no row matches, the page says **No records match these filters.**

## History

**Appraisal history** lists **Past cycles** and the **Audit trail** (when, who, action, area and details). Scores, comments and reviewer names are never written to the audit trail.

[Open the appraisal dashboard](route:appraisal.dashboard)
