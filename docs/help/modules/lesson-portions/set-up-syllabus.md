---
id: lesson-portions-set-up-syllabus
title: Set up a syllabus
module: lesson-portions
kind: task
access: public
roles: [admin, principal]
route: lesson-portions.syllabus
summary: Add a curriculum, create a syllabus for a class and subject, add chapters and topics (or import them), and publish it.
order: 10
status: reviewed
related: [lesson-portions-plan-lessons, lesson-portions-settings]
tasks:
  - id: create-syllabus
    label: Create a syllabus
    phrases: [create syllabus, add chapters, add topics, set up syllabus, import syllabus, syllabus template, new syllabus version, curriculum, cbse icse kerala]
    route: lesson-portions.syllabus
keywords: [syllabus, curriculum, chapters, topics, import, csv, template, version, publish]
---

## Add a curriculum

1. Open **Lesson & Portions**, then **Syllabus**, then the **Curricula** tab.
2. Select **Add curriculum**. Give it a name (for example CBSE 2026), choose the board (CBSE, ICSE, Kerala State Board, International Baccalaureate, Cambridge or Other) and save.

A curriculum that has syllabus plans cannot be deleted; mark it inactive instead.

## Create the syllabus

1. On the **Syllabus plans** tab select **New syllabus**.
2. Choose the curriculum, academic year, class and subject, and give it a title. Add when teaching starts and when the syllabus must be complete, and optionally the textbooks, reference materials and learning objectives.
3. Select **Create syllabus**. It starts as a **Draft**.

There can be only one syllabus for the same year, class, subject, curriculum and version. To change a published syllabus later, choose **New version** from its row menu; the new version is a draft copy, and publishing it archives the old one.

## Add chapters and topics

Open the syllabus. Select **Add chapter** and give it a title, planned periods, an optional weight and a deadline. Each chapter starts with one whole-chapter topic; select **Add topic** to break it down, and the small list icon on a topic to add subtopics. Use the arrows to reorder.

Progress is recorded on topics (or on subtopics when a topic has them). A chapter, topic or subtopic that already has teaching records, lesson plans or an exam portion cannot be deleted; create a new version without it instead.

## Import from a file

1. Open the syllabus and select **Import CSV**. Select **Download template** to see the columns: Chapter, Topic, Subtopic, Periods, Deadline and Objectives.
2. Fill it in (in Excel, use Save As, CSV UTF-8) and choose the file. The screen tells you how many rows are ready and lists any row it cannot read.
3. Select **Import**. Everything is added together, or nothing is. Switch on **Replace the existing chapters** to start over; that is refused once teaching has been recorded.

## Templates for next year

From a syllabus's row menu choose **Save as template**. On the **Templates** tab, **Use for a new year** copies it into an academic year for the classes you choose. Chapter dates move by the same number of days as the new start date. Classes that already have the syllabus are skipped.

## Publish

Select **Publish**. Teachers can then record progress against it and it appears in dashboards. Archiving stops new records but keeps the old ones.

> **Note:** Every change to a syllabus, including deadline changes, is kept in the audit trail under **Settings**.
