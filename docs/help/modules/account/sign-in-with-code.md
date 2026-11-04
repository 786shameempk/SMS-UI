---
id: account-sign-in-with-code
title: Sign in with a one-time code (mobile number or email)
module: account
kind: task
access: public
route: account.login
summary: Sign in with a six-digit code sent by SMS to your verified mobile number, or by email, instead of a password.
order: 15
status: reviewed
related: [account-sign-in, account-verify-mobile-number, account-sign-in-problems]
tasks:
  - id: sign-in-with-otp
    label: Sign in with a code
    phrases: [sign in with otp, otp login, login with mobile number, sign in with phone number, sign in with sms code, sign in with email code, one time password, one-time code, verification code, login without password, forgot password sign in with code]
keywords: [otp, mobile otp, email otp, sms code, resend code, verification code]
---

Use this when you want to sign in without typing your password. School Sphere sends a six-digit code to your mobile number or your email address and you type the code to get in.

## Before you start

- Your school must have turned on code sign-in. If the sign-in page only shows the password form, the options are not available for your school yet. Ask your administrator.
- **Mobile OTP** works only for a mobile number you have already verified. See [Verify your mobile number](help:account-verify-mobile-number).
- **Email OTP** works for the email address your account was created with.
- Principals, administrators and the Super Admin keep to their password unless the platform has allowed otherwise.

## Steps

1. Open the sign-in page.
2. Above the form, choose **Mobile OTP** or **Email OTP**. The options appear only when code sign-in is on. School Sphere remembers your last choice on this device.
3. Type your **Mobile number** (or your **Email address**) and select **Send code**.
4. Type the code into **Verification code**. It has six digits and expires after a few minutes.
5. Select **Verify and sign in**. The **Dashboard** opens.

If the code does not arrive, wait for the **Resend code in** timer to finish and select **Resend code**. To use a different number or address, select **Change mobile number** or **Change email address**.

## If your number belongs to more than one account

After the code is checked you may see "This number is used by more than one account. Choose the one to sign in to." Pick your own account and continue.

## Good to know

- The page always says the same thing whether or not the number or address is registered ("If … is registered, we've sent a code"). This keeps other people from finding out who has an account.
- Five wrong guesses cancel that code; request a new one. Too many requests in a short time are slowed down, so wait before trying again.
- Signing in with a code never asks you to change a temporary password first. If you were given a temporary password, you can change it later in [Security settings](help:account-security-settings).
- Password sign-in always keeps working. See [Sign in to School Sphere](help:account-sign-in).

> **Note:** The same options are in the School Sphere mobile apps (Student, Teacher and Staff), on their sign-in screen.

[Open the sign-in page](route:account.login)
