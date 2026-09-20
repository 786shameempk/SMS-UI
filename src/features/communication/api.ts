import { mockDelay } from "@/utils/mockDelay";
import { DEFAULT_TENANT_ID, getCurrentTenantId, migrateLegacyRecordsToDefaultTenant, scopedToCurrentTenant } from "@/utils/tenant";
import { listStaff } from "@/features/staff/api";
import { listStudents } from "@/features/students/api";
import { postFromCommunication } from "@/features/notifications/api";
import { CHANNEL_SUCCESS_RATE } from "./constants";
import { buildSeedGroups, buildSeedMessagePlans, daysAgo, daysFromNow, genId, SEED_TEMPLATES } from "./mock";
import type {
  BroadcastMessage,
  Channel,
  ComposeMessageFormValues,
  ContactGroup,
  ContactGroupFormValues,
  DeliveryLogEntry,
  MessageDeliverySummary,
  MessageTemplate,
  MessageTemplateFormValues,
  RecipientKind,
} from "./types";

const TEMPLATES_KEY = "sms-mock-communication-templates";
const GROUPS_KEY = "sms-mock-communication-groups";
const MESSAGES_KEY = "sms-mock-communication-messages";
const DELIVERY_LOGS_KEY = "sms-mock-communication-delivery-logs";
const SEEDED_KEY = "sms-mock-communication-seeded";

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

