import type { UserRole } from "@/types/auth";

export type NotificationCategory = "announcement" | "academic" | "finance" | "event" | "system" | "alert";

export interface Notification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  createdAt: string;
  read: boolean;
  /** Omitted = visible to everyone; set = visible only to users with this role. */
  recipientRole?: UserRole;
  actionLabel?: string;
  actionUrl?: string;
  sourceModule?: string;
}

export type AnnouncementAudience = "everyone" | UserRole;

export interface AnnouncementFormValues {
  title: string;
  body: string;
  category: NotificationCategory;
  audience: AnnouncementAudience;
  actionUrl?: string;
}
