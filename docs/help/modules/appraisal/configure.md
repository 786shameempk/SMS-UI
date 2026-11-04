---
id: appraisal-configure
title: Set up appraisal criteria, questions and configuration
module: appraisal
kind: reference
access: admin
roles: [admin, principal]
route: appraisal.configuration
summary: Where to set the rating scale, reviewer groups and weights, approval steps, privacy, retention, and the question bank.
order: 50
status: reviewed
related: [appraisal-run-cycle, appraisal-overview]
tasks:
  - id: appraisal-configuration
    label: Configure appraisals
    phrases: [appraisal configuration, rating scale, reviewer weights, appraisal questions, add appraisal question, question bank, appraisal template, approval steps]
    route: appraisal.configuration
keywords: [configuration, criteria, question bank, template, anonymity, retention]
---

## Configuration

Open **Performance & Appraisal** > **Configuration**.

| Area | What you set |
|---|---|
| **Rating scale** | Levels with a **Label** and description; at least two. Move them with **Move up** and **Move down**. |
| **Employee categories in appraisals** | Which kinds of employee can be appraised. Switching a category on does not add anyone; you still select people per cycle. |
| **Reviewer groups** | Which groups may review each kind of employee, and their weights. Enabled weights add up to 100% and are re-based when a group has no responses. |
| **Approval workflow** | **Approval steps**, and the exception "An employee may approve their own appraisal". |
| **Feedback & privacy** | **Minimum anonymous responses**; whether employees see their released result and the written feedback; parent feedback (once per child, subject or teacher). |
| **Notifications & retention** | Reminders about deadlines, and **Keep appraisal records for (years)**. Finalized appraisals are never deleted automatically. |

Save the page; "Configuration saved" confirms.

## Criteria and questions

Open **Criteria & questions**. **Criteria** group questions (for example Teaching quality). Each question has the people it is **Asked of**, the **Employee categories** it applies to, whether it **Counts towards the score**, an optional comment, and **Confidential (staff reviewers only)**. A **template** picks the questions for one kind of appraisal; editing a template creates a new version, and running cycles keep the version they were published with. A criterion that still has questions cannot be deleted.

[Open Configuration](route:appraisal.configuration)
