---
id: examinations-progress-cards-generate
title: Generate, approve and publish progress cards
module: examinations
kind: task
roles: [admin, principal, teacher]
access: public
route: progress-cards.home
summary: Check the marks, preview each student's progress card, save the cards as drafts, then approve and publish them to parents and students, or download them as PDF.
order: 30
status: reviewed
related: [examinations-progress-cards-templates, examinations-progress-cards-family]
tasks:
  - id: generate-progress-cards
    label: Generate progress cards for a class
    phrases: [generate progress cards, create progress cards, make report cards for a class, bulk progress cards, class progress cards]
    route: progress-cards.home
  - id: publish-progress-cards
    label: Approve and publish progress cards
    phrases: [publish progress cards, approve progress cards, send progress cards to parents, unpublish progress card]
    route: progress-cards.home
  - id: download-progress-card-pdf
    label: Download progress cards as PDF or ZIP
    phrases: [progress card pdf, download progress card, bulk pdf, zip of progress cards, print progress cards]
    route: progress-cards.home
  - id: coscholastic-grades
    label: Enter co-scholastic grades and subject remarks
    phrases: [co-scholastic grades, subject remarks, activity grades on progress card, art education grade]
    route: progress-cards.home
keywords: [progress card, report card, generate, publish, approve, pdf, zip, co-scholastic, weighted exams, class teacher]
---

Open **Progress Card Generator** under **Academics** in the menu. Marks, attendance and remarks come from the school's existing records, so nothing is typed twice. You need a template and a confirmed grading scheme first; see [Templates, grading and assignments](help:examinations-progress-cards-templates).

## Who can do what

| Action | Who |
|---|---|
| Generate, preview, print and download | Leaders for every class. A class teacher only for their own class. |
| Approve, publish, unpublish | School leaders (principal, administrator) unless the school's role settings say otherwise. |
| Templates, grading schemes, assignments, subject rules | School leaders. |

If you are not allowed, the screen shows the reason and nothing is changed.

## Generate cards

1. On the **Generate** tab choose the **Class** and the **Examination**. Leave **Template** and **Grading scheme** on **Use the class assignment**, or pick your own.
2. To combine exams, use **Weighted exams**: **Add exam** for each one and give it a **Weight**, for example Term 1 at 30 and the annual exam at 70. The main exam must be one of them. Each subject then shows a score out of 100.
3. Select **Check and preview**. **Checks before generating** lists problems. Missing marks and an exam that is not marked Completed are errors, and nothing can be saved until they are fixed. Absences are only warnings.
4. Click a student to see the card, and use the arrows to move between students. Tick the students you want, or **Select all**.
5. **Sample PDF** downloads the cards without saving. **Print** opens the print dialog. **Generate N as drafts** saves them.

## Approve and publish

1. Open **Cards and publishing** and filter by **Examination** or **Status**.
2. Tick cards and choose **Approve**, then **Publish**. Only approved cards can be published. Parents and students see a card only once it is published, and a notification goes to the parent.
3. **Unpublish** takes a card back. A published card cannot be regenerated until it is unpublished.
4. **Bulk PDF** makes one PDF with a page per student, **ZIP of PDFs** makes one file per student, and the download icon on a row gives that student's PDF.

Every card keeps the template version and grading scheme it was made with, so it can be reproduced later even if the template or marks change.

## Co-scholastic grades and subject remarks

1. Open the **Co-scholastic and remarks** tab and choose the exam.
2. Under **Enter**, choose **Co-scholastic grades** and type a grade per student for each area, or **Remarks on a subject** and pick the subject.
3. **Save**, then generate the cards again to include the changes.

The areas come from the co-scholastic section of the class's template. Class teachers can do this on the phone in the Teacher app under **Progress cards**.

> **Note:** The PDF is drawn on the server in Latin script. Names in Malayalam, Hindi or Tamil print correctly with **Print** from the browser, not in the server PDF.
