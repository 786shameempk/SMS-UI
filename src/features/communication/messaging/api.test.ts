import * as api from "./api";
import { engagementHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const provider = (o: Record<string, unknown> = {}) => ({
  channel: "Sms", provider: "Twilio", enabled: true, configured: true, settings: { accountSid: "AC1" }, secretsSet: ["authToken"], missingFields: [],
  webhookUrl: "https://x/twilio/1", perMinuteLimit: 60, dailyLimit: 5000, costPerMessage: 0.25, optInCollectedAtAdmission: false,
  platformDefaultAvailable: false, platformDefaultProvider: null, lastTestAt: null, lastTestSucceeded: null, lastTestMessage: null, ...o,
});

describe("messaging api", () => {
  it("reads channel readiness and provider settings, translating channels", async () => {
    stubClient(engagementHttpClient, {
      "GET api/messaging/channels": [{ channel: "WhatsApp", ready: false, provider: null, message: "WhatsApp is not set up." }, { channel: "InApp", ready: true, provider: "InApp", message: "" }],
      "GET api/messaging/providers": [provider(), provider({ channel: "Email", provider: null, configured: false })],
    });

    const status = await api.getChannelStatus();
    expect(status.map((s) => s.channel)).toEqual(["whatsapp", "in-app"]);
    const configs = await api.listProviders();
    expect(configs.map((c) => c.channel)).toEqual(["sms", "email"]);
  });

  it("saves, deletes and tests a provider on the channel's PascalCase route", async () => {
    const calls = stubClient(engagementHttpClient, {
      "PUT api/messaging/providers/Sms": provider(),
      "DELETE api/messaging/providers/WhatsApp": null,
      "POST api/messaging/providers/Email/test": { accepted: true, providerMessageId: "m1", message: "Accepted by Smtp", provider: "Smtp" },
    });
    const input = { provider: "Twilio" as const, enabled: true, settings: { accountSid: "AC1" }, secrets: { authToken: "" }, perMinuteLimit: 60, dailyLimit: 10,
      costPerMessage: null, optInCollectedAtAdmission: false };

    expect((await api.saveProvider("sms", input)).channel).toBe("sms");
    expect(calls[0].body).toEqual(input);
    await api.deleteProvider("whatsapp");
    expect((await api.sendTest("email", "head@school.in")).accepted).toBe(true);
    expect(calls[2].body).toEqual({ to: "head@school.in" });
  });

  it("lists deliveries with filters, retries and cancels", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/messaging/messages/m1/deliveries": [{ id: "d1", recipientKind: "Parent", recipientId: "s1", recipientName: "Anita", channel: "Sms", address: "+91•••••43210",
        status: "PendingReview", provider: "Msg91", attemptCount: 2, lastError: "503", queuedAt: null, sentAt: null, deliveredAt: null, failedAt: null, nextAttemptAt: null }],
      "POST api/messaging/messages/m1/retry-failed": { count: 3 },
      "POST api/messaging/messages/m1/cancel-queued": { count: 1 },
    });

    const [row] = await api.listDeliveries("m1", { status: "failed", channel: "whatsapp" });
    expect(row).toMatchObject({ channel: "sms", recipientKind: "parent" });
    expect(calls[0].config).toMatchObject({ params: { status: "Failed", channel: "WhatsApp" } });
    expect(await api.retryFailed("m1")).toBe(3);
    expect(await api.cancelQueued("m1")).toBe(1);
  });

  it("usage, suppressions and opt-ins", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/messaging/usage": [{ day: "2026-10-22", channel: "Email", provider: "Smtp", attempted: 2, delivered: 1, failed: 0, skipped: 1, estimatedCost: 0.02 }],
      "GET api/messaging/suppressions": [{ id: "s1", channel: "WhatsApp", address: "+91•••", reason: "OptOut", source: "whatsapp reply", detail: null, createdAt: "" }],
      "POST api/messaging/suppressions": { id: "s2", channel: "Email", address: "a•••@x.in", reason: "Manual", source: "admin", detail: null, createdAt: "" },
      "DELETE api/messaging/suppressions/s1": null,
      "GET api/messaging/optins": [{ id: "o1", address: "+91•••", optedIn: true, source: "form", updatedAt: "" }],
      "POST api/messaging/optins": { count: 2 },
    });

    expect((await api.getUsage("2026-10-01", "2026-10-22"))[0].channel).toBe("email");
    expect(calls[0].config).toMatchObject({ params: { from: "2026-10-01", to: "2026-10-22" } });
    expect((await api.listSuppressions())[0]).toMatchObject({ channel: "whatsapp", reason: "optOut" });
    expect((await api.addSuppression("email", "a@x.in")).reason).toBe("manual");
    expect(calls[2].body).toEqual({ channel: "Email", address: "a@x.in", detail: null });
    await api.removeSuppression("s1");
    expect(await api.listOptIns()).toHaveLength(1);
    expect(await api.recordOptIns(["9876543210", "9123456789"], "Admission form")).toBe(2);
  });

  it("surfaces the server's message", async () => {
    vi.spyOn(engagementHttpClient, "post").mockRejectedValue(apiError(409, { title: "SMS is not set up and switched on." }));
    await expect(api.sendTest("sms", "9876543210")).rejects.toThrow("SMS is not set up and switched on.");
  });
});
