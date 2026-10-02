import * as portal from "./api";
import * as platform from "@/features/platform/api";
import { academicHttpClient, authHttpClient, engagementHttpClient } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { stubClient } from "@/test/utils";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [
    { id: "st1", className: "Class 5", guardians: [{ email: " Parent@Mail.test " }] },
    { id: "st2", className: "Class 6", guardians: [{ email: undefined }, { email: "parent@mail.test" }] },
    { id: "st3", className: "Class 5", guardians: [{ email: "other@mail.test" }] },
  ]),
  getStudent: vi.fn(async () => ({ id: "st1", className: "Class 5" })),
}));
vi.mock("@/features/attendance/api", () => ({
  listAttendanceRecords: vi.fn(async () => [
    { studentId: "st1", date: daysAgo(3), status: "late" },
    { studentId: "st1", date: daysAgo(5), status: "half-day" },
    { studentId: "st1", date: daysAgo(4), status: "leave" },
    { studentId: "st1", date: daysAgo(2), status: "present" },
    { studentId: "st2", date: daysAgo(2), status: "absent" },
  ]),
}));
vi.mock("@/features/academics/api", () => ({
  listSubjects: vi.fn(async () => [{ id: "math", name: "Maths" }]),
  listClasses: vi.fn(async () => [{ id: "c5", name: "Class 5" }]),
}));
vi.mock("@/features/homework/api", () => ({
  listAssignedHomework: vi.fn(async () => [
    { homework: { id: "h1", subjectId: "math", title: "Ex 1", assignedDate: "a", dueDate: "2000-01-01" }, submission: { status: "not_submitted", grade: undefined } },
    { homework: { id: "h2", subjectId: "math", title: "Ex 2", assignedDate: "a", dueDate: "2999-01-01" }, submission: { status: "not_submitted" } },
    { homework: { id: "h3", subjectId: "art", title: "Ex 3", assignedDate: "a", dueDate: "2000-01-01" }, submission: { status: "submitted" } },
    { homework: { id: "h4", subjectId: "math", title: "Ex 4", assignedDate: "a", dueDate: "2000-01-01" }, submission: { status: "graded", grade: "A" } },
  ]),
}));
vi.mock("@/features/examinations/api", () => ({
  listExams: vi.fn(async () => [{ id: "e1", classId: "c5", name: "Midterm", startDate: "2026-09-01" }, { id: "e2", classId: "c6", name: "Other", startDate: "" }]),
  listExamSchedules: vi.fn(async () => [{ examId: "e1", subjectId: "math", date: "2026-09-03" }]),
  getExamResults: vi.fn(async () => [
    { id: "r1", examId: "e1", subjectId: "math", studentId: "st1", marksObtained: 80, maxMarks: 100, grade: "A", isAbsent: false },
    { id: "r2", examId: "e1", subjectId: "sci", studentId: "st1", marksObtained: 70, maxMarks: 100, grade: "B", isAbsent: false },
    { id: "r3", examId: "e1", subjectId: "math", studentId: "st1", marksObtained: 0, maxMarks: 100, grade: "-", isAbsent: true },
    { id: "r4", examId: "e1", subjectId: "math", studentId: "st3", marksObtained: 90, maxMarks: 100, grade: "A+", isAbsent: false },
  ]),
}));
vi.mock("@/features/fees/api", () => ({
  listInvoicesForStudent: vi.fn(async () => [{ id: "i1", studentId: "st1", term: "T1", netAmount: 9000, dueDate: "2026-10-10", status: "due", paidOn: undefined, paidAmount: undefined }]),
}));
vi.mock("./razorpayCheckout", () => ({
  payInvoiceWithRazorpay: vi.fn(async () => ({ invoice: { id: "i1", studentId: "st1", term: "T1", netAmount: 9000, dueDate: "2026-10-10", status: "paid", paidOn: "2026-10-01", paidAmount: 9000 } })),
}));
vi.mock("@/features/notifications/api", () => ({
  listMyNotifications: vi.fn(async () => [{ id: "n1", tenantId: "t", title: "PTA", body: "Sat", createdAt: "", read: false, category: "event" }]),
  markRead: vi.fn(async () => undefined),
}));

