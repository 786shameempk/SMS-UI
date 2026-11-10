import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { engagementHttpClient } from "@/lib/httpClient";
import { renderWithProviders, signIn, stubClient } from "@/test/utils";
import ConsentAuditTab from "./ConsentAuditTab";
import DeliveryLogTab from "./DeliveryLogTab";
import RulesTab from "./RulesTab";
import { MonthlyUsageCard } from "./UsageInsights";

const rule = (over: Record<string, unknown> = {}) => ({
  eventType: "fee.reminder", name: "Fee reminder", primaryChannels: ["WhatsApp"], fallbackChannels: ["Sms"], mandatory: false, active: true, priority: "Normal", customized: false, ...over,
});

describe("notification platform screens", () => {
  beforeEach(() => signIn("admin"));

  it("lists the rules with fallback order and saves a change with the fallback kept out of the preferred channels", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/messaging/rules": [rule(), rule({ eventType: "otp", name: "One-time password", primaryChannels: ["Sms"], fallbackChannels: ["WhatsApp"], mandatory: true, priority: "Critical" })],
      "PUT api/messaging/rules/fee.reminder": rule({ customized: true }),
    });
    const user = userEvent.setup();
    renderWithProviders(<RulesTab />);

    expect(await screen.findByText("One-time password")).toBeInTheDocument();
    expect(screen.getByText("Mandatory")).toBeInTheDocument();

    const row = screen.getByText("Fee reminder").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    // Make SMS preferred too: it must leave the fallback list.
    await user.click(await screen.findByRole("button", { name: "SMS" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(calls.some((c) => c.method === "PUT" && c.url.endsWith("fee.reminder"))).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.body).toMatchObject({ primaryChannels: ["WhatsApp", "Sms"], fallbackChannels: [], priority: "Normal" });
  });

  it("shows fallback and errors in the delivery log and sends the recipient filter", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/messaging/history": {
        items: [
          { id: "1", messageId: "m", eventType: "fee.reminder", channel: "Sms", recipientName: "Mrs. Khan", address: "+91•••••43210", status: "Failed", priority: "Normal", provider: "Msg91",
            providerMessageId: null, templateName: "Fee SMS", attemptCount: 5, fallbackOrder: 1, lastError: "Gave up after 5 attempts", cost: 0.25, category: null, createdAt: "2026-11-08T10:00:00Z",
            queuedAt: null, sentAt: null, deliveredAt: null, failedAt: null },
        ],
        total: 1, page: 1, pageSize: 25,
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<DeliveryLogTab />);

    expect(await screen.findByText("Mrs. Khan")).toBeInTheDocument();
    expect(screen.getByText("(fallback)")).toBeInTheDocument();
    expect(screen.getByText("Gave up after 5 attempts")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Recipient"), "Khan");
    await waitFor(() => expect(calls.some((c) => JSON.stringify((c.config as { params?: unknown } | undefined)?.params ?? {}).includes('"recipient":"Khan"'))).toBe(true));
  });

  it("records an opt-out with its source and shows the audit trail", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/messaging/preferences": [{ id: "p1", channel: "Sms", address: "+91•••••43210", optedIn: false, source: "parent request", kind: "opt-out", updatedAt: "2026-11-08T10:00:00Z" }],
      "GET api/messaging/audit": [{ id: "a1", area: "rule", action: "save", subject: "fee.reminder", detail: "primary WhatsApp", actorEmail: "admin@educore.dev", at: "2026-11-08T10:00:00Z" }],
      "PUT api/messaging/preferences": {},
    });
    const user = userEvent.setup();
    renderWithProviders(<ConsentAuditTab />);

    expect(await screen.findByText("Opted out")).toBeInTheDocument();
    expect(await screen.findByText("admin@educore.dev", { exact: false })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Address"), "98765 43210");
    await user.type(screen.getByLabelText("Source"), "parent call");
    await user.click(screen.getByRole("button", { name: "Record opt-out" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toEqual({ channel: "Sms", address: "98765 43210", enabled: false, source: "parent call" });
  });

  it("shows overage against the quota in the monthly usage", async () => {
    stubClient(engagementHttpClient, {
      "GET api/messaging/usage/monthly": {
        month: "2026-11", totalCost: 7.5,
        rows: [{ channel: "Sms", category: null, attempted: 10, delivered: 8, failed: 2, skipped: 0, estimatedCost: 5, quota: 8, overage: 2, percentUsed: 125, alertRaised: true }],
      },
    });
    renderWithProviders(<MonthlyUsageCard />);
    expect(await screen.findByText(/8 \(125%\)/)).toBeInTheDocument();
    expect(screen.getByText("Alert sent")).toBeInTheDocument();
  });
});
