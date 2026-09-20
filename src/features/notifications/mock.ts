import type { Notification } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

export const SEED_NOTIFICATIONS: Omit<Notification, "tenantId">[] = [
  {
    id: "ntf-1",
    title: "Welcome to EduCore",
    body: "Your account is set up. Explore the dashboard to get started.",
    category: "system",
    createdAt: daysAgo(14),
    read: true,
  },
  {
    id: "ntf-2",
    title: "Parent-Teacher Meeting scheduled",
    body: "A Parent-Teacher meeting has been scheduled for 25 September. Check the calendar for details.",
    category: "event",
    createdAt: daysAgo(3),
    read: false,
    actionLabel: "View calendar",
    actionUrl: "/calendar",
  },
  {
    id: "ntf-3",
    title: "Fee collection deadline approaching",
    body: "Term fee collection for several classes is due by the end of this month.",
    category: "finance",
    createdAt: hoursAgo(20),
    read: false,
    recipientRole: "accountant",
    actionLabel: "Open Fee Management",
    actionUrl: "/fees",
  },
  {
    id: "ntf-4",
    title: "New lesson plans due",
    body: "Please submit next week's lesson plans by Friday.",
    category: "academic",
    createdAt: hoursAgo(6),
    read: false,
    recipientRole: "teacher",
    actionLabel: "Open Teachers",
    actionUrl: "/teachers",
  },
  {
    id: "ntf-5",
    title: "Scheduled system maintenance",
    body: "The system will undergo brief maintenance this weekend. No action is required.",
    category: "system",
    createdAt: daysAgo(1),
    read: false,
  },
];
