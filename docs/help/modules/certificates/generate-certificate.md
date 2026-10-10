---
id: certificates-generate
title: Generate a certificate
module: certificates
kind: task
access: public
route: certificates.home
summary: Create a bonafide, transfer, character, study, achievement or staff service certificate.
order: 10
status: reviewed
tasks:
  - id: generate-certificate
    label: Generate a certificate
    phrases: [generate a certificate, bonafide certificate, transfer certificate, character certificate, study certificate, issue a certificate]
    route: certificates.home
keywords: [certificate, bonafide, transfer, character, study, achievement, staff service, purpose]
---

Use this to produce a certificate for a student or staff member.

## Steps

1. Open **Certificates** from the menu. The page is headed **Certificate generator**; stay on the **Generate** tab.
2. Choose the **Certificate type**: **Bonafide Certificate**, **Transfer Certificate**, **Character Certificate**, **Study Certificate**, **Achievement Certificate** or **Staff Service Certificate**.
3. Choose the **Student** (or the **Staff member** for a staff service certificate).
4. Fill in what the type needs:
   - **Purpose** is optional, for example for a passport application.
   - **Study Certificate**: **From** and **To** dates are required.
   - **Achievement Certificate**: **Event**, **Achievement** and **Event date** are required.
5. Select **Generate certificate**.

A message shows the new certificate number. The checks include "Start date is required", "End date is required", "Event name is required", "Achievement is required" and "Event date is required".

Past certificates are on the **Issued Certificates** tab.

[Open Certificates](route:certificates.home)
