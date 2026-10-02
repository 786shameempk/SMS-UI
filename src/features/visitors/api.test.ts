import * as visitors from "./api";
import * as helpdesk from "@/features/helpdesk/api";
import { isOverdue, nextTicketNumber } from "@/features/helpdesk/constants";
import { campusHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [{ id: "st1", firstName: "Asha", lastName: "N", className: "Class 5", section: "A" }]),
}));
vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [{ id: "sf1", firstName: "Meera", lastName: "Rao", designation: "Teacher" }]),
}));

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "ve1", tenantId: "t", branchId: "b", visitorName: "Ravi Kumar", phone: "999", purpose: "Pickup", purposeNotes: null, hostType: "Student",
  hostStudentId: "st1", hostStaffId: null, hostOtherLabel: null, idProofType: null, idProofNumber: null, badgeNumber: "VIS-0001",
  checkInAt: hoursAgo(1), checkOutAt: null, status: "CheckedIn", preApprovalId: null, ...overrides,
});

describe("visitors api", () => {
  it("lists entries with host labels, visit length and watchlist hits", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/visitorentries": [
        entry(),
        entry({ id: "ve2", visitorName: "  BANNED person ", hostType: "Staff", hostStudentId: null, hostStaffId: "sf1", status: "CheckedOut", checkInAt: "2026-10-01T10:00:00Z", checkOutAt: "2026-10-01T10:45:00Z", purpose: "?" }),
        entry({ id: "ve3", hostType: "Other", hostStudentId: null, hostOtherLabel: " Principal's office " }),
        entry({ id: "ve4", hostType: "?", hostStudentId: null }),
        entry({ id: "ve5", hostStudentId: "gone" }),
        entry({ id: "ve6", hostType: "Staff", hostStudentId: null, hostStaffId: "gone" }),
      ],
      "GET /api/watchlist": [{ id: "w1", tenantId: "t", name: "Banned Person", phone: null, reason: "Trespass", addedAt: "" }],
    });

    const rows = await visitors.listVisitorEntries("checked-out");

    expect(rows.map((r) => r.hostLabel)).toEqual(["Asha N (Class 5 - A)", "Meera Rao (Teacher)", "Principal's office", "Other", "Unknown student", "Unknown staff"]);
    expect(rows[1]).toMatchObject({ durationMinutes: 45, onWatchlist: true, status: "checked-out", purpose: "other" });
    expect(rows[0]).toMatchObject({ durationMinutes: undefined, onWatchlist: false, idProofType: undefined });
    expect((calls[0].config as { params: unknown }).params).toEqual({ status: "CheckedOut" });
  });

  it("checks visitors in (only sending the host that matches the host type), out and from a pre-approval", async () => {
    const calls = stubClient(campusHttpClient, {
      "POST /api/visitorentries": entry(),
      "POST /api/visitorentries/from-pre-approval/pa1": entry({ preApprovalId: "pa1" }),
      "POST /api/visitorentries/ve1/check-out": entry({ status: "CheckedOut" }),
      "DELETE /api/visitorentries/ve1": null,
    });

    await visitors.checkInVisitor({ visitorName: "Ravi", phone: "999", purpose: "meeting", purposeNotes: " PTA ", hostType: "staff", hostStudentId: "st1", hostStaffId: "sf1", hostOtherLabel: "x", idProofType: " ", idProofNumber: "1234", preApprovalId: "" } as never);
    expect((await visitors.checkInFromPreApproval("pa1")).preApprovalId).toBe("pa1");
    expect((await visitors.checkOutVisitor("ve1")).status).toBe("checked-out");
    await visitors.deleteVisitorEntry("ve1");

    expect(calls[0].body).toEqual({
      visitorName: "Ravi", phone: "999", purpose: "Meeting", purposeNotes: "PTA", hostType: "Staff", hostStudentId: null, hostStaffId: "sf1", hostOtherLabel: null,
      idProofType: null, idProofNumber: "1234", preApprovalId: null,
    });
  });

  it("pre-approved visits", async () => {
    const visit = { ...entry(), id: "pa1", scheduledAt: "2026-10-02T04:30:00Z", status: "NoShow", visitorEntryId: null };
    const calls = stubClient(campusHttpClient, {
      "GET /api/preapprovedvisits": [visit, { ...visit, id: "pa2", status: "?" }],
      "POST /api/preapprovedvisits": visit,
      "POST /api/preapprovedvisits/pa1/cancel": { ...visit, status: "Cancelled" },
      "DELETE /api/preapprovedvisits/pa1": null,
    });

    const rows = await visitors.listPreApprovedVisits("no-show");
    await visitors.createPreApprovedVisit({ visitorName: "Ravi", phone: "1", purpose: "event", hostType: "other", hostOtherLabel: " Annual day ", scheduledAt: "2026-10-02T10:00" } as never);
    expect((await visitors.cancelPreApprovedVisit("pa1")).status).toBe("cancelled");
    await visitors.deletePreApprovedVisit("pa1");

    expect(rows.map((r) => r.status)).toEqual(["no-show", "scheduled"]);
    expect(rows[0].hostLabel).toBe("Asha N (Class 5 - A)");
    expect((calls[0].config as { params: unknown }).params).toEqual({ status: "NoShow" });
    expect(calls[1].body).toMatchObject({ hostType: "Other", hostOtherLabel: "Annual day", hostStudentId: null, scheduledAt: new Date("2026-10-02T10:00").toISOString() });
  });

  it("watchlist matching ignores case and spacing", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/watchlist": [{ id: "w1", tenantId: "t", name: "Banned Person", phone: "1", reason: "x", addedAt: "" }],
      "POST /api/watchlist": { id: "w2", tenantId: "t", name: "X", phone: null, reason: "y", addedAt: "" },
      "DELETE /api/watchlist/w1": null,
    });

    expect((await visitors.getWatchlistMatch("  banned PERSON "))?.id).toBe("w1");
    expect(await visitors.getWatchlistMatch("Someone else")).toBeUndefined();
    expect((await visitors.addWatchlistEntry({ name: "X", phone: " ", reason: "y" } as never)).phone).toBeUndefined();
    await visitors.deleteWatchlistEntry("w1");
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ name: "X", phone: null, reason: "y" });
  });

  it("reports summary", async () => {
    stubClient(campusHttpClient, {
      "GET /api/visitorentries": [
        entry(),
        entry({ id: "ve2", status: "CheckedOut", checkInAt: hoursAgo(3), checkOutAt: hoursAgo(2) }),
        entry({ id: "ve3", status: "CheckedOut", purpose: "Delivery", hostType: "Other", hostStudentId: null, hostOtherLabel: "Store", checkInAt: "2020-01-01T00:00:00Z", checkOutAt: "2020-01-01T00:30:00Z" }),
      ],
      "GET /api/watchlist": [],
    });

    const summary = await visitors.getVisitorReportsSummary();

    expect(summary).toMatchObject({ currentlyOnPremises: 1, visitsLast30Days: 2, avgVisitDurationMinutes: 45 });
    expect(summary.visitsByPurpose[0]).toEqual({ purpose: "pickup", count: 2 });
    expect(summary.topHosts[0]).toEqual({ label: "Asha N (Class 5 - A)", count: 2 });
  });

  it("an empty register has no average duration", async () => {
    stubClient(campusHttpClient, { "GET /api/visitorentries": [], "GET /api/watchlist": [] });
    expect((await visitors.getVisitorReportsSummary()).avgVisitDurationMinutes).toBeNull();
  });
});

