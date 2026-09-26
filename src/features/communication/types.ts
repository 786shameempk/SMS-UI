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
}

export interface MessageTemplateFormValues {
  name: string;
  category?: string;
  subject?: string;
  body: string;
  channels: Channel[];
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
}

export interface ComposeMessageFormValues {
  subject?: string;
  body: string;
  channels: Channel[];
  groupIds: string[];
  studentIds: string[];
  staffIds: string[];
  scheduledAt?: string;
}

export type RecipientKind = "student" | "staff" | "parent";
export type DeliveryStatus = "delivered" | "failed";

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
}
