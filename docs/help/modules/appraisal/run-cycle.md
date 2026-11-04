---
id: appraisal-run-cycle
title: Run an appraisal cycle
module: appraisal
kind: task
access: admin
roles: [admin, principal]
route: appraisal.cycles
summary: Create a cycle, choose participants, assign reviewers, publish, monitor, approve and finalize.
order: 40
status: reviewed
related: [appraisal-overview, appraisal-configure]
tasks:
  - id: run-appraisal-cycle
    label: Create an appraisal cycle
    phrases: [create appraisal cycle, start appraisal, new appraisal cycle, run staff appraisal, assign reviewers, finalize appraisal, approve appraisal, release appraisal result]
    route: appraisal.cycles
keywords: [cycle, participants, reviewers, publish, finalize, release, deadline]
---

## Create the cycle

1. Open **Performance & Appraisal** and choose **Appraisal cycles**, then **New cycle**. (Before any exist you see "No appraisal cycles yet".)
2. Fill in **Cycle name**, **Appraisal type**, the **Academic year** and **Period label**, **Evaluation period starts** and **Evaluation period ends**.
3. Pick a template, then the frozen version this cycle uses. Questions and scoring stay fixed once the cycle is published.
4. Optionally limit it with **Departments** and **Employee categories** (leave empty for all).
5. Set the dates: **Reviews open**, **Submission deadline**, **Manager review deadline**, **Approval deadline** and **Finalization date**.
6. Select **Create cycle**.

## Work through the cycle

Open the cycle. It has five tabs:

1. **Overview**: the plan and a checklist. Select **Review and publish** when ready, then **Publish**.
2. **Participants**: choose the people being appraised. A person already in another live cycle for the same period is blocked unless you tick "Allow people already in another live cycle".
3. **Reviewer assignment**: assign who reviews whom. The reviewer groups that are switched on in the configuration are used.
4. **Review monitoring**: see who has submitted, who is overdue, and send reminders.
5. **Approval & finalization**: open each person's result, **Approve** each stage, add **Final remarks**, **Finalize** and then **Release to employee**.

After publishing, only dates and reviewer weights can change (**Amend dates**, **Amend weights**); the change is recorded in the audit history. A draft can be deleted with **Delete draft**; a live cycle can be stopped with **Cancel cycle** or ended with **Close cycle**. Finalized appraisals are kept.

[Open Appraisal cycles](route:appraisal.cycles)
