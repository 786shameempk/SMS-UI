import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { CHANNEL_FROM_API, CHANNEL_TO_API } from "../api";
import type { ApprovalStatus, Channel, DeliveryStatus } from "../types";

/** Event notification platform: channel rules + fallback, consent, audit, preview, history, monthly usage, analytics. */

export type DeliveryPriority = "low" | "normal" | "high" | "critical";
export type SendableChannel = "email" | "sms" | "whatsapp";

const lower = (v: string) => (v ? v.charAt(0).toLowerCase() + v.slice(1) : v);
const upper = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v);
const channelOf = (v: unknown) => CHANNEL_FROM_API[v as string] ?? (v as Channel);

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Rules ──────────────────────────────────────────────────────────────────

export interface NotificationRule {
  eventType: string;
  name: string;
  primaryChannels: Channel[];
  fallbackChannels: Channel[];
  mandatory: boolean;
  active: boolean;
  priority: DeliveryPriority;
  /** False = the platform default; true = this school saved its own. */
  customized: boolean;
}

export interface SaveRuleInput {
  name: string;
  primaryChannels: Channel[];
  fallbackChannels: Channel[];
  mandatory: boolean;
  active: boolean;
  priority: DeliveryPriority;
}

type RawRule = Omit<NotificationRule, "primaryChannels" | "fallbackChannels" | "priority"> & { primaryChannels: string[]; fallbackChannels: string[]; priority: string };

const mapRule = (r: RawRule): NotificationRule => ({
  ...r,
  primaryChannels: r.primaryChannels.map(channelOf),
  fallbackChannels: r.fallbackChannels.map(channelOf),
  priority: lower(r.priority) as DeliveryPriority,
});

export async function listRules(): Promise<NotificationRule[]> {
  return (await unwrap(engagementHttpClient.get<RawRule[]>("api/messaging/rules"))).map(mapRule);
}

export async function saveRule(eventType: string, input: SaveRuleInput): Promise<NotificationRule> {
  return mapRule(
    await unwrap(
      engagementHttpClient.put<RawRule>(`api/messaging/rules/${encodeURIComponent(eventType)}`, {
        ...input,
        primaryChannels: input.primaryChannels.map((c) => CHANNEL_TO_API[c]),
        fallbackChannels: input.fallbackChannels.map((c) => CHANNEL_TO_API[c]),
        priority: upper(input.priority),
      }),
    ),
  );
}

