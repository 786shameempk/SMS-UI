import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { UserRole } from "@/types/auth";
import type { AnnouncementFormValues, Notification, NotificationCategory } from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// EngagementService's enums serialize as PascalCase; see docs/MICROSERVICES_PLAN.md.

const CATEGORY_TO_API: Record<NotificationCategory, string> = {
  announcement: "Announcement",
  academic: "Academic",
  finance: "Finance",
  event: "Event",
  system: "System",
  alert: "Alert",
};
const CATEGORY_FROM_API: Record<string, NotificationCategory> = {
  Announcement: "announcement",
  Academic: "academic",
  Finance: "finance",
  Event: "event",
  System: "system",
  Alert: "alert",
};

interface ApiNotification {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  read: boolean;
  recipientRole: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  sourceModule: string | null;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function mapNotification(n: ApiNotification): Notification {
  return {
    id: n.id,
    tenantId: n.tenantId,
    title: n.title,
    body: n.body,
    category: CATEGORY_FROM_API[n.category],
    createdAt: n.createdAt,
    read: n.read,
    recipientRole: (n.recipientRole as UserRole | null) ?? undefined,
    actionLabel: n.actionLabel ?? undefined,
    actionUrl: n.actionUrl ?? undefined,
    sourceModule: n.sourceModule ?? undefined,
  };
}

/** Everything, regardless of audience — used by the admin-facing announcement history. */
export async function listNotifications(): Promise<Notification[]> {
  return (await unwrap(engagementHttpClient.get<ApiNotification[]>("api/Notifications"))).map(mapNotification);
}

/** Only what the currently logged-in user's roles can see. `read` is this user's own read state. */
export async function listMyNotifications(): Promise<Notification[]> {
  return (await unwrap(engagementHttpClient.get<ApiNotification[]>("api/Notifications/mine"))).map(mapNotification);
}

export async function getUnreadCountForCurrentUser(): Promise<number> {
  const { count } = await unwrap(engagementHttpClient.get<{ count: number }>("api/Notifications/mine/unread-count"));
  return count;
}

export async function postAnnouncement(values: AnnouncementFormValues): Promise<Notification> {
  return mapNotification(
    await unwrap(
      engagementHttpClient.post<ApiNotification>("api/Notifications", {
        title: values.title,
        body: values.body,
        category: CATEGORY_TO_API[values.category],
        audience: values.audience,
        actionUrl: values.actionUrl?.trim() || null,
      }),
    ),
  );
}

export async function markRead(id: string): Promise<Notification> {
  return mapNotification(await unwrap(engagementHttpClient.post<ApiNotification>(`api/Notifications/${id}/read`)));
}

export async function markAllReadForCurrentUser(): Promise<void> {
  await unwrap(engagementHttpClient.post("api/Notifications/mine/read-all"));
}

export async function deleteNotification(id: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/Notifications/${id}`));
}
