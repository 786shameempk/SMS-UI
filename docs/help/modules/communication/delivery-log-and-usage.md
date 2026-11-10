---
id: communication-delivery-log
title: Track deliveries and message usage
module: communication
kind: task
access: public
route: communication.home
summary: See every message sent, who got it, whether it arrived and what it cost, and export the list.
order: 30
status: reviewed
related: [communication-send-message, communication-rules]
tasks:
  - id: delivery-log
    label: Check if a message was delivered
    phrases: [delivery log, was the message delivered, did the parent get the message, failed messages, message status, export deliveries, why was a message not sent]
    route: communication.home
  - id: message-usage
    label: See message usage and cost
    phrases: [message usage, how many messages sent, sms cost, whatsapp cost, usage report, monthly quota]
    route: communication.home
keywords: [delivery, log, usage, cost, status, failed, bounced, skipped, standby, fallback, export csv, quota]
---

Two tabs of **Communication Center** show what happened after you sent a message.

## Delivery log

1. Open **Communication Center** and select **Delivery log**.
2. Narrow the list with the filters: **From** and **To** dates, **All channels**, **All statuses**, **Event, e.g. fee.reminder**, and **Recipient name, phone or email**.
3. Read each row: **When**, **Recipient**, **Channel**, **Event**, **Status**, **Provider**, **Tries** and **Cost**. A row marked **fallback** was sent because an earlier channel failed. A row marked **Broadcast** came from a message you composed.
4. Use **Previous** and **Next** to move through the pages. The total appears as "{n} deliveries".
5. Select **Export CSV** to download the filtered list, or **Print**.

### What the statuses mean

| Status | Meaning |
|---|---|
| queued, sending | Waiting to go out or being handed to the provider. |
| sent | The provider accepted it. |
| delivered, read | The provider confirmed it reached the phone or inbox (and, for WhatsApp, was opened). |
| failed, bounced | It did not arrive. A bounced address is not tried again. |
| skipped | It was not attempted: the person opted out, there was no provider or approved template, or no contact detail. The reason is recorded. |
| standby | A fallback channel waiting in case the earlier channels fail. It costs nothing unless it is released. |

## Usage

1. Select the **Usage** tab and choose a **From** and **To** date.
2. Read the totals: **Messages attempted**, **Delivered**, **Failed or bounced**, **Skipped** and **Estimated cost**.
3. Use **By day** and the **Channel** and **Provider** breakdowns to see where the volume and cost come from.

The cost is an estimate from the price per message you entered in **Settings**, so it may differ from your provider's invoice.

> **Note:** If a message you expected is missing, check its status in the **Delivery log** first. "Skipped" with a reason usually points to consent, a missing template or an unconnected provider; see [Connect providers and manage consent](help:communication-consent-providers).
