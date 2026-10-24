import { financeHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";
import * as gateways from "./gatewayApi";

const settings = (overrides: Record<string, unknown> = {}) => ({
  provider: "razorpay", displayName: "Razorpay", configured: true, fromPlatform: false, enabled: true, isDefault: true, mode: "Test", keyId: "rzp_test_1",
  keySecretHint: "••••1234", webhookSecretHint: null, needsWebhookSecret: true, webhookUrl: "https://api.test/hook", lastCheckedAt: null, lastCheckResult: null, currencies: ["INR"],
  ...overrides,
});

describe("payment gateway settings api", () => {
  it("lists gateways and saves one, sending an empty secret as null so the saved one is kept", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/payments/gateways": [settings()],
      "PUT /api/payments/gateways/razorpay": settings({ enabled: false }),
    });

    expect((await gateways.listPaymentGateways())[0].keySecretHint).toBe("••••1234");
    const saved = await gateways.savePaymentGateway("razorpay", { mode: "Test", enabled: false, isDefault: false, keyId: " rzp_test_1 ", keySecret: "  ", webhookSecret: "whsec" });

    expect(saved.enabled).toBe(false);
    expect(calls[1].body).toEqual({ mode: "Test", enabled: false, isDefault: false, keyId: "rzp_test_1", keySecret: null, webhookSecret: "whsec" });
  });

  it("tests keys and removes a gateway", async () => {
    const calls = stubClient(financeHttpClient, {
      "POST /api/payments/gateways/stripe/check": settings({ provider: "stripe", lastCheckResult: "OK" }),
      "DELETE /api/payments/gateways/stripe": null,
    });

    expect((await gateways.checkPaymentGateway("stripe")).lastCheckResult).toBe("OK");
    await gateways.deletePaymentGateway("stripe");

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["POST /api/payments/gateways/stripe/check", "DELETE /api/payments/gateways/stripe"]);
  });

  it("reads the ledger with filters, and reconciles", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/payments/transactions": { items: [{ id: "t1", kind: "PaymentCaptured" }], total: 1, page: 1, pageSize: 50 },
      "POST /api/payments/reconciliation/online": { ordersChecked: 2, recorded: 1, needAttention: 1, notes: ["Order x: amount mismatch"], refundsChecked: 0, refundsSettled: 0 },
    });

    expect((await gateways.listPaymentTransactions({ provider: "payu", kind: "PaymentCaptured", page: 2 })).total).toBe(1);
    expect((await gateways.reconcileOnlinePayments()).notes).toHaveLength(1);

    expect((calls[0].config as { params: unknown }).params).toEqual({ provider: "payu", kind: "PaymentCaptured", page: 2 });
  });

  it("sends a refund to the gateway and translates the result", async () => {
    stubClient(financeHttpClient, { "POST /api/refunds/r1/send-to-gateway": { id: "r1", status: "Pending", gatewayStatus: "Initiated", gatewayError: null } });

    expect(await gateways.sendRefundToGateway("r1")).toEqual({ id: "r1", status: "pending", gatewayStatus: "initiated", gatewayError: undefined });
  });

  it("turns server refusals into readable errors", async () => {
    stubClient(financeHttpClient, { "GET /api/payments/gateways": () => { throw apiError(403, { title: "Only school administrators can manage payment gateways." }); } });

    await expect(gateways.listPaymentGateways()).rejects.toThrow("Only school administrators can manage payment gateways.");
  });
});
