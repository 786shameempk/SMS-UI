---
id: students-profile
title: Work with a student's profile
module: students
kind: task
access: public
route: students.list
summary: Open a student's profile to add guardians, record medical details, set transport and hostel, upload documents, print an ID card and link their login.
order: 30
status: reviewed
related: [students-register, students-edit-transfer]
tasks:
  - id: add-guardian
    label: Add a guardian
    phrases: [add a guardian, add a parent to a student, add guardian details, change guardian phone, emergency contact]
    route: students.list
  - id: upload-student-document
    label: Upload a student document
    phrases: [upload a student document, add a document to a student, student documents, birth certificate upload]
    route: students.list
  - id: print-id-card
    label: Print a student ID card
    phrases: [print an id card, student id card, print student card]
    route: students.list
  - id: link-student-login
    label: Link a student's login
    phrases: [link a student login, give a student a login, link student account, student login account]
    route: students.list
keywords: [student profile, guardian, emergency contact, medical, allergies, transport, hostel, documents, id card, login]
---

## Open the profile

On **Academics > Students**, open the actions menu on the student's row and choose **View profile**. Use **Back to students** to return.

The profile has these tabs: **Overview**, **Guardian & Emergency**, **Medical**, **Transport & Hostel**, **Documents** and **ID Card**. **Learning profile** appears when the school's AI features include it, and **Logins** appears for administrators.

## Guardian & Emergency

- Select **Add guardian**, enter the **Name**, **Relation** (father, mother or guardian) and **Phone**, and optionally **Email** and **Occupation**, then **Save** ("Guardian details saved"). The checks are "Name is required" and "Phone is required". Each guardian can be edited or removed.
- Under the emergency contact, fill in the **Name**, **Relation** and **Phone** and select **Save emergency contact** ("Emergency contact saved").

## Medical

Enter the **Blood group**, **Allergies**, **Ongoing conditions**, **Current medications**, **Doctor name** and **Doctor phone**, then select **Save medical information** ("Medical information saved"). The button stays off until you change something.

## Transport & Hostel

Tick **Requires school transport**, then choose the **Route** from the list of active routes set up under Transport, and the **Pickup point** from that route's stops (choose the route first; changing the route clears the pickup point). Select **Save transport details** ("Transport details saved"). Under Hostel, tick **Resides in hostel**, choose the **Hostel** from the active hostels, then the **Room number** from that hostel's rooms that are in use, and save ("Hostel details saved"). Whatever was saved earlier is shown already chosen. If your account cannot read the transport or hostel lists, the fields are plain text boxes instead. If a list is empty, the field says "No routes set up", "No stops on this route", "No hostels set up" or "No rooms in this hostel"; add them in Transport or Hostel first.

## Documents

Select **Upload document** and choose a file ("Document uploaded"). The remove button deletes a document ("Document removed").

## ID Card

The tab shows the card with a QR code and barcode that encode the admission number, for scanning at gates and libraries. Select **Print ID card** to print it.

## Logins

Administrators see **Login accounts**, which links the record to the login that signs in as the student. Online classes use it to decide who can join. Choose the login in **Choose a login** (search by name or email) and select **Link** ("Login linked"), or **Unlink**.

[Open Students](route:students.list)
