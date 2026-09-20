import type { StaffMember } from "@/features/staff/types";
import type { PayrollRun, Payslip } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

function netPayOf(staff: StaffMember): number {
  return staff.salary.basic + staff.salary.allowances - staff.salary.deductions;
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Builds two finalized-and-paid historical runs from whatever's already in each staff member's own
 * `salaryHistory` (so the payroll seed never contradicts numbers already visible on their profile's
 * Salary tab), plus one finalized-but-unpaid run for last month covering every currently eligible
 * staff member, to give the module something concrete to pay off during a demo. */
export function buildSeedPayrollData(staff: StaffMember[]): { runs: Omit<PayrollRun, "tenantId">[]; payslips: Omit<Payslip, "tenantId">[] } {
  const runs: Omit<PayrollRun, "tenantId">[] = [];
  const payslips: Omit<Payslip, "tenantId">[] = [];
  const eligible = staff.filter((s) => s.status === "active" || s.status === "on-leave");

  const historicalMonths = ["2026-06", "2026-07"];
  for (const month of historicalMonths) {
    const paidStaff = eligible
      .map((s) => ({ staff: s, payment: s.salaryHistory.find((p) => p.month === month) }))
      .filter((row): row is { staff: StaffMember; payment: NonNullable<(typeof row)["payment"]> } => Boolean(row.payment));
    if (paidStaff.length === 0) continue;

    const run: Omit<PayrollRun, "tenantId"> = {
      id: genId("run"),
      month,
      status: "finalized",
      generatedAt: paidStaff[0].payment.paidOn,
      finalizedAt: paidStaff[0].payment.paidOn,
    };
    runs.push(run);
    for (const { staff: s, payment } of paidStaff) {
      payslips.push({
        id: genId("psl"),
        runId: run.id,
        staffId: s.id,
        month,
        basic: s.salary.basic,
        allowances: s.salary.allowances,
        deductions: s.salary.deductions,
        netPay: payment.amountPaid,
        paid: true,
        paidOn: payment.paidOn,
      });
    }
  }

  const currentRunMonth = "2026-08";
  const currentRun: Omit<PayrollRun, "tenantId"> = {
    id: genId("run"),
    month: currentRunMonth,
    status: "finalized",
    generatedAt: daysAgo(2),
    finalizedAt: daysAgo(1),
  };
  runs.push(currentRun);
  for (const s of eligible) {
    if (s.salaryHistory.some((p) => p.month === currentRunMonth)) continue;
    payslips.push({
      id: genId("psl"),
      runId: currentRun.id,
      staffId: s.id,
      month: currentRunMonth,
      basic: s.salary.basic,
      allowances: s.salary.allowances,
      deductions: s.salary.deductions,
      netPay: netPayOf(s),
      paid: false,
    });
  }

  return { runs, payslips };
}