const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: "tk1", tenantId: "t", branchId: "b", ticketNumber: "HD-2026-0001", category: "ItSupport", priority: "Urgent", status: "InProgress", subject: "Wi-Fi down",
  description: "", raisedByType: "Student", raisedByStudentId: "st1", raisedByStaffId: null, raisedByName: null, raisedByContact: null, assignedToStaffId: "sf1",
  createdAt: hoursAgo(100), updatedAt: "", resolvedAt: null, resolutionNotes: null,
  comments: [{ id: "c1", message: "On it", authorStaffId: null, authorLabel: "Front desk", createdAt: "", visibleToSubmitter: true }], ...overrides,
});

describe("helpdesk api", () => {
  it("lists tickets with labels, assignee and SLA overdue flags", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/tickets": [
        ticket(),
        ticket({ id: "tk2", raisedByType: "Staff", raisedByStudentId: null, raisedByStaffId: "sf1", status: "Resolved", createdAt: hoursAgo(500), assignedToStaffId: null }),
        ticket({ id: "tk3", raisedByType: "Parent", raisedByName: " Mrs Nair ", priority: "Low", createdAt: hoursAgo(1) }),
        ticket({ id: "tk4", raisedByType: "Parent", raisedByStudentId: null, raisedByName: null, category: "?", priority: "?", status: "?" }),
        ticket({ id: "tk5", raisedByType: "?", raisedByStudentId: null }),
        ticket({ id: "tk6", raisedByType: "Student", raisedByStudentId: "gone" }),
        ticket({ id: "tk7", raisedByType: "Staff", raisedByStudentId: null, raisedByStaffId: "gone" }),
      ],
    });

    const rows = await helpdesk.listTickets({ status: "in_progress", category: "it_support", priority: "urgent" });

    expect(rows.map((r) => r.raisedByLabel)).toEqual([
      "Asha N (Class 5 - A)", "Meera Rao (Teacher)", "Mrs Nair (parent of Asha N)", "Parent/Guardian", "Anonymous", "Unknown student", "Unknown staff",
    ]);
    expect(rows[0]).toMatchObject({ category: "it_support", priority: "urgent", status: "in_progress", isOverdue: true, assignedTo: { firstName: "Meera" } });
    expect(rows[1].isOverdue).toBe(false);
    expect(rows[2].isOverdue).toBe(false);
    expect(rows[3]).toMatchObject({ category: "other", priority: "medium", status: "open" });
    expect((calls[0].config as { params: unknown }).params).toEqual({ status: "InProgress", category: "ItSupport", priority: "Urgent" });
  });

  it("raises tickets sending only the raiser fields for the raiser type", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/tickets": ticket() });
    const base = { category: "fees_billing", priority: "high", subject: "s", description: "d", raisedByStudentId: "st1", raisedByStaffId: "sf1", raisedByName: " Mrs Nair ", raisedByContact: " 999 " };

    await helpdesk.raiseTicket({ ...base, raisedByType: "parent" } as never);
    await helpdesk.raiseTicket({ ...base, raisedByType: "staff" } as never);
    await helpdesk.raiseTicket({ ...base, raisedByType: "anonymous" } as never);

    expect(calls[0].body).toMatchObject({ category: "FeesBilling", priority: "High", raisedByType: "Parent", raisedByStudentId: "st1", raisedByStaffId: null, raisedByName: "Mrs Nair", raisedByContact: "999" });
    expect(calls[1].body).toMatchObject({ raisedByType: "Staff", raisedByStudentId: null, raisedByStaffId: "sf1", raisedByName: null });
    expect(calls[2].body).toMatchObject({ raisedByType: "Anonymous", raisedByStudentId: null, raisedByContact: null });
  });

  it("workflow actions and comments", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/tickets/tk1": ticket(),
      "POST /api/tickets/tk1/(assign|resolve|close|reopen|comments)": ticket(),
      "DELETE /api/tickets/tk1": null,
    });

    expect((await helpdesk.getTicket("tk1")).comments[0].authorStaffId).toBeUndefined();
    await helpdesk.assignTicket("tk1", "sf1");
    await helpdesk.resolveTicket("tk1", { resolutionNotes: "Router rebooted" });
    await helpdesk.closeTicket("tk1");
    await helpdesk.reopenTicket("tk1");
    await helpdesk.addComment("tk1", { message: "Fixed", visibleToSubmitter: true, authorStaffId: "sf1" } as never);
    await helpdesk.addComment("tk1", { message: "Noted", visibleToSubmitter: false } as never);
    await helpdesk.deleteTicket("tk1");

    expect(calls[1].body).toEqual({ staffId: "sf1" });
    expect(calls[2].body).toEqual({ resolutionNotes: "Router rebooted" });
    expect(calls[5].body).toEqual({ message: "Fixed", visibleToSubmitter: true, authorStaffId: "sf1", authorLabel: "Meera Rao" });
    expect(calls[6].body).toMatchObject({ authorStaffId: null, authorLabel: "Front desk" });
  });

  it("reports summary", async () => {
    const monthStartish = new Date();
    monthStartish.setDate(1);
    monthStartish.setHours(1);
    stubClient(campusHttpClient, {
      "GET /api/tickets": [
        ticket({ status: "Open", priority: "Low", createdAt: hoursAgo(1) }),
        ticket({ id: "tk2", status: "Reopened" }),
        ticket({ id: "tk3", status: "Resolved", category: "Hostel", createdAt: new Date(monthStartish.getTime() - 10 * 3600_000).toISOString(), resolvedAt: monthStartish.toISOString() }),
      ],
    });

    const summary = await helpdesk.getHelpDeskReportsSummary();

    expect(summary).toMatchObject({ openCount: 1, inProgressCount: 1, resolvedThisMonth: 1, avgResolutionHours: 10 });
    expect(summary.byCategory[0]).toEqual({ category: "it_support", count: 2 });
    expect(summary.overdueTickets.map((t) => t.id)).toEqual(["tk2"]);
  });

  it("ticket numbering and SLA helper", () => {
    expect(nextTicketNumber([`HD-${new Date().getFullYear()}-0009`, "junk"])).toBe(`HD-${new Date().getFullYear()}-0010`);
    expect(nextTicketNumber([])).toMatch(/-0001$/);
    expect(isOverdue({ status: "closed", createdAt: "2000-01-01", priority: "urgent" })).toBe(false);
  });
});