describe("parent portal api", () => {
  it("finds the parent's children by guardian email, ignoring case and spacing", async () => {
    expect((await portal.getMyChildren(" PARENT@mail.test")).map((s) => s.id)).toEqual(["st1", "st2"]);
  });

  it("summarises the child's last 90 days of attendance", async () => {
    const summary = await portal.getAttendanceSummary("st1");

    expect(summary).toMatchObject({ presentDays: 2, absentDays: 1, lateDays: 1, totalDays: 4 });
    expect(summary.recent.map((d) => d.status)).toEqual(["present", "absent", "late", "present"]);
  });

  it("homework statuses: graded, submitted, overdue or pending", async () => {
    const items = await portal.listHomework("st1");

    expect(items.map((h) => [h.id, h.status, h.subject])).toEqual([
      ["h1", "overdue", "Maths"], ["h2", "pending", "Maths"], ["h3", "submitted", "—"], ["h4", "graded", "Maths"],
    ]);
    expect(items[3].grade).toBe("A");
    expect(items[0].grade).toBeUndefined();
  });

  it("exam results for the child's class, newest first, absences hidden", async () => {
    const results = await portal.listExamResults("st1");

    expect(results.map((r) => [r.id, r.subject, r.date])).toEqual([["r1", "Maths", "2026-09-03"], ["r2", "—", "2026-09-01"]]);
  });

  it("fees, online payment and notifications", async () => {
    expect(await portal.listFeeInvoices("st1")).toEqual([{ id: "i1", studentId: "st1", term: "T1", amount: 9000, dueDate: "2026-10-10", status: "due", paidOn: undefined, paidAmount: undefined }]);
    expect((await portal.payFeeInvoice("st1", "i1", { name: "P" })).status).toBe("paid");
    expect(await portal.listNotifications()).toEqual([{ id: "n1", tenantId: "t", title: "PTA", body: "Sat", createdAt: "", read: false }]);
    expect(await portal.markNotificationRead("n1")).toHaveLength(1);
  });

  it("message threads: lists them, or starts a General thread with the teacher", async () => {
    const thread = { id: "th1", studentId: "st1", teacherName: "Ms. Rao", subject: "General", messages: [{ id: "m1", sender: "Teacher", body: "Hi", sentAt: "" }] };
    const calls = stubClient(engagementHttpClient, {
      "GET api/ParentMessageThreads": (_u: string, _b: unknown, config: { params: { studentId: string } }) => (config.params.studentId === "st1" ? [thread] : []),
      "POST api/ParentMessageThreads": { ...thread, id: "th2", messages: [] },
      "POST api/ParentMessageThreads/th1/messages": { ...thread, messages: [...thread.messages, { id: "m2", sender: "Parent", body: "Thanks", sentAt: "" }] },
    });

    expect((await portal.listMessageThreads("st1", "Ms. Rao"))[0].messages[0].sender).toBe("teacher");
    expect((await portal.listMessageThreads("st2", "Mr. K"))[0].id).toBe("th2");
    expect((await portal.sendMessage("st1", "th1", "Thanks")).messages.at(-1)?.sender).toBe("parent");

    expect(calls[2].body).toEqual({ studentId: "st2", teacherName: "Mr. K", subject: "General" });
    expect(calls[3].body).toEqual({ sender: "Parent", body: "Thanks" });
  });

  it("leave requests", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/StudentLeaveRequests": [{ id: "lr1", studentId: "st1", status: "Approved" }],
      "POST api/StudentLeaveRequests": { id: "lr2", studentId: "st1", status: "Pending" },
    });

    expect((await portal.listLeaveRequests("st1"))[0].status).toBe("approved");
    expect((await portal.createLeaveRequest("st1", { fromDate: "a", toDate: "b", reason: "Fever" } as never)).status).toBe("pending");
    expect(calls[1].body).toEqual({ studentId: "st1", fromDate: "a", toDate: "b", reason: "Fever" });
  });
});

