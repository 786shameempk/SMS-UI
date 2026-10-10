---
id: online-classes-manage
title: Reschedule, cancel or end an online class
module: online-classes
kind: task
access: public
roles: [admin, principal, teacher]
route: online-classes.home
summary: Change the time of a class, cancel it, end a live class for everyone, or end a repeating series.
order: 20
status: reviewed
related: [online-classes-schedule, online-classes-join]
tasks:
  - id: reschedule-class
    label: Reschedule an online class
    phrases: [reschedule a class, change class time, move an online class, postpone a class]
    route: online-classes.home
  - id: cancel-class
    label: Cancel an online class
    phrases: [cancel a class, cancel an online class, cancel a meeting, end a class series, end class for everyone]
    route: online-classes.home
keywords: [reschedule, cancel, end, series, recurring, draft, publish, delete, attendance final]
---

Open the class from the **Online Classes** list. Its page shows the actions you are allowed to use.

## Publish a draft

A class saved as a draft has a **Publish** button. Publishing tells everyone invited ("Published. Everyone invited has been notified.").

## Reschedule

1. Open the **More actions** menu and choose **Reschedule**.
2. Pick a new time. It must be in the future ("Pick a time in the future.").
3. For a repeating class, choose how far the change reaches: **Only this class**, **This and following** or **All upcoming**.
4. Select **Reschedule** ("Rescheduled. Everyone invited has been told."), or **Keep current time** to leave it.

## Cancel

1. Choose **Cancel class** (or **Cancel meeting**) from **More actions**.
2. For a repeating class, choose the same scope as above.
3. Confirm. The message is "The class is cancelled" or "Sessions cancelled". **Keep it** backs out.

## In the live room

From the class, **Start class** or **Join now** opens the live room. It has a **Chat** button for the class chat and, for the host, **Record** (which becomes **Stop recording**) and **End class**. Recording shows "Recording started" and then "Recording stopped. It'll appear under Recordings shortly.". If the video connection fails you see "Video connection problem" with the reason. When the class has ended or was cancelled, the room tells you and **Back to the class** returns to its page.

## End a live class

Select **End for everyone** and confirm **End the class for everyone?**. Everyone is disconnected and attendance becomes final ("Ended. Attendance is final."), though it can still be corrected afterwards.

## End a series, or delete

- **End the whole series** cancels every upcoming session and tells everyone invited; past sessions and their attendance are kept ("Series ended. Upcoming sessions are cancelled.").
- **Delete** removes it from everyone's list and cannot be undone.

## Calendar and reports

- **Calendar** on the Online Classes page opens the **Class calendar**, which shows classes by date.
- **Reports** opens **Online class reports**, which shows, for the period you choose with **From**, **To** and **Class**, how many classes there were in **Total**, how many were **Held** (with the teaching time), how many were **Cancelled**, and the **Average attendance** (present or late). Managers see every class and meeting in the school; teachers see the classes they host. The print button opens the print dialog, where you can choose "Save as PDF".


[Open Online Classes](route:online-classes.home)
