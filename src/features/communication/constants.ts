import type { AudienceType, Channel, MessageStatus } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const CHANNELS: Array<{ value: Channel; label: string }> = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "in-app", label: "In-app" },
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

export const TEMPLATE_CATEGORIES = ["Announcement", "Fee Reminder", "Exam Notice", "Event", "Emergency", "General"];

/** Languages a template can be written in (kept separate from the app's own UI language). */
export const TEMPLATE_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ml", label: "Malayalam" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "ar", label: "Arabic" },
];
