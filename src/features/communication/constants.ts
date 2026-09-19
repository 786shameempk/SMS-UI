import type { AudienceType, Channel, MessageStatus } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const CHANNELS: Array<{ value: Channel; label: string; simulated: boolean }> = [
  { value: "email", label: "Email", simulated: true },
  { value: "sms", label: "SMS", simulated: true },
  { value: "push", label: "Push", simulated: true },
  { value: "whatsapp", label: "WhatsApp", simulated: true },
  { value: "in-app", label: "In-app", simulated: false },
];

export const AUDIENCE_TYPE_OPTIONS: Array<{ value: AudienceType; label: string }> = [
  { value: "students", label: "Students" },
  { value: "staff", label: "Staff" },
  { value: "parents", label: "Parents" },
];

export const MESSAGE_STATUS_CONFIG: Record<MessageStatus, { label: string; variant: BadgeVariant }> = {
  scheduled: { label: "Scheduled", variant: "warning" },
  sent: { label: "Sent", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

/** Simulated per-channel delivery success rate, used only to generate realistic-looking demo delivery logs. */
export const CHANNEL_SUCCESS_RATE: Record<Channel, number> = {
  email: 0.97,
  sms: 0.93,
  push: 0.9,
  whatsapp: 0.95,
  "in-app": 1,
};

export const TEMPLATE_CATEGORIES = ["Announcement", "Fee Reminder", "Exam Notice", "Event", "Emergency", "General"];
