import { mockDelay } from "@/utils/mockDelay";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_TENANT_ID, getCurrentTenantId, migrateLegacyRecordsToDefaultTenant, scopedToCurrentTenant } from "@/utils/tenant";
import { SEED_NOTIFICATIONS } from "./mock";
import type { AnnouncementFormValues, Notification } from "./types";

const NOTIFICATIONS_KEY = "sms-mock-notifications";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let notifications = migrateLegacyRecordsToDefaultTenant(
  loadJson<Notification[]>(NOTIFICATIONS_KEY, SEED_NOTIFICATIONS.map((n) => ({ ...n, tenantId: DEFAULT_TENANT_ID }))),
);

const persist = () => saveJson(NOTIFICATIONS_KEY, notifications);

function currentUserRole() {
  return useAuthStore.getState().user?.role;
}

function visibleToCurrentUser(n: Notification): boolean {
  return (!n.recipientRole || n.recipientRole === currentUserRole()) && n.tenantId === getCurrentTenantId();
}

/** Everything, regardless of audience — used by the admin-facing announcement history. */
export async function listNotifications(): Promise<Notification[]> {
  return mockDelay(
    scopedToCurrentTenant(notifications).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    300,
  );
}

/** Only what the currently logged-in user is allowed to see. */
export async function listMyNotifications(): Promise<Notification[]> {
  const mine = notifications.filter(visibleToCurrentUser);
  return mockDelay(
    [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    300,
  );
}

export async function getUnreadCountForCurrentUser(): Promise<number> {
  return notifications.filter((n) => visibleToCurrentUser(n) && !n.read).length;
}

export async function postAnnouncement(values: AnnouncementFormValues): Promise<Notification> {
  const notification: Notification = {
    id: genId("ntf"),
    tenantId: getCurrentTenantId(),
    title: values.title,
    body: values.body,
    category: values.category,
    createdAt: new Date().toISOString(),
    read: false,
    recipientRole: values.audience === "everyone" ? undefined : values.audience,
    actionUrl: values.actionUrl?.trim() || undefined,
  };
  notifications = [notification, ...notifications];
  persist();
  return mockDelay(notification, 350);
}

/**
 * Called by the communication module when a message includes the "in-app" channel, so it
 * lands in the real notification inbox instead of only the communication module's own
 * delivery log. Broadcast globally (no recipientRole) since arbitrary student/staff ids in
 * a message's recipient list don't map to the handful of demo AuthUser accounts.
 */
export async function postFromCommunication(params: {
  title: string;
  body: string;
  actionUrl?: string;
}): Promise<Notification> {
  const notification: Notification = {
    id: genId("ntf"),
    tenantId: getCurrentTenantId(),
    title: params.title,
    body: params.body,
    category: "announcement",
    createdAt: new Date().toISOString(),
    read: false,
    actionLabel: "View message",
    actionUrl: params.actionUrl,
    sourceModule: "communication",
  };
  notifications = [notification, ...notifications];
  persist();
  return mockDelay(notification, 200);
}

export async function markRead(id: string): Promise<Notification> {
  const existing = notifications.find((n) => n.id === id && n.tenantId === getCurrentTenantId());
  if (!existing) {
    await mockDelay(null, 200);
    throw new Error("Notification not found");
  }
  const updated: Notification = { ...existing, read: true };
  notifications = notifications.map((n) => (n.id === id ? updated : n));
  persist();
  return mockDelay(updated, 200);
}

export async function markAllReadForCurrentUser(): Promise<void> {
  notifications = notifications.map((n) => (visibleToCurrentUser(n) ? { ...n, read: true } : n));
  persist();
  return mockDelay(undefined, 300);
}

export async function deleteNotification(id: string): Promise<void> {
  const tenantId = getCurrentTenantId();
  notifications = notifications.filter((n) => !(n.id === id && n.tenantId === tenantId));
  persist();
  return mockDelay(undefined, 250);
}
