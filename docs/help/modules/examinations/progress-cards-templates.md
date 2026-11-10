---
id: examinations-progress-cards-templates
title: Choose a progress card template, design your own and set the grading rules
module: examinations
kind: task
roles: [admin, principal]
access: public
route: progress-cards.home
summary: Copy a built-in CBSE or Kerala template, customise the layout, confirm the grading scheme, and assign templates to classes.
order: 31
status: reviewed
related: [examinations-progress-cards-generate]
tasks:
  - id: progress-card-template
    label: Copy or design a progress card template
    phrases: [progress card template, design progress card, custom report card layout, cbse progress card, kerala progress card, copy template]
    route: progress-cards.home
  - id: progress-card-grading
    label: Set up grading rules
    phrases: [grading scheme, grade boundaries, pass mark for progress card, confirm grading, optional subject, additional subject]
    route: progress-cards.home
keywords: [template, designer, grading, boundaries, rounding, pass mark, CBSE, Kerala, assignment, optional subject, additional subject]
---

## Templates

Open **Progress Card Generator** and the **Template library** tab. The library lists 12 built-in templates for CBSE and Kerala State, and your school's own.

- Built-in templates are read-only. Use the eye icon to preview one, and the copy icon (**Copy to my school**) to make your own editable copy.
- **Create template** starts a blank one. **Edit** opens the designer. Every save is a new version, and cards already made keep their version.
- **Deactivate** or **Archive** hides a template. A template assigned to a class cannot be archived.

The designer has the settings on the left and a live preview on the right. Set the page size (A4 or A5), orientation, font, colours and margin; reorder sections by dragging or with the arrows, hide or remove them, and add new ones (header, student details, marks table, result summary, attendance, co-scholastic, remarks, custom text, custom table, signatures). For the marks table you choose the columns and their widths. Type the school name, address and affiliation into the header section; they are the ones saved under **Settings** → **School profile** → **Affiliation**.

## Grading configuration

Built-in schemes are only starting points, checked against published guides and not against the board's own circular. A card is never graded from them directly.

1. Open **Grading configuration** and choose **Use** on a board pattern. It is copied to your school.
2. Check the **Grade boundaries**, **Subject pass mark (%)**, **Overall result rule**, **Decimal places** and **Rounding** against the circular your school follows, and edit what differs.
3. **Save changes**, then **I have checked these against the board guideline**. Editing a scheme clears this confirmation.

**Optional and additional subjects, and subject grading** lets you mark a subject as **Optional** (counted only for students who have marks in it) or **Additional** (shown and graded but left out of the total, percentage and result), and give a subject its own confirmed grading scheme.

## Assign templates to classes

Under **Which template each class uses**, choose a **Template**, a **Grading scheme** and a **Class**, **Exam type** or **School default**, then **Assign**. The generator picks the most specific match: class and exam type, then class, then exam type, then the school default.
