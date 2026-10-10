---
id: extracurricular-groups
title: Houses, groups and shuffling students
module: extracurricular
kind: task
access: public
roles: [admin, principal, teacher]
route: extracurricular.groups
summary: Create any number of houses or groups, place students by hand or shuffle them, and lock the result.
order: 40
status: reviewed
related: [extracurricular-activities]
tasks:
  - id: create-houses
    label: Create houses or groups
    phrases: [create houses, set up houses, create groups, house system, add house, divide students into houses]
    route: extracurricular.groups
  - id: shuffle-students
    label: Shuffle students into groups
    phrases: [shuffle students, assign students to houses, random houses, redistribute students, balance houses, allocate students]
    route: extracurricular.groups
keywords: [house, group, club, team, shuffle, lock, history, allocation, balance]
---

## Create the groups

1. Open **Extra-Curricular**, then **Houses & groups**.
2. Choose the **Kind** (House, Team, Club, Activity group or Mixed group) and the academic year.
3. Select **Create groups**, enter **How many** (1 to 50) and a **Name prefix**, or type your own names one per line.

## Place students

- Open **Members** on a group and use **Add students** to pick from students who have no group of this kind yet.
- Or select **Shuffle students**.

## Shuffle

1. Select **Shuffle students**.
2. Choose **How to spread students**: equal numbers, pure random, or balanced by class, grade or gender.
3. Choose **Who to include**: only students without a group, or everyone.
4. Select **Preview shuffle**. Nothing is saved yet. You see how many move and each group's size before and after, and can open **See every move**.
5. Select **Shuffle again** for a different result. **Recalculate (same seed)** repeats the same one.
6. Add a note, then **Confirm and save**.

## Lock and history

**Lock** on a group keeps its members through any later shuffle. Changing a locked group by hand asks for an override. **History** lists every move with who made it and why.

> **Note:** By default a student has one house at a time. Moving them replaces the old one and is recorded in the history. A school can change this in Settings.
