---
id: communication-consent-providers
title: Connect providers and manage consent
module: communication
kind: task
access: admin
route: communication.home
summary: Connect the email, SMS and WhatsApp providers your school uses, record opt-ins and opt-outs, and review the audit trail.
order: 40
status: reviewed
related: [communication-rules, communication-delivery-log]
tasks:
  - id: connect-provider
    label: Connect an SMS, email or WhatsApp provider
    phrases: [connect sms provider, connect whatsapp, email provider, messaging settings, test message provider, monthly message quota, sender id]
    route: communication.home
  - id: record-consent
    label: Record opt-in or opt-out
    phrases: [opt out, opt in, record consent, parent stopped messages, do not contact, whatsapp opt in, unsubscribe]
    route: communication.home
keywords: [provider, settings, secret, quota, consent, opt-in, opt-out, suppression, bounce, audit, whatsapp, sms, email]
---

Messages only leave School Sphere through the providers connected for your school. Two administrator tabs control this: **Settings** and **Consent & audit**.

## Connect a provider

1. Open **Communication Center** and select **Settings**.
2. For each channel (**Email**, **SMS**, **WhatsApp**), choose the **Provider** and fill in its details. Until you connect your own, the page says the platform's provider is used.
3. Secrets are stored encrypted and are never shown again. A saved secret shows as "•••••••• stored". Leave a secret field empty to keep the stored value.
4. Set the limits you need: **Monthly quota (messages)**, **Max per day**, **Max per minute**, and **Alert administrators at (% of quota)**.
5. Enter **Your price per message (for usage reports)** if you want cost estimates in **Usage**.
6. If the provider needs a callback address, copy the **Webhook URL** shown on the page into the provider's dashboard.
7. Select **Save**. A "settings saved" message appears.
8. Use **Send test** with a phone number or email address to check the connection. **Last test** shows the result.

## Record consent

1. Select the **Consent & audit** tab.
2. Under **Consent and preferences**, enter a **Phone or email**, choose the channel and enter the **Source**, for example "parent request".
3. Select **Record opt-in** or **Record opt-out**.

Opt-outs are respected for every ordinary notification. Mandatory notifications (one-time codes, emergencies) still go out. A bounced address cannot be re-enabled here.

### WhatsApp opt-ins

WhatsApp only goes to people who agreed to receive it. In **Settings**, either confirm "Opt-in collected at admission" for the whole school, or record numbers one per line under **WhatsApp opt-ins** with the **Opt-in source**, for example "Admission form 2026". Anyone who replies STOP is never messaged again.

### Do not contact

**Do not contact** lists opt-outs, bounced addresses and spam complaints. They are skipped automatically. You can add an address to suppress, or remove one that was added by mistake.

## Audit trail

**Audit trail** on the **Consent & audit** tab shows who changed providers, rules, templates and consent, and when. Secrets are never recorded.

> **Warning:** Do not record an opt-in unless the person really agreed. Keep the source specific so you can show where the agreement came from.
