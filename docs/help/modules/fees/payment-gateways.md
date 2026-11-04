---
id: fees-payment-gateways
title: Set up online payment gateways
module: fees
kind: task
access: admin
roles: [admin, principal, accountant]
route: fees.home
summary: Save your school's own gateway keys, test them, choose the default and register the webhook address.
order: 50
status: reviewed
related: [fees-record-payment, fees-previous-dues]
tasks:
  - id: setup-payment-gateway
    label: Set up online payments
    phrases: [payment gateway, accept online payments, razorpay, stripe, cashfree, payu, online fee payment, gateway keys, webhook, pay online setup]
    route: fees.home
keywords: [gateway, razorpay, stripe, cashfree, payu, test mode, live, webhook, keys]
---

Online payment lets parents pay invoices in the app. Each school saves its own gateway keys; they are stored encrypted and only shown partly hidden afterwards.

## Save a gateway

1. Open **Fee Management** and choose **Payment gateways**.
2. Find the provider you use. Each card shows its state: **Not set up**, **Switched off**, **Test mode**, **Live**, or **Using the platform account** (the platform's shared account is used until your school saves its own keys).
3. Choose **Mode**: **Test (no real money)** while you try it, **Live (real money)** when ready.
4. Enter the keys. The page labels what each one is; **Test keys** are separate from live ones. A saved secret shows a hint ("Saved ... Leave empty to keep it.").
5. Switch on "Accept payments with ..." and select **Save ...**.

School Sphere checks the keys with the provider: "Keys checked ...: accepted." or "The keys were not accepted". Use **Offer first** to choose which gateway parents see first when you have several (the one marked **Default**).

## Register the webhook

Providers confirm payments by calling a **Webhook address**. Select **Copy** ("Webhook URL copied") and paste it into the provider's dashboard, and use the **Webhook secret** field where the card offers one. If the page says the address appears once the server's public address is configured, ask whoever hosts School Sphere to set it.

## Remove keys

Select **Remove keys** and confirm "Remove ... keys?" to stop using a gateway.

Watch results on the **Gateway activity** tab.

> **Warning:** Test mode never moves real money. Switch to live only after a test payment shows up correctly.

[Open Fee Management](route:fees.home)