export async function resetRule(eventType: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/messaging/rules/${encodeURIComponent(eventType)}`));
}

// ── Consent preferences and audit ──────────────────────────────────────────

export interface Preference {
  id: string;
  channel: Channel;
  /** Masked by the server. */
  address: string;
  optedIn: boolean;
  source: string | null;
  kind: "opt-out" | "consent";
  updatedAt: string;
}

export async function listPreferences(channel?: Channel): Promise<Preference[]> {
  const rows = await unwrap(
    engagementHttpClient.get<Array<Preference & { channel: string }>>("api/messaging/preferences", { params: { channel: channel ? CHANNEL_TO_API[channel] : undefined } }),
  );
  return rows.map((r) => ({ ...r, channel: channelOf(r.channel) }));
}

export async function setPreference(channel: SendableChannel, address: string, enabled: boolean, source: string): Promise<void> {
  await unwrap(engagementHttpClient.put("api/messaging/preferences", { channel: CHANNEL_TO_API[channel], address, enabled, source }));
}

export interface AuditEntry {
  id: string;
  area: string;
  action: string;
  subject: string;
  detail: string | null;
  actorEmail: string | null;
  at: string;
}

export const listAudit = (area?: string) => unwrap(engagementHttpClient.get<AuditEntry[]>("api/messaging/audit", { params: { area } }));

// ── Template preview and governance ────────────────────────────────────────

export interface TemplatePreview {
  subject: string | null;
  body: string;
  placeholders: string[];
  missing: string[];
  unknown: string[];
  length: number;
  smsSegments: number;
}

export const previewTemplate = (subject: string | undefined, body: string, values?: Record<string, string>) =>
  unwrap(engagementHttpClient.post<TemplatePreview>("api/messaging/templates/preview", { subject: subject || null, body, values: values ?? null }));

export const listPlaceholders = () => unwrap(engagementHttpClient.get<string[]>("api/messaging/templates/placeholders"));

export async function setTemplateStatus(id: string, input: { approvalStatus?: ApprovalStatus; isActive?: boolean; whatsAppCategory?: string }): Promise<void> {
  await unwrap(
    engagementHttpClient.put(`api/messaging/templates/${id}/status`, {
      approvalStatus: input.approvalStatus ? upper(input.approvalStatus) : null,
      isActive: input.isActive ?? null,
      whatsAppCategory: input.whatsAppCategory ?? null,
    }),
  );
}

// ── History ────────────────────────────────────────────────────────────────

export interface HistoryFilter {
  from?: string;
  to?: string;
  channel?: Channel;
  status?: DeliveryStatus;
  eventType?: string;
  recipient?: string;
  page?: number;
  pageSize?: number;
}

export interface HistoryRow {
  id: string;
  messageId: string;
  eventType: string | null;
  channel: Channel;
  recipientName: string | null;
  address: string | null;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  provider: string | null;
  providerMessageId: string | null;
  templateName: string | null;
  attemptCount: number;
  fallbackOrder: number;
  lastError: string | null;
  cost: number | null;
  category: string | null;
  createdAt: string;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
}

export interface HistoryPage {
  items: HistoryRow[];
  total: number;
  page: number;
  pageSize: number;
}

const historyParams = (f: HistoryFilter) => ({
  from: f.from || undefined,
  to: f.to || undefined,
  channel: f.channel ? CHANNEL_TO_API[f.channel] : undefined,
  status: f.status ? upper(f.status) : undefined,
  eventType: f.eventType?.trim() || undefined,
  recipient: f.recipient?.trim() || undefined,
  page: f.page,
  pageSize: f.pageSize,
});

export async function searchHistory(filter: HistoryFilter): Promise<HistoryPage> {
  const page = await unwrap(engagementHttpClient.get<Omit<HistoryPage, "items"> & { items: Array<Record<string, unknown>> }>("api/messaging/history", { params: historyParams(filter) }));
  return {
    ...page,
    items: page.items.map((r) => ({
      ...(r as unknown as HistoryRow),
      channel: channelOf(r.channel),
      status: lower(r.status as string) as DeliveryStatus,
      priority: lower(r.priority as string) as DeliveryPriority,
    })),
  };
}

/** Downloads the filtered history as CSV (up to 20,000 rows). */
export async function exportHistory(filter: HistoryFilter): Promise<Blob> {
  try {
    const { page: _page, pageSize: _size, ...rest } = filter;
    return (await engagementHttpClient.get<Blob>("api/messaging/history/export", { params: historyParams(rest), responseType: "blob" })).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Usage and analytics ────────────────────────────────────────────────────

export interface MonthlyUsageRow {
  channel: Channel;
  category: string | null;
  attempted: number;
  delivered: number;
  failed: number;
  skipped: number;
  estimatedCost: number;
  quota: number | null;
  overage: number;
  percentUsed: number;
  alertRaised: boolean;
}

export interface MonthlyUsage {
  month: string;
  rows: MonthlyUsageRow[];
  totalCost: number;
}

export async function getMonthlyUsage(month: string): Promise<MonthlyUsage> {
  const r = await unwrap(engagementHttpClient.get<MonthlyUsage & { rows: Array<Record<string, unknown>> }>("api/messaging/usage/monthly", { params: { month } }));
  return { ...r, rows: r.rows.map((x) => ({ ...(x as unknown as MonthlyUsageRow), channel: channelOf(x.channel) })) };
}

export interface ChannelTotal {
  channel: Channel;
  total: number;
  delivered: number;
  failed: number;
  successPercent: number;
  estimatedCost: number;
}

export interface ProviderPerformance {
  provider: string;
  channel: Channel;
  attempted: number;
  delivered: number;
  failed: number;
  successPercent: number;
  estimatedCost: number;
}

export interface Analytics {
  from: string;
  to: string;
  channels: ChannelTotal[];
  providers: ProviderPerformance[];
  failureTrend: Array<{ day: string; failed: number; total: number }>;
}

export async function getAnalytics(from: string, to: string): Promise<Analytics> {
  const a = await unwrap(engagementHttpClient.get<Analytics>("api/messaging/analytics", { params: { from, to } }));
  return { ...a, channels: a.channels.map((c) => ({ ...c, channel: channelOf(c.channel) })), providers: a.providers.map((p) => ({ ...p, channel: channelOf(p.channel) })) };
}

export interface TenantUsage {
  tenantId: string;
  total: number;
  delivered: number;
  failed: number;
  successPercent: number;
  estimatedCost: number;
}

/** Platform administrator only. */
export const getPlatformUsage = (from: string, to: string) => unwrap(engagementHttpClient.get<TenantUsage[]>("api/messaging/platform/usage", { params: { from, to } }));
