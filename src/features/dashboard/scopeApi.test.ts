import { canSwitchScopeView, fetchScopeSummary } from "./scopeApi";
import { academicHttpClient, authHttpClient, financeHttpClient } from "@/lib/httpClient";
import { makeUser, stubClient } from "@/test/utils";

const range = { start: new Date("2026-09-01T00:00:00Z"), end: new Date("2026-09-30T23:59:59Z") };
const branchOf = (config: unknown) => (config as { headers: Record<string, string> }).headers["X-Branch-Id"];

function stubBranches() {
  stubClient(authHttpClient, {
    "GET /api/branches": [
      { id: "b1", name: "Main", status: "Active" },
      { id: "b2", name: "North", status: "Active" },
      { id: "b3", name: "Closed", status: "Inactive" },
    ],
  });
  const academic = stubClient(academicHttpClient, {
    "GET /api/students": (_u: string, _b: unknown, config: unknown) => ({ totalCount: branchOf(config) === "b1" ? 100 : 40 }),
    "GET /api/staff": [{ status: "Active" }, { status: "OnLeave" }, { status: "Resigned" }],
  });
  const finance = stubClient(financeHttpClient, {
    "GET /api/feeinvoices": [
      { status: "Paid", netAmount: 1000, paidAmount: null, dueDate: "2026-09-05", paidOn: "2026-09-04" },
      { status: "PartiallyPaid", netAmount: 1000, paidAmount: 300, dueDate: "2026-09-10", paidOn: null },
      { status: "Overdue", netAmount: 500, paidAmount: null, dueDate: "2026-09-01", paidOn: null },
      { status: "Paid", netAmount: 999, paidAmount: null, dueDate: "2026-07-01", paidOn: "2026-07-01" },
      { status: "Pending", netAmount: 700, paidAmount: null, dueDate: "2026-11-01", paidOn: null },
    ],
  });
  return { academic, finance };
}

describe("dashboard scope summary", () => {
  it("only all-branch users can switch the scope view", () => {
    expect(canSwitchScopeView(null)).toBe(false);
    expect(canSwitchScopeView(makeUser("superAdmin"))).toBe(true);
    expect(canSwitchScopeView(makeUser("admin", { allBranchAccess: true }))).toBe(true);
    expect(canSwitchScopeView(makeUser("teacher", { allBranchAccess: false }))).toBe(false);
  });

  it("aggregates every active branch, pinning the scope headers per request", async () => {
    const { academic } = stubBranches();

    const summary = await fetchScopeSummary("aggregated", "t1", "b1", range);

    expect(summary.branches).toEqual([{ id: "b1", name: "Main" }, { id: "b2", name: "North" }]);
    // Per branch: collected 1000 + 300 (in range), pending 700 + 500, one overdue. July/November rows fall outside the range.
    expect(summary.metrics).toEqual({ students: 140, staff: 4, feesCollected: 2600, feesPending: 2400, overdueInvoices: 2, failed: false });
    expect(academic.filter((c) => c.url === "/api/students").map((c) => branchOf(c.config))).toEqual(["b1", "b2"]);
    expect((academic[0].config as { params: unknown }).params).toEqual({ pageNumber: 1, pageSize: 1, status: "Active" });
  });

  it("segregated view reports only the selected branch", async () => {
    stubBranches();

    const summary = await fetchScopeSummary("segregated", "t1", "b2", range);

    expect(summary.branches).toEqual([{ id: "b2", name: "North" }]);
    expect(summary.metrics.students).toBe(40);
  });

  it("a failing service marks the summary partial instead of failing it", async () => {
    stubBranches();
    vi.spyOn(financeHttpClient, "get").mockRejectedValue(new Error("down"));

    const summary = await fetchScopeSummary("segregated", "t1", "b1", range);

    expect(summary.metrics).toMatchObject({ students: 100, staff: 2, feesCollected: 0, failed: true });
  });
});
