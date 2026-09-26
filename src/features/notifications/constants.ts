import type { AnnouncementAudience, NotificationCategory } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; variant: BadgeVariant }> = {
  announcement: { label: "Announcement", variant: "info" },
  academic: { label: "Academic", variant: "info" },
  finance: { label: "Finance", variant: "warning" },
  event: { label: "Event", variant: "success" },
  system: { label: "System", variant: "neutral" },
  alert: { label: "Alert", variant: "danger" },
  talent: { label: "Talent Showcase", variant: "default" },
  meeting: { label: "Online Classes", variant: "info" },
};

export const AUDIENCE_OPTIONS: Array<{ value: AnnouncementAudience; label: string }> = [
  { value: "everyone", label: "Everyone" },
  { value: "admin", label: "Admins" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teachers" },
  { value: "accountant", label: "Accountants" },
  { value: "librarian", label: "Librarians" },
  { value: "receptionist", label: "Receptionists" },
  { value: "parent", label: "Parents" },
  { value: "student", label: "Students" },
];
