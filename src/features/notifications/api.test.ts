import * as notifications from "./api";
import { submitLead } from "@/features/marketing/api";
import { authHttpClient, engagementHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: "n1", tenantId: "t", title: "Holiday", body: "Closed", category: "Announcement", createdAt: "", read: false,
  recipientRole: null, actionLabel: null, actionUrl: null, sourceModule: null, ...overrides,
});

describe("notifications api", () => {
  it("lists all and mine, and reads the unread count", async () => {
    stubClient(engagementHttpClient, {
      "GET api/Notifications/mine/unread-count": { count: 3 },
      "GET api/Notifications/mine": [notification({ category: "Meeting", recipientRole: "teacher", actionLabel: "Join", actionUrl: "/meetings/1", sourceModule: "meetings" })],
      "GET api/Notifications": [notification(), notification({ id: "n2", category: "Finance", read: true })],
    });

    const all = await notifications.listNotifications();
    const [mine] = await notifications.listMyNotifications();

    expect(all.map((n) => [n.category, n.read, n.recipientRole, n.actionUrl])).toEqual([["announcement", false, undefined, undefined], ["finance", true, undefined, undefined]]);
    expect(mine).toMatchObject({ category: "meeting", recipientRole: "teacher", actionLabel: "Join", actionUrl: "/meetings/1", sourceModule: "meetings" });
    expect(await notifications.getUnreadCountForCurrentUser()).toBe(3);
  });

  it("posts announcements and changes read state", async () => {
    const calls = stubClient(engagementHttpClient, {
      "POST api/Notifications/mine/read-all": null,
      "POST api/Notifications/n1/read": notification({ read: true }),
      "POST api/Notifications": notification({ category: "Alert" }),
      "DELETE api/Notifications/n1": null,
    });

    const posted = await notifications.postAnnouncement({ title: "Fire drill", body: "11am", category: "alert", audience: "all", actionUrl: "  " } as never);
    await notifications.postAnnouncement({ title: "T", body: "B", category: "talent", audience: "students", actionUrl: " /talents " } as never);
    expect((await notifications.markRead("n1")).read).toBe(true);
    await notifications.markAllReadForCurrentUser();
    await notifications.deleteNotification("n1");

    expect(posted.category).toBe("alert");
    expect(calls[0].body).toEqual({ title: "Fire drill", body: "11am", category: "Alert", audience: "all", actionUrl: null });
    expect(calls[1].body).toMatchObject({ category: "Talent", actionUrl: "/talents" });
    expect(calls.map((c) => c.url).slice(2)).toEqual(["api/Notifications/n1/read", "api/Notifications/mine/read-all", "api/Notifications/n1"]);
  });

  it("surfaces the server's error message", async () => {
    vi.spyOn(engagementHttpClient, "get").mockRejectedValue(apiError(401, { title: "Session expired" }));
    await expect(notifications.listMyNotifications()).rejects.toThrow("Session expired");
  });
});

describe("marketing lead form", () => {
  it("sends the API kind and nulls blank contact fields", async () => {
    const calls = stubClient(authHttpClient, { "POST /api/leads": null });

    await submitLead({ kind: "contact", name: "Anu", phone: "", email: "anu@example.com", message: "Hello" });
    await submitLead({ kind: "demo", name: "B", email: "b@example.com", phone: "99", schoolName: "GVS", studentCount: "500" });

    expect(calls[0].body).toEqual({ kind: "Contact", name: "Anu", phone: null, email: "anu@example.com", message: "Hello" });
    expect(calls[1].body).toMatchObject({ kind: "Demo", phone: "99", schoolName: "GVS" });
  });

  it("explains rate limiting and falls back to a friendly message", async () => {
    const post = vi.spyOn(authHttpClient, "post");
    const quote = { kind: "quote", name: "C", email: "c@example.com", phone: "1", schoolName: "S", studentCount: "10" } as const;

    post.mockRejectedValueOnce(apiError(429));
    await expect(submitLead(quote)).rejects.toThrow(/please wait a minute/);

    post.mockRejectedValueOnce(apiError(400, { title: "Email is invalid" }));
    await expect(submitLead(quote)).rejects.toThrow("Email is invalid");

    post.mockRejectedValueOnce(new Error("Network Error"));
    await expect(submitLead(quote)).rejects.toThrow("We couldn't send your request. Please try again in a moment.");
  });
});
