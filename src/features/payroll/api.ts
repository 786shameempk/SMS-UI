import { financeHttpClient, extractApiErrorMessage, getApiErrorStatus } from "@/lib/httpClient";
import { listStaff, recordSalaryPayment } from "@/features/staff/api";
import type { GeneratePayrollResult, Payslip, PayrollRunStatus, PayrollRunSummary, PayslipRow } from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// FinanceService's enums serialize as PascalCase (C# convention); SMS UI's types use lowercase unions.

const PAYROLL_RUN_STATUS_FROM_API: Record<string, PayrollRunStatus> = { Draft: "draft", Finalized: "finalized" };

// ── API response shapes (FinanceService DTOs) ───────────────────────────────

interface ApiPayrollRunSummary {
  id: string;
  tenantId: string;
  month: string;
  status: string;
  generatedAt: string;
  finalizedAt: string | null;
  staffCount: number;
  totalNetPay: number;
  paidCount: number;
}

interface ApiPayslip {
  id: string;
  tenantId: string;
  runId: string;
  staffId: string;
  month: string;
  basic: number;
  allowances: number;
  deductions: number;
  netPay: number;
  paid: boolean;
  paidOn: string | null;
}

interface ApiGeneratePayrollResult {
  run: ApiPayrollRunSummary;
  createdCount: number;
  skippedCount: number;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapPayrollRunSummary(dto: ApiPayrollRunSummary): PayrollRunSummary {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    month: dto.month,
    status: PAYROLL_RUN_STATUS_FROM_API[dto.status] ?? "draft",
    generatedAt: dto.generatedAt,
    finalizedAt: dto.finalizedAt ?? undefined,
    staffCount: dto.staffCount,
    totalNetPay: dto.totalNetPay,
    paidCount: dto.paidCount,
  };
}

function mapPayslip(dto: ApiPayslip): Payslip {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    runId: dto.runId,
    staffId: dto.staffId,
    month: dto.month,
    basic: dto.basic,
    allowances: dto.allowances,
    deductions: dto.deductions,
    netPay: dto.netPay,
    paid: dto.paid,
    paidOn: dto.paidOn ?? undefined,
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Payroll runs ─────────────────────────────────────────────────────────

export async function listPayrollRuns(): Promise<PayrollRunSummary[]> {
  const runs = await unwrap(financeHttpClient.get<ApiPayrollRunSummary[]>("/api/payrollruns"));
  return runs.map(mapPayrollRunSummary).sort((a, b) => b.month.localeCompare(a.month));
}

export async function getPayrollRun(id: string): Promise<PayrollRunSummary> {
  const dto = await unwrap(financeHttpClient.get<ApiPayrollRunSummary>(`/api/payrollruns/${id}`));
  return mapPayrollRunSummary(dto);
}

/**
 * `listPayslips` joins each payslip row against real Staff data (FinanceService can't - `GetPayslips`
 * returns plain Payslip rows with no cross-service call, see docs/MICROSERVICES_PLAN.md), the same
 * bridging pattern `students/api.ts` already uses for `sectionId` -> class/section name resolution.
 * Rows for a staff id that no longer resolves are dropped, matching the mock's own behavior.
 */
export async function listPayslips(runId?: string): Promise<PayslipRow[]> {
  const [payslips, staff] = await Promise.all([
    unwrap(financeHttpClient.get<ApiPayslip[]>("/api/payslips", { params: runId ? { runId } : undefined })),
    listStaff(),
  ]);
  const staffById = new Map(staff.map((s) => [s.id, s] as const));
  return payslips
    .map(mapPayslip)
    .map((p) => {
      const staffMember = staffById.get(p.staffId);
      return staffMember ? { ...p, staff: staffMember } : null;
    })
    .filter((row): row is PayslipRow => row !== null)
    .sort((a, b) => b.month.localeCompare(a.month) || a.staff.firstName.localeCompare(b.staff.firstName));
}

/**
 * `GeneratePayrollRunCommand` needs a caller-supplied `EligibleStaff` snapshot (StaffId, Basic,
 * Allowances, Deductions) instead of FinanceService calling AcademicService itself - deliberate scope
 * decision, see docs/MICROSERVICES_PLAN.md's Payroll section. Built here from real Staff data, same
 * eligibility rule (active or on-leave) the mock used.
 */
export async function generatePayrollRun(month: string): Promise<GeneratePayrollResult> {
  const staff = await listStaff();
  const eligibleStaff = staff
    .filter((s) => s.status === "active" || s.status === "on-leave")
    .map((s) => ({ staffId: s.id, basic: s.salary.basic, allowances: s.salary.allowances, deductions: s.salary.deductions }));

  const dto = await unwrap(
    financeHttpClient.post<ApiGeneratePayrollResult>("/api/payrollruns/generate", { month, eligibleStaff }),
  );
  return { run: mapPayrollRunSummary(dto.run), createdCount: dto.createdCount, skippedCount: dto.skippedCount };
}

export async function finalizePayrollRun(id: string): Promise<PayrollRunSummary> {
  const dto = await unwrap(financeHttpClient.post<ApiPayrollRunSummary>(`/api/payrollruns/${id}/finalize`));
  return mapPayrollRunSummary(dto);
}

export async function deletePayrollRun(id: string): Promise<void> {
  await unwrap(financeHttpClient.delete(`/api/payrollruns/${id}`));
}

/**
 * `MarkPayslipPaidCommand` deliberately does not write back to AcademicService's
 * `StaffMember.SalaryHistory` (left to the caller/BFF, see docs/MICROSERVICES_PLAN.md's Payroll
 * section) - this frontend is that caller, so it makes the follow-up `recordSalaryPayment` call
 * itself, preserving the mock's original behavior of a payslip payment also showing up in the Staff
 * module's salary history.
 *
 * These are two separate network calls across two services, unlike the mock's single synchronous
 * update - if `recordSalaryPayment` fails after mark-paid already succeeded, the payslip is
 * permanently `Paid` on FinanceService (`MarkPayslipPaidCommand` 409s on a repeat call) with no
 * salary-history entry yet. A 409 from the mark-paid call is therefore treated as "already marked
 * paid by an earlier attempt", not a hard failure, so calling this again after a salary-history
 * failure re-fetches the already-paid payslip and retries just the missing step instead of getting
 * stuck behind the 409. `RecordSalaryPaymentCommandHandler` on the AcademicService side now rejects
 * a second payment for the same staff+month with a 409 too (see docs/MICROSERVICES_PLAN.md), so a
 * retry that lands after the *first* attempt actually succeeded server-side is safe as well - it
 * just surfaces as a normal error here rather than silently double-paying.
 */
export async function markPayslipPaid(id: string): Promise<Payslip> {
  let updated: Payslip;
  try {
    const dto = await unwrap(financeHttpClient.post<ApiPayslip>(`/api/payslips/${id}/mark-paid`));
    updated = mapPayslip(dto);
  } catch (err) {
    if (getApiErrorStatus(err) !== 409) throw err;
    const payslips = await unwrap(financeHttpClient.get<ApiPayslip[]>("/api/payslips"));
    const dto = payslips.find((p) => p.id === id);
    if (!dto) throw err;
    updated = mapPayslip(dto);
  }

  try {
    await recordSalaryPayment(updated.staffId, updated.month);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    throw new Error(
      `Payslip marked as paid, but recording it in the staff member's salary history failed: ${reason}. Click "Mark Paid" again to retry.`,
    );
  }
  return updated;
}