function requireEntity<T extends { id: string; tenantId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

let templates = migrateLegacyRecordsToDefaultTenant(loadJson<MessageTemplate[]>(TEMPLATES_KEY, []));
let groups = migrateLegacyRecordsToDefaultTenant(loadJson<ContactGroup[]>(GROUPS_KEY, []));
let messages = migrateLegacyRecordsToDefaultTenant(loadJson<BroadcastMessage[]>(MESSAGES_KEY, []));
let deliveryLogs = migrateLegacyRecordsToDefaultTenant(loadJson<DeliveryLogEntry[]>(DELIVERY_LOGS_KEY, []));

const persistTemplates = () => saveJson(TEMPLATES_KEY, templates);
const persistGroups = () => saveJson(GROUPS_KEY, groups);
const persistMessages = () => saveJson(MESSAGES_KEY, messages);
const persistDeliveryLogs = () => saveJson(DELIVERY_LOGS_KEY, deliveryLogs);

interface ResolvedRecipients {
  students: Set<string>;
  staff: Set<string>;
  parents: Set<string>;
}

function resolveRecipients(groupIds: string[], studentIds: string[], staffIds: string[]): ResolvedRecipients {
  const resolved: ResolvedRecipients = { students: new Set(studentIds), staff: new Set(staffIds), parents: new Set() };
  const tenantId = getCurrentTenantId();
  for (const groupId of groupIds) {
    const group = groups.find((g) => g.id === groupId && g.tenantId === tenantId);
    if (!group) continue;
    if (group.audienceType === "students") group.memberIds.forEach((id) => resolved.students.add(id));
    else if (group.audienceType === "staff") group.memberIds.forEach((id) => resolved.staff.add(id));
    else if (group.audienceType === "parents") group.memberIds.forEach((id) => resolved.parents.add(id));
  }
  return resolved;
}

function recipientCountOf(resolved: ResolvedRecipients): number {
  return resolved.students.size + resolved.staff.size + resolved.parents.size;
}

function generateDeliveryLogs(messageId: string, channels: Channel[], resolved: ResolvedRecipients, tenantId: string): DeliveryLogEntry[] {
  const entries: DeliveryLogEntry[] = [];
  const addFor = (kind: RecipientKind, ids: Set<string>) => {
    ids.forEach((recipientId) => {
      channels.forEach((channel) => {
        const delivered = Math.random() < CHANNEL_SUCCESS_RATE[channel];
        entries.push({ id: genId("dlv"), tenantId, messageId, recipientKind: kind, recipientId, channel, status: delivered ? "delivered" : "failed" });
      });
    });
  };
  addFor("student", resolved.students);
  addFor("staff", resolved.staff);
  addFor("parent", resolved.parents);
  return entries;
}

/**
 * Lands the message in the real in-app notification inbox (src/features/notifications) when
 * "in-app" is one of the chosen channels — otherwise it would only ever show up in this
 * module's own delivery log, which nobody actually reads as an inbox.
 */
function notifyInApp(message: BroadcastMessage) {
  if (!message.channels.includes("in-app")) return;
  postFromCommunication({
    title: message.subject || "New message",
    body: message.body,
    actionUrl: "/communication",
  }).catch((err) => console.error("Failed to post in-app notification for message", message.id, err));
}

/**
 * Templates and groups are owned outright by this module; groups are seeded from the real
 * students/staff directories (same convention as transport/hostel), and a couple of demo
 * messages (sent + one scheduled) are generated against those seeded groups.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (templates.length === 0) {
    templates = SEED_TEMPLATES.map((t) => ({ ...t, tenantId: DEFAULT_TENANT_ID }));
    persistTemplates();
  }

  if (groups.length === 0) {
    const [students, staff] = await Promise.all([listStudents(), listStaff()]);
    groups = buildSeedGroups(students, staff).map((g) => ({ ...g, tenantId: DEFAULT_TENANT_ID }));
    persistGroups();
  }

  if (messages.length === 0) {
    const plans = buildSeedMessagePlans(groups);
    const newMessages: BroadcastMessage[] = [];
    const newLogs: DeliveryLogEntry[] = [];

    for (const plan of plans) {
      const resolved = resolveRecipients(plan.groupIds, plan.studentIds, plan.staffIds);
      const id = genId("msg");
      if (plan.daysAgoSent !== undefined) {
        const sentAt = daysAgo(plan.daysAgoSent);
        newMessages.push({
          id,
          tenantId: DEFAULT_TENANT_ID,
          subject: plan.subject,
          body: plan.body,
          channels: plan.channels,
          groupIds: plan.groupIds,
          studentIds: plan.studentIds,
          staffIds: plan.staffIds,
          recipientCount: recipientCountOf(resolved),
          sentAt,
          createdAt: sentAt,
          status: "sent",
        });
        newLogs.push(...generateDeliveryLogs(id, plan.channels, resolved, DEFAULT_TENANT_ID));
      } else if (plan.daysFromNowScheduled !== undefined) {
        newMessages.push({
          id,
          tenantId: DEFAULT_TENANT_ID,
          subject: plan.subject,
          body: plan.body,
          channels: plan.channels,
          groupIds: plan.groupIds,
          studentIds: plan.studentIds,
          staffIds: plan.staffIds,
          recipientCount: recipientCountOf(resolved),
          scheduledAt: daysFromNow(plan.daysFromNowScheduled),
          createdAt: new Date().toISOString(),
          status: "scheduled",
        });
      }
    }

    messages = newMessages;
    deliveryLogs = newLogs;
    persistMessages();
    persistDeliveryLogs();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed communication mock data", err);
});

// ── Templates ────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<MessageTemplate[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(templates), 300);
}

export async function createTemplate(values: MessageTemplateFormValues): Promise<MessageTemplate> {
  await seedPromise;
  const template: MessageTemplate = { id: genId("tpl"), tenantId: getCurrentTenantId(), ...values };
  templates = [template, ...templates];
  persistTemplates();
  return mockDelay(template, 350);
}

export async function updateTemplate(id: string, values: MessageTemplateFormValues): Promise<MessageTemplate> {
  await seedPromise;
  requireEntity(templates, id, "Template");
  const updated: MessageTemplate = { ...requireEntity(templates, id, "Template"), ...values };
  templates = templates.map((t) => (t.id === id ? updated : t));
  persistTemplates();
  return mockDelay(updated, 350);
}

export async function deleteTemplate(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  requireEntity(templates, id, "Template");
  templates = templates.filter((t) => !(t.id === id && t.tenantId === tenantId));
  persistTemplates();
  return mockDelay(undefined, 300);
}

// ── Groups ───────────────────────────────────────────────────────────────

export async function listGroups(): Promise<ContactGroup[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(groups), 300);
}

export async function createGroup(values: ContactGroupFormValues): Promise<ContactGroup> {
  await seedPromise;
  const group: ContactGroup = { id: genId("grp"), tenantId: getCurrentTenantId(), ...values };
  groups = [group, ...groups];
  persistGroups();
  return mockDelay(group, 350);
}

export async function updateGroup(id: string, values: ContactGroupFormValues): Promise<ContactGroup> {
  await seedPromise;
  requireEntity(groups, id, "Group");
  const updated: ContactGroup = { ...requireEntity(groups, id, "Group"), ...values };
  groups = groups.map((g) => (g.id === id ? updated : g));
  persistGroups();
  return mockDelay(updated, 350);
}

export async function deleteGroup(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  requireEntity(groups, id, "Group");
  if (messages.some((m) => m.tenantId === tenantId && m.status === "scheduled" && m.groupIds.includes(id))) {
    await mockDelay(null, 300);
    throw new Error("This group is used by a scheduled message — cancel or send that message first");
  }
  groups = groups.filter((g) => !(g.id === id && g.tenantId === tenantId));
  persistGroups();
  return mockDelay(undefined, 300);
}

// ── Recipient preview ────────────────────────────────────────────────────

export async function previewRecipientCount(groupIds: string[], studentIds: string[], staffIds: string[]): Promise<number> {
  await seedPromise;
  return recipientCountOf(resolveRecipients(groupIds, studentIds, staffIds));
}

// ── Compose / send / schedule ────────────────────────────────────────────

export async function listMessages(): Promise<BroadcastMessage[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(messages).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), 350);
}

export async function composeMessage(values: ComposeMessageFormValues): Promise<BroadcastMessage> {
  await seedPromise;
  if (!values.channels.length) {
    await mockDelay(null, 300);
    throw new Error("Select at least one channel");
  }
  const resolved = resolveRecipients(values.groupIds, values.studentIds, values.staffIds);
  const recipientCount = recipientCountOf(resolved);
  if (recipientCount === 0) {
    await mockDelay(null, 300);
    throw new Error("Select at least one recipient or group");
  }

  const id = genId("msg");
  const tenantId = getCurrentTenantId();
  const now = new Date();
  const scheduledDate = values.scheduledAt ? new Date(values.scheduledAt) : null;
  const isFutureSchedule = Boolean(scheduledDate && scheduledDate.getTime() > now.getTime());

  const message: BroadcastMessage = {
    id,
    tenantId,
    subject: values.subject?.trim() || undefined,
    body: values.body,
    channels: values.channels,
    groupIds: values.groupIds,
    studentIds: values.studentIds,
    staffIds: values.staffIds,
    recipientCount,
    createdAt: now.toISOString(),
    status: isFutureSchedule ? "scheduled" : "sent",
    scheduledAt: isFutureSchedule ? scheduledDate!.toISOString() : undefined,
    sentAt: isFutureSchedule ? undefined : now.toISOString(),
  };
  messages = [message, ...messages];
  persistMessages();

  if (!isFutureSchedule) {
    const logs = generateDeliveryLogs(id, values.channels, resolved, tenantId);
    deliveryLogs = [...deliveryLogs, ...logs];
    persistDeliveryLogs();
    notifyInApp(message);
  }

  return mockDelay(message, 500);
}

export async function sendScheduledNow(id: string): Promise<BroadcastMessage> {
  await seedPromise;
  const existing = requireEntity(messages, id, "Message");
  if (existing.status !== "scheduled") {
    await mockDelay(null, 300);
    throw new Error("Only scheduled messages can be sent now");
  }
  const resolved = resolveRecipients(existing.groupIds, existing.studentIds, existing.staffIds);
  const updated: BroadcastMessage = { ...existing, status: "sent", sentAt: new Date().toISOString(), recipientCount: recipientCountOf(resolved) };
  messages = messages.map((m) => (m.id === id ? updated : m));
  persistMessages();

  const logs = generateDeliveryLogs(id, existing.channels, resolved, existing.tenantId);
  deliveryLogs = [...deliveryLogs, ...logs];
  persistDeliveryLogs();
  notifyInApp(updated);

  return mockDelay(updated, 500);
}

export async function cancelScheduledMessage(id: string): Promise<BroadcastMessage> {
  await seedPromise;
  const existing = requireEntity(messages, id, "Message");
  if (existing.status !== "scheduled") {
    await mockDelay(null, 300);
    throw new Error("Only scheduled messages can be cancelled");
  }
  const updated: BroadcastMessage = { ...existing, status: "cancelled" };
  messages = messages.map((m) => (m.id === id ? updated : m));
  persistMessages();
  return mockDelay(updated, 300);
}

export async function getDeliverySummary(messageId: string): Promise<MessageDeliverySummary[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const logs = deliveryLogs.filter((l) => l.messageId === messageId && l.tenantId === tenantId);
  const byChannel = new Map<Channel, { delivered: number; failed: number }>();
  logs.forEach((l) => {
    const entry = byChannel.get(l.channel) ?? { delivered: 0, failed: 0 };
    if (l.status === "delivered") entry.delivered++;
    else entry.failed++;
    byChannel.set(l.channel, entry);
  });
  const summary: MessageDeliverySummary[] = Array.from(byChannel.entries()).map(([channel, counts]) => ({ channel, ...counts }));
  return mockDelay(summary, 300);
}
