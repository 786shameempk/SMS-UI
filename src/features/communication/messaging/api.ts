import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { CHANNEL_FROM_API, CHANNEL_TO_API } from "../api";
import type { Channel, DeliveryStatus } from "../types";

export type ProviderName = "Smtp" | "Brevo" | "Msg91" | "Twilio" | "WhatsAppCloud";
export type ConfigurableChannel = "email" | "sms" | "whatsapp";

export interface ChannelStatus {
  channel: Channel;
  ready: boolean;
  provider: string | null;
  message: string;
}

export interface ProviderConfig {
  channel: ConfigurableChannel;
  provider: ProviderName | null;
  enabled: boolean;
  configured: boolean;
  settings: Record<string, string>;
  /** Names of secrets that are stored. The values are never sent back. */
  secretsSet: string[];
  missingFields: string[];
  webhookUrl: string | null;
  perMinuteLimit: number;
  dailyLimit: number;
  costPerMessage: number | null;
  optInCollectedAtAdmission: boolean;
  platformDefaultAvailable: boolean;
  platformDefaultProvider: ProviderName | null;
  lastTestAt: string | null;
  lastTestSucceeded: boolean | null;
  lastTestMessage: string | null;
}

export interface SaveProviderInput {
  provider: ProviderName;
  enabled: boolean;
  settings: Record<string, string>;
  /** Empty values keep the stored secret. */
  secrets: Record<string, string>;
  perMinuteLimit: number;
  dailyLimit: number;
  costPerMessage: number | null;
  optInCollectedAtAdmission: boolean;
}

export interface TestResult {
  accepted: boolean;
  providerMessageId: string | null;
  message: string;
  provider: string;
}

export interface DeliveryRow {
  id: string;
  recipientKind: "student" | "staff" | "parent";
  recipientId: string;
  recipientName: string | null;
  channel: Channel;
  address: string | null;
  status: DeliveryStatus;
  provider: string | null;
  attemptCount: number;
  lastError: string | null;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  nextAttemptAt: string | null;
}

export interface UsageRow {
  day: string;
  channel: Channel;
  provider: string | null;
  attempted: number;
  delivered: number;
  failed: number;
  skipped: number;
  estimatedCost: number;
}

export interface Suppression {
  id: string;
  channel: Channel;
  address: string;
  reason: string;
  source: string | null;
  detail: string | null;
  createdAt: string;
}

export interface OptIn {
  id: string;
  address: string;
  optedIn: boolean;
  source: string;
  updatedAt: string;
}

const lower = (v: string) => (v ? v.charAt(0).toLowerCase() + v.slice(1) : v);

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

type Raw = Record<string, unknown>;
const channelOf = (v: unknown) => CHANNEL_FROM_API[v as string] ?? (v as Channel);

export async function getChannelStatus(): Promise<ChannelStatus[]> {
  const rows = await unwrap(engagementHttpClient.get<Raw[]>("api/messaging/channels"));
  return rows.map((r) => ({ ...(r as unknown as ChannelStatus), channel: channelOf(r.channel) }));
}

export async function listProviders(): Promise<ProviderConfig[]> {
  const rows = await unwrap(engagementHttpClient.get<Raw[]>("api/messaging/providers"));
  return rows.map((r) => ({ ...(r as unknown as ProviderConfig), channel: channelOf(r.channel) as ConfigurableChannel }));
}

export async function saveProvider(channel: ConfigurableChannel, input: SaveProviderInput): Promise<ProviderConfig> {
  const r = await unwrap(engagementHttpClient.put<Raw>(`api/messaging/providers/${CHANNEL_TO_API[channel]}`, input));
  return { ...(r as unknown as ProviderConfig), channel: channelOf(r.channel) as ConfigurableChannel };
}

export async function deleteProvider(channel: ConfigurableChannel): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/messaging/providers/${CHANNEL_TO_API[channel]}`));
}

export async function sendTest(channel: ConfigurableChannel, to: string): Promise<TestResult> {
  return unwrap(engagementHttpClient.post<TestResult>(`api/messaging/providers/${CHANNEL_TO_API[channel]}/test`, { to }));
}

export async function listDeliveries(messageId: string, filters: { status?: DeliveryStatus; channel?: Channel } = {}): Promise<DeliveryRow[]> {
  const rows = await unwrap(
    engagementHttpClient.get<Raw[]>(`api/messaging/messages/${messageId}/deliveries`, {
      params: {
        status: filters.status ? filters.status.charAt(0).toUpperCase() + filters.status.slice(1) : undefined,
        channel: filters.channel ? CHANNEL_TO_API[filters.channel] : undefined,
      },
    }),
  );
  return rows.map((r) => ({
    ...(r as unknown as DeliveryRow),
    channel: channelOf(r.channel),
    status: lower(r.status as string) as DeliveryStatus,
    recipientKind: lower(r.recipientKind as string) as DeliveryRow["recipientKind"],
  }));
}

export async function retryFailed(messageId: string): Promise<number> {
  return (await unwrap(engagementHttpClient.post<{ count: number }>(`api/messaging/messages/${messageId}/retry-failed`))).count;
}

export async function cancelQueued(messageId: string): Promise<number> {
  return (await unwrap(engagementHttpClient.post<{ count: number }>(`api/messaging/messages/${messageId}/cancel-queued`))).count;
}

export async function getUsage(from: string, to: string): Promise<UsageRow[]> {
  const rows = await unwrap(engagementHttpClient.get<Raw[]>("api/messaging/usage", { params: { from, to } }));
  return rows.map((r) => ({ ...(r as unknown as UsageRow), channel: channelOf(r.channel) }));
}

export async function listSuppressions(): Promise<Suppression[]> {
  const rows = await unwrap(engagementHttpClient.get<Raw[]>("api/messaging/suppressions"));
  return rows.map((r) => ({ ...(r as unknown as Suppression), channel: channelOf(r.channel), reason: lower(r.reason as string) }));
}

export async function addSuppression(channel: Channel, address: string, detail?: string): Promise<Suppression> {
  const r = await unwrap(engagementHttpClient.post<Raw>("api/messaging/suppressions", { channel: CHANNEL_TO_API[channel], address, detail: detail ?? null }));
  return { ...(r as unknown as Suppression), channel: channelOf(r.channel), reason: lower(r.reason as string) };
}

export async function removeSuppression(id: string): Promise<void> {
  await unwrap(engagementHttpClient.delete(`api/messaging/suppressions/${id}`));
}

export async function listOptIns(): Promise<OptIn[]> {
  return unwrap(engagementHttpClient.get<OptIn[]>("api/messaging/optins"));
}

export async function recordOptIns(phones: string[], source: string): Promise<number> {
  return (await unwrap(engagementHttpClient.post<{ count: number }>("api/messaging/optins", { phones, source }))).count;
}
