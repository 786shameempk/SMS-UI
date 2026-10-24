import { extractApiErrorMessage, financeHttpClient } from "@/lib/httpClient";
import type { Refund } from "./types";

/**
 * School administrators' view of payment gateways (keys are write-only: only a short hint of a saved secret ever comes back),
 * the gateway ledger, and reconciliation. All of it is FinanceService /api/payments/*.
 */

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export interface PaymentGatewaySettings {
  provider: string;
  displayName: string;
  /** The school saved its own keys for this gateway. */
  configured: boolean;
  /** No keys of its own, but the platform's shared account is on. */
  fromPlatform: boolean;
  enabled: boolean;
  isDefault: boolean;
  mode: "Test" | "Live";
  keyId: string | null;
  /** "••••3F2A": enough to recognise a saved secret, never enough to use it. */
  keySecretHint: string | null;
  webhookSecretHint: string | null;
  needsWebhookSecret: boolean;
  /** What to paste into the gateway's dashboard. */
  webhookUrl: string | null;
  lastCheckedAt: string | null;
  lastCheckResult: string | null;
  currencies: string[];
}

export interface SavePaymentGatewayValues {
  mode: "Test" | "Live";
  enabled: boolean;
  isDefault: boolean;
  keyId: string;
  /** Empty keeps the saved secret. */
  keySecret?: string;
  webhookSecret?: string;
}

export const listPaymentGateways = () => unwrap(financeHttpClient.get<PaymentGatewaySettings[]>("/api/payments/gateways"));

export const savePaymentGateway = (provider: string, values: SavePaymentGatewayValues) =>
  unwrap(financeHttpClient.put<PaymentGatewaySettings>(`/api/payments/gateways/${provider}`, {
    mode: values.mode,
    enabled: values.enabled,
    isDefault: values.isDefault,
    keyId: values.keyId.trim(),
    keySecret: values.keySecret?.trim() || null,
    webhookSecret: values.webhookSecret?.trim() || null,
  }));

export const checkPaymentGateway = (provider: string) => unwrap(financeHttpClient.post<PaymentGatewaySettings>(`/api/payments/gateways/${provider}/check`));

export async function deletePaymentGateway(provider: string): Promise<void> {
  await unwrap(financeHttpClient.delete(`/api/payments/gateways/${provider}`));
}

export type PaymentTransactionKind =
  | "OrderCreated"
  | "PaymentCaptured"
  | "PaymentFailed"
  | "RefundInitiated"
  | "RefundSucceeded"
  | "RefundFailed"
  | "WebhookReceived";

export interface PaymentTransaction {
  id: string;
  at: string;
  provider: string;
  mode: string;
  kind: PaymentTransactionKind;
  onlinePaymentId: string | null;
  refundId: string | null;
  feeInvoiceId: string | null;
  amount: number | null;
  currency: string | null;
  providerReference: string | null;
  status: string | null;
  detail: string | null;
}

export interface PaymentTransactionPage {
  items: PaymentTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaymentTransactionFilters {
  provider?: string;
  kind?: PaymentTransactionKind;
  page?: number;
  pageSize?: number;
}

export const listPaymentTransactions = (filters: PaymentTransactionFilters = {}) =>
  unwrap(financeHttpClient.get<PaymentTransactionPage>("/api/payments/transactions", { params: filters }));

export interface OnlineReconciliationResult {
  ordersChecked: number;
  recorded: number;
  needAttention: number;
  notes: string[];
  refundsChecked: number;
  refundsSettled: number;
}

/** Asks every gateway about orders never confirmed here and refunds still with a gateway. */
export const reconcileOnlinePayments = () => unwrap(financeHttpClient.post<OnlineReconciliationResult>("/api/payments/reconciliation/online"));

/** Sends a pending refund back to the payer through the gateway the invoice was paid with. */
export async function sendRefundToGateway(refundId: string): Promise<Pick<Refund, "id" | "status" | "gatewayStatus" | "gatewayError">> {
  const dto = await unwrap(financeHttpClient.post<{ id: string; status: string; gatewayStatus: string; gatewayError?: string | null }>(`/api/refunds/${refundId}/send-to-gateway`));
  return {
    id: dto.id,
    status: dto.status === "Processed" ? "processed" : "pending",
    gatewayStatus: ({ NotSent: "not_sent", Initiated: "initiated", Succeeded: "succeeded", Failed: "failed" } as const)[dto.gatewayStatus as "NotSent"] ?? "not_sent",
    gatewayError: dto.gatewayError ?? undefined,
  };
}
