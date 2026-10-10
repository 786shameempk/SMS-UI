---
id: hostel-allocate-student
title: Add a hostel and allocate a student to a room
module: hostel
kind: task
access: public
route: hostel.home
summary: Create a hostel, then give a student a room and bed.
order: 10
status: reviewed
tasks:
  - id: add-hostel
    label: Add a hostel
    phrases: [add a hostel, new hostel, create a hostel]
    route: hostel.home
  - id: allocate-hostel-room
    label: Allocate a student to a hostel room
    phrases: [allocate hostel room, hostel allocation, assign student to hostel, give a student a bed, vacate hostel room]
    route: hostel.home
keywords: [hostel, room, bed, warden, allocation, monthly fee, vacate]
---

Use this to set up a hostel and place students in it.

## Add a hostel

1. Open **Hostel** from the menu. The page is headed **Hostel management**; stay on the **Hostels & Rooms** tab.
2. Select **New hostel**.
3. Enter the **Hostel name**, choose the **Type** (boys, girls or co-ed) and the **Status** (active or inactive).
4. Optionally choose the **Warden** and enter an **Address**. The warden list shows only staff with the designation "Warden" who are not already assigned elsewhere.
5. Select **Create hostel** ("Hostel created"). "Hostel name is required" appears if the name is empty.

Rooms and beds are managed from the hostel's row on the same tab.

## Allocate a student

1. Open the **Student Allocation** tab and select **Allocate student**.
2. Choose the **Student**, the **Hostel** and the **Room**. Only rooms with a free bed are offered. A **Monthly fee** is optional.
3. Select **Allocate** ("Student allocated"). The checks are "Select a student", "Select a hostel" and "Select a room".

## Vacate or remove an allocation

On the allocation's row, **Vacate** ends it ("Allocation vacated"). **Remove** deletes the record after you confirm; it cannot be undone.

[Open Hostel](route:hostel.home)
