import * as comms from "./api";
import { engagementHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const template = (overrides: Record<string, unknown> = {}) => ({
  id: "tp1", tenantId: "t", name: "Fee reminder", category: null, subject: null, body: "Pay", channels: ["Sms", "InApp"], ...overrides,
});
const group = (overrides: Record<string, unknown> = {}) => ({
  id: "g1", tenantId: "t", name: "Class 5 parents", description: null, audienceType: "Parents", memberIds: ["st1"], ...overrides,
});
const message = (overrides: Record<string, unknown> = {}) => ({
  id: "m1", tenantId: "t", subject: null, body: "Hi", channels: ["Email", "WhatsApp", "Push"], groupIds: ["g1"], studentIds: [], staffIds: [],
  recipientCount: 30, scheduledAt: null, sentAt: "2026-09-01", status: "Sent", createdAt: "", ...overrides,
});

describe("communication api", () => {
  it("templates: maps channels both ways and trims optional fields", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/MessageTemplates": [template(), template({ id: "tp2", category: "Fees", subject: "Due" })],
      "POST api/MessageTemplates": template(),
      "PUT api/MessageTemplates/tp1": template({ subject: "New" }),
      "DELETE api/MessageTemplates/tp1": null,
    });

    const rows = await comms.listTemplates();
    await comms.createTemplate({ name: "Fee reminder", category: "", subject: "  ", body: "Pay", channels: ["sms", "in-app"] } as never);
    expect((await comms.updateTemplate("tp1", { name: "N", category: "Fees", subject: " New ", body: "B", channels: ["whatsapp"] } as never)).subject).toBe("New");
    await comms.deleteTemplate("tp1");

    expect(rows[0]).toMatchObject({ channels: ["sms", "in-app"], category: undefined, subject: undefined });
    expect(rows[1]).toMatchObject({ category: "Fees", subject: "Due" });
    expect(calls[1].body).toEqual({ name: "Fee reminder", category: null, subject: null, body: "Pay", channels: ["Sms", "InApp"] });
    expect(calls[2].body).toEqual({ name: "N", category: "Fees", subject: "New", body: "B", channels: ["WhatsApp"] });
  });

  it("contact groups", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/ContactGroups": [group(), group({ id: "g2", audienceType: "Staff", description: "All staff" })],
      "POST api/ContactGroups": group({ audienceType: "Students" }),
      "PUT api/ContactGroups/g1": group(),
      "DELETE api/ContactGroups/g1": null,
    });

    const rows = await comms.listGroups();
    expect((await comms.createGroup({ name: "S", description: " ", audienceType: "students", memberIds: ["st1"] })).audienceType).toBe("students");
    await comms.updateGroup("g1", { name: "P", description: " Parents ", audienceType: "parents", memberIds: [] });
    await comms.deleteGroup("g1");

    expect(rows.map((g) => [g.audienceType, g.description])).toEqual([["parents", undefined], ["staff", "All staff"]]);
    expect(calls[1].body).toEqual({ name: "S", description: null, audienceType: "Students", memberIds: ["st1"] });
    expect(calls[2].body).toEqual({ name: "P", description: "Parents", audienceType: "Parents", memberIds: [] });
  });

  it("broadcasts: preview, list, compose, send now, cancel and delivery summary", async () => {
    const calls = stubClient(engagementHttpClient, {
      "POST api/BroadcastMessages/preview-recipient-count": { count: 42 },
      "GET api/BroadcastMessages": [message(), message({ id: "m2", status: "Scheduled", scheduledAt: "2026-10-05T03:30:00Z", sentAt: null, subject: "PTM" })],
      "POST api/BroadcastMessages": message({ status: "Scheduled" }),
      "POST api/BroadcastMessages/m2/send-now": message({ id: "m2" }),
      "POST api/BroadcastMessages/m2/cancel": message({ id: "m2", status: "Cancelled" }),
      "GET api/BroadcastMessages/m1/delivery-summary": [{ channel: "Sms", delivered: 28, failed: 2 }],
    });

    expect(await comms.previewRecipientCount(["g1"], ["st1"], [])).toBe(42);
    const rows = await comms.listMessages();
    const scheduledAt = "2026-10-05T09:00";
    const composed = await comms.composeMessage({
      subject: " PTM ", body: "Hi", channels: ["email", "push"], groupIds: ["g1"], studentIds: [], staffIds: ["sf1"], scheduledAt,
    } as never);
    await comms.composeMessage({ subject: "", body: "Now", channels: ["sms"], groupIds: [], studentIds: [], staffIds: [], scheduledAt: "" } as never);
    expect((await comms.sendScheduledNow("m2")).status).toBe("sent");
    expect((await comms.cancelScheduledMessage("m2")).status).toBe("cancelled");
    expect(await comms.getDeliverySummary("m1")).toEqual([{ channel: "sms", delivered: 28, failed: 2 }]);

    expect(calls[0].body).toEqual({ groupIds: ["g1"], studentIds: ["st1"], staffIds: [] });
    expect(rows[0]).toMatchObject({ channels: ["email", "whatsapp", "push"], status: "sent", subject: undefined, scheduledAt: undefined });
    expect(rows[1]).toMatchObject({ status: "scheduled", sentAt: undefined, subject: "PTM" });
    expect(composed.status).toBe("scheduled");
    expect(calls[2].body).toEqual({
      subject: "PTM", body: "Hi", channels: ["Email", "Push"], groupIds: ["g1"], studentIds: [], staffIds: ["sf1"], scheduledAt: new Date(scheduledAt).toISOString(),
    });
    expect(calls[3].body).toMatchObject({ subject: null, scheduledAt: null });
  });

  it("surfaces the server's error message", async () => {
    vi.spyOn(engagementHttpClient, "post").mockRejectedValue(apiError(400, { title: "Pick at least one recipient" }));
    await expect(comms.previewRecipientCount([], [], [])).rejects.toThrow("Pick at least one recipient");
  });
});
