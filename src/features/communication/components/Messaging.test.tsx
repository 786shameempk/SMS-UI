import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { engagementHttpClient } from "@/lib/httpClient";
import { renderWithProviders, signIn, stubClient } from "@/test/utils";
import ChannelSelector from "./ChannelSelector";
import MessageDetailDialog from "./MessageDetailDialog";
import MessagingSettingsTab from "./MessagingSettingsTab";
import type { BroadcastMessage } from "../types";

const message: BroadcastMessage = {
  id: "m1", tenantId: "t", subject: "PTA meeting", body: "Saturday 10 am", channels: ["sms", "email"], groupIds: [], studentIds: [], staffIds: ["s1"],
  recipientCount: 2, status: "sent", createdAt: "2026-10-22T03:00:00Z", sentAt: "2026-10-22T03:00:00Z",
};

describe("communication delivery", () => {
  beforeEach(() => signIn("admin"));

  it("warns when a chosen channel is not set up, from the server's own status", async () => {
    stubClient(engagementHttpClient, {
      "GET api/messaging/channels": [
        { channel: "Sms", ready: false, provider: null, message: "SMS is not set up. An administrator can connect a provider in Communication settings." },
        { channel: "Email", ready: true, provider: "Smtp", message: "Sends through Smtp." },
      ],
    });
    renderWithProviders(<ChannelSelector value={["sms", "email"]} onChange={() => {}} />);
    expect(await screen.findByText(/SMS is not set up/)).toBeInTheDocument();
    expect(screen.getByText("not set up")).toBeInTheDocument();
  });

  it("shows real per-recipient statuses and retries failed deliveries", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/BroadcastMessages/m1/delivery-summary": [
        { channel: "Sms", delivered: 1, failed: 1, queued: 0, sent: 0, skipped: 0 },
        { channel: "Email", delivered: 0, failed: 0, queued: 0, sent: 0, skipped: 2 },
      ],
      "GET api/messaging/messages/m1/deliveries": [
        { id: "d1", recipientKind: "Staff", recipientId: "s1", recipientName: "Uma Admin", channel: "Sms", address: "+91•••••88888", status: "Delivered", provider: "Twilio",
          attemptCount: 1, lastError: null, queuedAt: null, sentAt: null, deliveredAt: null, failedAt: null, nextAttemptAt: null },
        { id: "d2", recipientKind: "Staff", recipientId: "s2", recipientName: "Bad Number", channel: "Sms", address: "+91•••••11111", status: "Failed", provider: "Twilio",
          attemptCount: 1, lastError: "Twilio 400: Invalid 'To' Phone Number", queuedAt: null, sentAt: null, deliveredAt: null, failedAt: null, nextAttemptAt: null },
      ],
      "POST api/messaging/messages/m1/retry-failed": { count: 1 },
    });
    const user = userEvent.setup();
    renderWithProviders(<MessageDetailDialog open onOpenChange={() => {}} message={message} />);

    expect(await screen.findByText(/Invalid 'To' Phone Number/)).toBeInTheDocument();
    expect(screen.getByText("2 skipped")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Retry failed/ }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/retry-failed"))).toBe(true));
  });

  it("saves a provider with write-only secrets and sends a real test", async () => {
    const twilio = {
      channel: "Sms", provider: "Twilio", enabled: true, configured: true, settings: { accountSid: "AC1", fromNumber: "+15005550006" }, secretsSet: ["authToken"],
      missingFields: [], webhookUrl: "https://app/services/engagement/api/messaging/webhooks/twilio/abc", perMinuteLimit: 60, dailyLimit: 5000, costPerMessage: null,
      optInCollectedAtAdmission: false, platformDefaultAvailable: false, platformDefaultProvider: null, lastTestAt: null, lastTestSucceeded: null, lastTestMessage: null,
    };
    const empty = (channel: string) => ({ ...twilio, channel, provider: null, enabled: false, configured: false, settings: {}, secretsSet: [], webhookUrl: null });
    const calls = stubClient(engagementHttpClient, {
      "GET api/messaging/providers": [empty("Email"), twilio, empty("WhatsApp")],
      "PUT api/messaging/providers/Sms": twilio,
      "POST api/messaging/providers/Sms/test": { accepted: true, providerMessageId: "SM1", message: "Accepted by Twilio (id SM1).", provider: "Twilio" },
      "GET api/messaging/suppressions": [],
      "GET api/messaging/optins": [],
    });
    const user = userEvent.setup();
    renderWithProviders(<MessagingSettingsTab />);

    // The stored secret is never shown, only that it exists.
    const token = await screen.findByLabelText(/Auth token/);
    expect(token).toHaveValue("");
    expect(token).toHaveAttribute("placeholder", "•••••••• stored");

    const saveButtons = screen.getAllByRole("button", { name: /Save/ });
    await user.click(saveButtons[1]);
    await waitFor(() => expect(calls.find((c) => c.method === "PUT")?.body).toMatchObject({ provider: "Twilio", secrets: {} }));

    await user.type(screen.getByLabelText("Test SMS recipient"), "+91 98765 43210");
    await user.click(screen.getAllByRole("button", { name: /Send test/ })[1]);
    await waitFor(() => expect(calls.find((c) => c.url.endsWith("/test"))?.body).toEqual({ to: "+91 98765 43210" }));
  });
});
