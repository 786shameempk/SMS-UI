import { beforeEach, describe, expect, it, vi } from "vitest";
import { engagementHttpClient } from "@/lib/httpClient";
import { exportHistory, listRules, previewTemplate, saveRule, searchHistory, setPreference } from "./platformApi";

vi.mock("@/lib/httpClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/httpClient")>("@/lib/httpClient");
  return { ...actual, engagementHttpClient: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } };
});

const http = vi.mocked(engagementHttpClient);

describe("notification platform api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps rules from the server's PascalCase enums and sends them back the same way", async () => {
    http.get.mockResolvedValue({
      data: [{ eventType: "fee.reminder", name: "Fee reminder", primaryChannels: ["WhatsApp"], fallbackChannels: ["Sms"], mandatory: false, active: true, priority: "High", customized: true }],
    });
    const [rule] = await listRules();
    expect(rule).toMatchObject({ primaryChannels: ["whatsapp"], fallbackChannels: ["sms"], priority: "high" });

    http.put.mockResolvedValue({ data: { ...rule, primaryChannels: ["Email"], fallbackChannels: [], priority: "Normal" } });
    await saveRule("fee.reminder", { name: "Fee reminder", primaryChannels: ["email"], fallbackChannels: ["in-app"], mandatory: false, active: true, priority: "normal" });
    expect(http.put).toHaveBeenCalledWith("api/messaging/rules/fee.reminder", expect.objectContaining({ primaryChannels: ["Email"], fallbackChannels: ["InApp"], priority: "Normal" }));
  });

  it("sends history filters in the server's format, dropping empty ones, and lower-cases the rows it gets back", async () => {
    http.get.mockResolvedValue({
      data: { items: [{ id: "1", channel: "Sms", status: "Delivered", priority: "Critical" }], total: 1, page: 2, pageSize: 25 },
    });
    const page = await searchHistory({ from: "2026-11-01", channel: "sms", status: "failed", eventType: " fee.reminder ", recipient: "", page: 2, pageSize: 25 });
    expect(http.get).toHaveBeenCalledWith("api/messaging/history", {
      params: { from: "2026-11-01", to: undefined, channel: "Sms", status: "Failed", eventType: "fee.reminder", recipient: undefined, page: 2, pageSize: 25 },
    });
    expect(page.items[0]).toMatchObject({ channel: "sms", status: "delivered", priority: "critical" });
  });

  it("exports without paging and as a blob", async () => {
    http.get.mockResolvedValue({ data: new Blob(["a,b"]) });
    await exportHistory({ channel: "email", page: 3, pageSize: 10 });
    const [, config] = http.get.mock.calls[0];
    expect(config).toMatchObject({ responseType: "blob", params: { channel: "Email", page: undefined, pageSize: undefined } });
  });

  it("records a preference with its channel and source, and previews with null for an empty subject", async () => {
    http.put.mockResolvedValue({ data: undefined });
    await setPreference("whatsapp", "98765 43210", false, "parent request");
    expect(http.put).toHaveBeenCalledWith("api/messaging/preferences", { channel: "WhatsApp", address: "98765 43210", enabled: false, source: "parent request" });

    http.post.mockResolvedValue({ data: { body: "x" } });
    await previewTemplate("", "Hi {{StudentName}}");
    expect(http.post).toHaveBeenCalledWith("api/messaging/templates/preview", { subject: null, body: "Hi {{StudentName}}", values: null });
  });
});
