import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  AudienceType,
  BroadcastMessage,
  Channel,
  ComposeMessageFormValues,
  ContactGroup,
  ContactGroupFormValues,
  MessageDeliverySummary,
  MessageStatus,
  MessageTemplate,
  MessageTemplateFormValues,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// EngagementService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase/kebab-case unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const CHANNEL_TO_API: Record<Channel, string> = { email: "Email", sms: "Sms", push: "Push", whatsapp: "WhatsApp", "in-app": "InApp" };
const CHANNEL_FROM_API: Record<string, Channel> = { Email: "email", Sms: "sms", Push: "push", WhatsApp: "whatsapp", InApp: "in-app" };

const AUDIENCE_TO_API: Record<AudienceType, string> = { students: "Students", staff: "Staff", parents: "Parents" };
const AUDIENCE_FROM_API: Record<string, AudienceType> = { Students: "students", Staff: "staff", Parents: "parents" };

const STATUS_FROM_API: Record<string, MessageStatus> = { Scheduled: "scheduled", Sent: "sent", Cancelled: "cancelled" };

// ── API response shapes (EngagementService DTOs) ────────────────────────────

interface ApiTemplate {
  id: string;
  tenantId: string;
  name: string;
  category: string | null;
  subject: string | null;
  body: string;
  channels: string[];
}

interface ApiGroup {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  audienceType: string;
  memberIds: string[];
}

interface ApiMessage {
  id: string;
  tenantId: string;
  subject: string | null;
  body: string;
  channels: string[];
  groupIds: string[];
  studentIds: string[];
  staffIds: string[];
  recipientCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  createdAt: string;
}

interface ApiDeliverySummary {
  channel: string;
  delivered: number;
  failed: number;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const channelsToApi = (channels: Channel[]) => channels.map((c) => CHANNEL_TO_API[c]);
const channelsFromApi = (channels: string[]) => channels.map((c) => CHANNEL_FROM_API[c]);

function mapTemplate(t: ApiTemplate): MessageTemplate {
  return {
    id: t.id,
    tenantId: t.tenantId,
    name: t.name,
    category: t.category ?? undefined,
    subject: t.subject ?? undefined,
    body: t.body,
    channels: channelsFromApi(t.channels),
  };
}

function mapGroup(g: ApiGroup): ContactGroup {
  return {
    id: g.id,
    tenantId: g.tenantId,
    name: g.name,
    description: g.description ?? undefined,
    audienceType: AUDIENCE_FROM_API[g.audienceType],
    memberIds: g.memberIds,
  };
}

function mapMessage(m: ApiMessage): BroadcastMessage {
  return {
    id: m.id,
    tenantId: m.tenantId,
    subject: m.subject ?? undefined,
    body: m.body,
    channels: channelsFromApi(m.channels),
    groupIds: m.groupIds,
    studentIds: m.studentIds,
    staffIds: m.staffIds,
    recipientCount: m.recipientCount,
    scheduledAt: m.scheduledAt ?? undefined,
    sentAt: m.sentAt ?? undefined,
    status: STATUS_FROM_API[m.status],
    createdAt: m.createdAt,
  };
}

function templateBody(values: MessageTemplateFormValues) {
  return {
    name: values.name,
    category: values.category || null,
    subject: values.subject?.trim() || null,
    body: values.body,
    channels: channelsToApi(values.channels),
  };
}

function groupBody(values: ContactGroupFormValues) {
  return {
    name: values.name,
    description: values.description?.trim() || null,
    audienceType: AUDIENCE_TO_API[values.audienceType],
    memberIds: values.memberIds,
  };
}

// ── Templates ────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<MessageTemplate[]> {
  return (await unwrap(engagementHttpClient.get<ApiTemplate[]>("api/MessageTemplates"))).map(mapTemplate);
}

export async function createTemplate(values: MessageTemplateFormValues): Promise<MessageTemplate> {
  return mapTemplate(await unwrap(engagementHttpClient.post<ApiTemplate>("api/MessageTemplates", templateBody(values))));
}

export async function updateTemplate(id: string, values: MessageTemplateFormValues): Promise<MessageTemplate> {
  return mapTemplate(await unwrap(engagementHttpClient.put<ApiTemplate>(`api/MessageTemplates/${id}`, templateBody(values))));
}

export async function deleteTemplate(id: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/MessageTemplates/${id}`));
}

// ── Groups ───────────────────────────────────────────────────────────────

export async function listGroups(): Promise<ContactGroup[]> {
  return (await unwrap(engagementHttpClient.get<ApiGroup[]>("api/ContactGroups"))).map(mapGroup);
}

export async function createGroup(values: ContactGroupFormValues): Promise<ContactGroup> {
  return mapGroup(await unwrap(engagementHttpClient.post<ApiGroup>("api/ContactGroups", groupBody(values))));
}

export async function updateGroup(id: string, values: ContactGroupFormValues): Promise<ContactGroup> {
  return mapGroup(await unwrap(engagementHttpClient.put<ApiGroup>(`api/ContactGroups/${id}`, groupBody(values))));
}

export async function deleteGroup(id: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/ContactGroups/${id}`));
}

// ── Recipient preview ────────────────────────────────────────────────────

export async function previewRecipientCount(groupIds: string[], studentIds: string[], staffIds: string[]): Promise<number> {
  const { count } = await unwrap(
    engagementHttpClient.post<{ count: number }>("api/BroadcastMessages/preview-recipient-count", { groupIds, studentIds, staffIds }),
  );
  return count;
}

// ── Compose / send / schedule ────────────────────────────────────────────

export async function listMessages(): Promise<BroadcastMessage[]> {
  return (await unwrap(engagementHttpClient.get<ApiMessage[]>("api/BroadcastMessages"))).map(mapMessage);
}

/** Delivery is simulated server-side, and an "in-app" channel lands in the real notification inbox. */
export async function composeMessage(values: ComposeMessageFormValues): Promise<BroadcastMessage> {
  return mapMessage(
    await unwrap(
      engagementHttpClient.post<ApiMessage>("api/BroadcastMessages", {
        subject: values.subject?.trim() || null,
        body: values.body,
        channels: channelsToApi(values.channels),
        groupIds: values.groupIds,
        studentIds: values.studentIds,
        staffIds: values.staffIds,
        // datetime-local has no zone: interpret it in the viewer's local time, send UTC.
        scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
      }),
    ),
  );
}

export async function sendScheduledNow(id: string): Promise<BroadcastMessage> {
  return mapMessage(await unwrap(engagementHttpClient.post<ApiMessage>(`api/BroadcastMessages/${id}/send-now`)));
}

export async function cancelScheduledMessage(id: string): Promise<BroadcastMessage> {
  return mapMessage(await unwrap(engagementHttpClient.post<ApiMessage>(`api/BroadcastMessages/${id}/cancel`)));
}

export async function getDeliverySummary(messageId: string): Promise<MessageDeliverySummary[]> {
  const rows = await unwrap(engagementHttpClient.get<ApiDeliverySummary[]>(`api/BroadcastMessages/${messageId}/delivery-summary`));
  return rows.map((r) => ({ channel: CHANNEL_FROM_API[r.channel], delivered: r.delivered, failed: r.failed }));
}
