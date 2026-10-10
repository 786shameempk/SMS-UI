---
id: account-sign-in
title: Sign in to School Sphere
module: account
kind: task
access: public
route: account.login
summary: Sign in with your email address and password.
order: 10
status: reviewed
related: [account-forgot-password, account-sign-in-problems, account-overview]
tasks:
  - id: sign-in
    label: Sign in
    phrases: [sign in, log in, login, open my account, get into school sphere]
keywords: [email, password, remember me, welcome back]
---

Use this when you want to open School Sphere with your own account.

## Before you start

- Your school administrator must have created your account. Ask them if you do not have an email address and password.
- Use the address of your school's School Sphere site.

## Steps

1. Open the sign-in page. It is headed **Welcome back!**
2. Type your **Email address**.
3. Type your **Password**. Select the eye button at the end of the field if you want to see what you typed.
4. Leave **Remember me** ticked if you want to stay signed in on this device.
5. Select **Sign In**.

![The School Sphere sign-in page with the Email address and Password fields and the Sign In button.](shot:account-sign-in-desktop "The sign-in page.")

After a short "Signed in" confirmation and a welcome message with your first name, the **Dashboard** opens.

## Fields and checks

| Field | Required | What is checked |
|---|---|---|
| **Email address** | Yes | Shows "Enter your email address" if empty and "That doesn't look like a valid email" if it is not an email address. |
| **Password** | Yes | Shows "Enter your password" if empty. |
| **Remember me** | No | Ticked by default. |

## Other options on the page

- **Forgot password?** opens [Reset a forgotten password](help:account-forgot-password).
- **Sign in with Google** is shown, but selecting it only shows the message "Google sign-in isn't enabled for your school yet."
- **Exploring the demo? Use a sample account** is for demonstration sites. It fills the form with a sample account so you can look around.

> **Note:** If the sign-in fails, a message appears above the form. Changing either field clears it. See [Sign-in problems](help:account-sign-in-problems).

[Open the sign-in page](route:account.login)
