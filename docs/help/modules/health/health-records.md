---
id: health-record-checkup-visit
title: Record a checkup, a vaccination or an infirmary visit
module: health
kind: task
access: public
route: health.home
summary: Log a student's health checkup, schedule and complete vaccinations, and record infirmary visits.
order: 10
status: reviewed
tasks:
  - id: record-checkup
    label: Record a health checkup
    phrases: [record a checkup, health checkup, medical checkup, height and weight, vision test]
    route: health.home
  - id: schedule-vaccination
    label: Schedule a vaccination
    phrases: [schedule a vaccination, vaccination due, record vaccine, mark vaccination done]
    route: health.home
  - id: log-infirmary-visit
    label: Log an infirmary visit
    phrases: [infirmary visit, student sick at school, sick room, log a medical visit]
    route: health.home
keywords: [health, medical, checkup, vaccination, infirmary, temperature, symptoms]
---

Health records contain sensitive information about students. Only record what your school's policy asks for.

## Record a checkup

1. Open **Health & Medical** from the menu and open the **Checkups** tab.
2. Select **Record checkup**.
3. Choose the **Student**, set the **Checkup date**, and enter **Height (cm)** and **Weight (kg)**.
4. Enter **Vision (left eye)** and **Vision (right eye)**. Dental remarks, general remarks and **Examined by** are optional.
5. Select **Save checkup** ("Checkup recorded").

Height must be 30 to 250 cm and weight 5 to 200 kg, otherwise you see "Enter a valid height" or "Enter a valid weight".

## Schedule and complete a vaccination

1. Open the **Vaccinations** tab and select **Schedule vaccination**.
2. Choose the **Student**, enter the **Vaccine name** and **Dose number** (at least 1), and set the **Due date**.
3. Select **Schedule vaccination** ("Vaccination scheduled").
4. When it is given, choose **Mark administered** on its row, complete **Mark as administered** and confirm ("Marked as administered").

## Log an infirmary visit

1. Open the **Infirmary Visits** tab and select **Log visit**.
2. Choose the **Student** and set the **Visit date/time**.
3. Describe the **Symptoms** and the **Treatment given**. **Temperature °C** (30 to 45), **Medicine given** and **Attended by** are optional.
4. Choose the **Outcome** and select **Log visit** ("Infirmary visit logged").

The checks are "Describe the symptoms" and "Describe the treatment given".

## Reports

The **Reports** tab shows **Overdue vaccinations** (past their due date with no dose administered, so you can follow up with these families), **Upcoming vaccinations**, **Infirmary visit outcomes** and **BMI distribution** (based on each student's most recent checkup).


[Open Health & Medical](route:health.home)