describe("platform api", () => {
  const plan = (id: string, price: number) => ({ id, name: `Plan ${id}`, tier: "Growth", monthlyPriceInr: price });
  const tenant = (id: string, status: string, planId = "p1", createdAt = "2026-01-01") => ({
    id, schoolName: id, subdomain: id, status, planId, billingContactName: "", billingContactEmail: "", createdAt,
  });

  beforeEach(() => useAuthStore.setState({ activeTenantId: "tenant-b" }));

  it("tenant rows put the current school first, then oldest, and skip unknown plans", async () => {
    stubClient(authHttpClient, {
      "GET /api/platform/tenants": [tenant("tenant-a", "Active", "p1", "2025-01-01"), tenant("tenant-b", "Trial", "p2", "2026-05-01"), tenant("tenant-c", "Suspended"), tenant("tenant-x", "Active", "gone")],
      "GET /api/platform/plans": [plan("p1", 5000), plan("p2", 9000)],
    });
    stubClient(academicHttpClient, { "GET /api/stats/tenant-counts": [{ tenantId: "tenant-a", studentCount: 300, staffCount: 20 }] });

    const rows = await platform.listTenants();
    const summary = await platform.getPlatformReportsSummary();

    expect(rows.map((r) => [r.id, r.status, r.isCurrentEnvironment, r.studentCount])).toEqual([
      ["tenant-b", "trial", true, 0], ["tenant-a", "active", false, 300], ["tenant-c", "suspended", false, 0],
    ]);
    expect(rows[1].plan.tier).toBe("growth");
    expect(summary).toMatchObject({ totalTenants: 3, activeTenants: 1, trialTenants: 1, suspendedTenants: 1, cancelledTenants: 0, mrrInr: 14000, totalStudentsAcrossTenants: 300, totalStaffAcrossTenants: 20 });
    expect(summary.tenantsByPlan).toEqual(expect.arrayContaining([{ planId: "p1", planName: "Plan p1", count: 2 }, { planId: "p2", planName: "Plan p2", count: 1 }]));
  });

  it("refuses to suspend, cancel or delete the school being viewed", async () => {
    await expect(platform.suspendTenant("tenant-b")).rejects.toThrow(/before suspending/);
    await expect(platform.cancelTenant("tenant-b")).rejects.toThrow(/before cancelling/);
    await expect(platform.deleteTenant("tenant-b")).rejects.toThrow(/before deleting/);
  });

  it("tenant lifecycle, plans and announcements", async () => {
    const calls = stubClient(authHttpClient, {
      "POST /api/platform/tenants": tenant("tenant-n", "Trial"),
      "PUT /api/platform/tenants/tenant-a/plan": tenant("tenant-a", "Active", "p2"),
      "PUT /api/platform/tenants/tenant-a/status": tenant("tenant-a", "Cancelled"),
      "DELETE /api/platform/tenants/tenant-a": null,
      "POST /api/platform/plans": plan("p3", 1),
      "PUT /api/platform/plans/p3": plan("p3", 2),
      "DELETE /api/platform/plans/p3": null,
      "GET /api/platform/announcements": [{ id: "an1", title: "Maintenance", body: "Sunday", active: true, createdAt: "", expiresAt: null }],
      "POST /api/platform/announcements": { id: "an2", title: "x", body: "y", active: true, createdAt: "", expiresAt: "2026-12-31" },
      "POST /api/platform/announcements/an1/toggle": { id: "an1", title: "Maintenance", body: "Sunday", active: false, createdAt: "", expiresAt: null },
      "DELETE /api/platform/announcements/an1": null,
    });

    expect((await platform.createTenant({ schoolName: "New" } as never)).status).toBe("trial");
    await platform.updateTenantPlan("tenant-a", "p2");
    await platform.activateTenant("tenant-a");
    await platform.suspendTenant("tenant-a");
    expect((await platform.cancelTenant("tenant-a")).status).toBe("cancelled");
    await platform.deleteTenant("tenant-a");
    await platform.createPlan({ name: "Lite", tier: "starter", monthlyPriceInr: 1 } as never);
    await platform.updatePlan("p3", { name: "Lite", tier: "enterprise", monthlyPriceInr: 2 } as never);
    await platform.deletePlan("p3");
    expect((await platform.listAnnouncements())[0].expiresAt).toBeUndefined();
    await platform.createAnnouncement({ title: "x", body: "y", expiresAt: "2026-12-31T23:59" } as never);
    await platform.createAnnouncement({ title: "x", body: "y" } as never);
    expect((await platform.toggleAnnouncementActive("an1")).active).toBe(false);
    await platform.deleteAnnouncement("an1");

    const statusBodies = calls.filter((c) => c.url.endsWith("/status")).map((c) => c.body);
    expect(statusBodies).toEqual([{ status: "Active" }, { status: "Suspended" }, { status: "Cancelled" }]);
    expect(calls.find((c) => c.url === "/api/platform/plans")?.body).toMatchObject({ tier: "Starter" });
    expect(calls.find((c) => c.url === "/api/platform/plans/p3" && c.method === "PUT")?.body).toMatchObject({ tier: "Enterprise" });
    const announcementBodies = calls.filter((c) => c.url === "/api/platform/announcements" && c.method === "POST").map((c) => c.body);
    expect(announcementBodies).toEqual([{ title: "x", body: "y", expiresAt: "2026-12-31" }, { title: "x", body: "y", expiresAt: null }]);
  });
});
