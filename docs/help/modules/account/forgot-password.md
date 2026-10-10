---
id: account-forgot-password
title: Reset a forgotten password
module: account
kind: task
access: public
route: account.forgot-password
summary: Ask for an email with a link that lets you choose a new password.
order: 20
status: reviewed
related: [account-sign-in, account-sign-in-problems, account-temporary-password]
tasks:
  - id: forgot-password
    label: Reset a forgotten password
    phrases: [forgot password, reset password, i forgot my password, cannot remember password, recover account, password recovery]
keywords: [recover, reset link, email]
---

## Steps

![The Forgot password page with an Email field and the Send reset link button.](shot:account-forgot-password-desktop "The forgot password page.")

1. On the sign-in page, select **Forgot password?** (or open the forgot password page directly).
2. Type your **Email** address. This field is required; "Email is required" and "Enter a valid email" appear if it is empty or not an email address.
3. Select **Send reset link**.
4. The page changes to **Check your inbox**: "If that email is registered, a reset link is on its way. It may take a few minutes to arrive."
5. Open the email and select the link. It opens **Set a new password**.
6. Type a **New password** of at least 8 characters, type it again in **Confirm password**, and select **Reset password**.
7. You see "Password reset — please sign in". Sign in with the new password.

## Checks on the new password

| Field | Rule | Message |
|---|---|---|
| **New password** | At least 8 characters | "Must be at least 8 characters" |
| **Confirm password** | Must be filled and match | "Please confirm your password" / "Passwords do not match" |

## If the link does not work

A link that is incomplete or no longer valid shows "This link is invalid or incomplete. Please request a new one from the forgot password page." Request a new link and use that one.

> **Note:** For safety, the page gives the same "Check your inbox" message whether or not the address is registered, so it cannot be used to find out who has an account.

[Open the forgot password page](route:account.forgot-password)
