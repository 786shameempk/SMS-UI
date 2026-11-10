---
id: communication-rules
title: Choose how automatic notifications are delivered
module: communication
kind: task
access: admin
route: communication.home
summary: Decide which channels each automatic notification uses, what to try if they fail, and switch fee reminders and absence alerts on.
order: 20
status: reviewed
related: [communication-send-message, communication-consent-providers, communication-delivery-log]
tasks:
  - id: notification-rules
    label: Set notification rules
    phrases: [notification rules, fallback channel, preferred channel, fee reminder channel, absence alert, turn on fee reminders, turn on absence alerts, automatic notifications, mandatory notification]
    route: communication.home
keywords: [rules, fallback, preferred channels, priority, mandatory, fee reminder, attendance absent, otp, emergency, event]
---

Other School Sphere modules ask Communication Center to send a notification when something happens: a fee reminder, an absence alert, an exam result. **Rules** decide how each of these events is delivered. Only administrators see the **Rules** tab.

## Open the rules

1. Open **Communication Center** from the menu.
2. Select the **Rules** tab. The **Notification rules** table lists each event with its **Preferred channels**, **Fallback, in order**, **Priority** and **Status**.

The **Status** column shows **Default** (the platform's setting) or **Customised** (your school changed it), and **Off** or **Mandatory** where they apply.

## Change a rule

1. On the event's row, select **Edit**.
2. Under **Send on (all at once)**, choose the channels to use together: **WhatsApp**, **SMS** or **Email**.
3. Under **If those fail for good, try (in the order picked)**, choose the fallback channels. They are tried in the order you select them.
4. Set the **Priority**.
5. Turn **Mandatory** on only for messages that must go even if the person opted out, such as one-time codes and emergencies. Bounced or invalid addresses are still skipped.
6. Use **Rule switched on** to turn the rule on or off, then select **Save**. A "Rule saved" message appears.

Select the reset icon on a customised row to return it to the platform default ("Back to the platform default").

## What fallback means

A fallback channel is used, and charged, only when the preferred channels failed for good: the provider refused the message after retries, the address bounced, or the channel could not be tried. If the preferred channel worked, the fallback is never sent.

> **Important:** Fee reminders and attendance alerts are sent automatically, so they stay **Off** until you switch them on here. Before you do, connect a provider for each channel in the rule and make sure the event has an approved template. Without a provider or template, the delivery is recorded as skipped with the reason. See [Connect providers and manage consent](help:communication-consent-providers).

> **Tip:** After switching a rule on, watch the first deliveries in the [Delivery log](help:communication-delivery-log).

## Pick the right channels

- Choose the channel your parents actually read. Many schools use **WhatsApp** or **SMS** first and **Email** as the fallback.
- Keep **Mandatory** for the few messages that cannot be missed. Ordinary notices should respect opt-outs.
