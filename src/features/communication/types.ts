export type Channel = "email" | "sms" | "push" | "whatsapp" | "in-app";

export type AudienceType = "students" | "staff" | "parents";

export interface ContactGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  audienceType: AudienceType;
  memberIds: string[];
}

export interface ContactGroupFormValues {
  name: string;
  description?: string;
  audienceType: AudienceType;
  memberIds: string[];
}

export interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  category?: string;
  subject?: string;
  body: string;
  channels: Channel[];
  language: string;
  smsTemplateId?: string;
  whatsAppTemplateName?: string;
  whatsAppTemplateLanguage?: string;
}

export interface MessageTemplateFormValues {
  name: string;
  category?: string;
  subject?: string;
  body: string;
  channels: Channel[];
  language?: string;
  smsTemplateId?: string;
  whatsAppTemplateName?: string;
  whatsAppTemplateLanguage?: string;
}

export type MessageStatus = "scheduled" | "sent" | "cancelled";

export interface BroadcastMessage {
  id: string;
  tenantId: string;
  subject?: string;
  body: string;
  channels: Channel[];
  groupIds: string[];
  studentIds: string[];
  staffIds: string[];
  recipientCount: number;
  scheduledAt?: string;
  sentAt?: string;
  status: MessageStatus;
  createdAt: string;
  templateId?: string;
}

export interface ComposeMessageFormValues {
  subject?: string;
  body: string;
  channels: Channel[];
  groupIds: string[];
  studentIds: string[];
  staffIds: string[];
  scheduledAt?: string;
  /** Template the text came from: SMS (DLT) and WhatsApp need its approved provider template. */
  templateId?: string;
  /** Same key on a retried submit returns the first message instead of sending twice. */
  idempotencyKey?: string;
}

export type RecipientKind = "student" | "staff" | "parent";
/** Real statuses: queued until the worker sends, sent when the provider accepted, delivered/read/failed/bounced from receipts, skipped when never attempted. */
export type DeliveryStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed" | "bounced" | "skipped";

export interface DeliveryLogEntry {
  id: string;
  tenantId: string;
  messageId: string;
  recipientKind: RecipientKind;
  recipientId: string;
  channel: Channel;
  status: DeliveryStatus;
}

export interface MessageDeliverySummary {
  channel: Channel;
  delivered: number;
  failed: number;
  queued: number;
  sent: number;
  skipped: number;
}
