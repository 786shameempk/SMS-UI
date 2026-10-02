import * as payroll from "./api";
import { listStaff, recordSalaryPayment } from "@/features/staff/api";
import { financeHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(),
  recordSalaryPayment: vi.fn(),
}));

const staff = [
  { id: "s1", firstName: "Zara", status: "active", salary: { basic: 100, allowances: 10, deductions: 5 } },
  { id: "s2", firstName: "Anil", status: "on-leave", salary: { basic: 200, allowances: 0, deductions: 0 } },
  { id: "s3", firstName: "Gone", status: "resigned", salary: { basic: 300, allowances: 0, deductions: 0 } },
];
const run = (overrides: Record<string, unknown> = {}) => ({
  id: "r1", tenantId: "t", month: "2026-08", status: "Draft", generatedAt: "", finalizedAt: null, staffCount: 2, totalNetPay: 305, paidCount: 0, ...overrides,
});
const slip = (overrides: Record<string, unknown> = {}) => ({
  id: "p1", tenantId: "t", runId: "r1", staffId: "s1", month: "2026-08", basic: 100, allowances: 10, deductions: 5, netPay: 105, paid: false, paidOn: null, ...overrides,
});

beforeEach(() => {
  vi.mocked(listStaff).mockResolvedValue(staff as never);
  vi.mocked(recordSalaryPayment).mockReset().mockResolvedValue(undefined as never);
});

describe("payroll api", () => {
  it("lists runs newest month first and maps statuses", async () => {
    stubClient(financeHttpClient, {
      "GET /api/payrollruns": [run(), run({ id: "r2", month: "2026-09", status: "Finalized", finalizedAt: "2026-09-30" }), run({ id: "r3", month: "2026-07", status: "?" })],
      "GET /api/payrollruns/r2": run({ id: "r2", status: "Finalized" }),
    });

    const runs = await payroll.listPayrollRuns();

    expect(runs.map((r) => [r.month, r.status, r.finalizedAt])).toEqual([
      ["2026-09", "finalized", "2026-09-30"], ["2026-08", "draft", undefined], ["2026-07", "draft", undefined],
    ]);
    expect((await payroll.getPayrollRun("r2")).status).toBe("finalized");
  });

  it("joins payslips to staff, drops orphans and sorts by month then first name", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/payslips": [
        slip(), slip({ id: "p2", staffId: "s2" }), slip({ id: "p3", staffId: "ghost" }), slip({ id: "p4", month: "2026-09", paid: true, paidOn: "2026-09-30" }),
      ],
    });

    const rows = await payroll.listPayslips("r1");
    await payroll.listPayslips();

    expect(rows.map((r) => [r.id, r.staff.firstName, r.paidOn])).toEqual([["p4", "Zara", "2026-09-30"], ["p2", "Anil", undefined], ["p1", "Zara", undefined]]);
    expect((calls[0].config as { params: unknown }).params).toEqual({ runId: "r1" });
    expect((calls[1].config as { params: unknown }).params).toBeUndefined();
  });

  it("generates a run for active and on-leave staff only", async () => {
    const calls = stubClient(financeHttpClient, {
      "POST /api/payrollruns/generate": { run: run(), createdCount: 2, skippedCount: 0 },
      "POST /api/payrollruns/r1/finalize": run({ status: "Finalized" }),
      "DELETE /api/payrollruns/r1": null,
    });

    const result = await payroll.generatePayrollRun("2026-08");
    expect((await payroll.finalizePayrollRun("r1")).status).toBe("finalized");
    await payroll.deletePayrollRun("r1");

    expect(result).toMatchObject({ createdCount: 2, skippedCount: 0, run: { status: "draft" } });
    expect(calls[0].body).toEqual({
      month: "2026-08",
      eligibleStaff: [{ staffId: "s1", basic: 100, allowances: 10, deductions: 5 }, { staffId: "s2", basic: 200, allowances: 0, deductions: 0 }],
    });
  });

  it("marking paid also records the salary payment on the staff member", async () => {
    stubClient(financeHttpClient, { "POST /api/payslips/p1/mark-paid": slip({ paid: true }) });

    const updated = await payroll.markPayslipPaid("p1");

    expect(updated.paid).toBe(true);
    expect(recordSalaryPayment).toHaveBeenCalledWith("s1", "2026-08");
  });

  it("a 409 (already paid) still retries the salary-history step", async () => {
    stubClient(financeHttpClient, { "GET /api/payslips": [slip({ id: "p1", paid: true })] });
    vi.spyOn(financeHttpClient, "post").mockRejectedValue(apiError(409, { title: "Already paid" }));

    const updated = await payroll.markPayslipPaid("p1");

    expect(updated.paid).toBe(true);
    expect(recordSalaryPayment).toHaveBeenCalledWith("s1", "2026-08");
  });

  it("rethrows other failures and a 409 for an unknown payslip", async () => {
    vi.spyOn(financeHttpClient, "post").mockRejectedValue(apiError(500, { title: "Boom" }));
    await expect(payroll.markPayslipPaid("p1")).rejects.toThrow("Boom");

    stubClient(financeHttpClient, { "GET /api/payslips": [] });
    vi.spyOn(financeHttpClient, "post").mockRejectedValue(apiError(409, { title: "Already paid" }));
    await expect(payroll.markPayslipPaid("p1")).rejects.toThrow("Already paid");
    expect(recordSalaryPayment).not.toHaveBeenCalled();
  });

  it("explains a failed salary-history write so the user can retry", async () => {
    stubClient(financeHttpClient, { "POST /api/payslips/p1/mark-paid": slip({ paid: true }) });
    vi.mocked(recordSalaryPayment).mockRejectedValueOnce(new Error("staff offline"));

    await expect(payroll.markPayslipPaid("p1")).rejects.toThrow(/^Payslip marked as paid, but .* failed: staff offline\./);

    vi.mocked(recordSalaryPayment).mockRejectedValueOnce("nope");
    await expect(payroll.markPayslipPaid("p1")).rejects.toThrow(/failed: unknown error/);
  });
});
