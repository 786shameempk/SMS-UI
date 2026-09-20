import { mockDelay } from "@/utils/mockDelay";
import { DEFAULT_TENANT_ID, getCurrentTenantId, migrateLegacyRecordsToDefaultTenant, scopedToCurrentTenant } from "@/utils/tenant";
import { listStaff, recordSalaryPayment } from "@/features/staff/api";
import { buildSeedPayrollData } from "./mock";
import type { GeneratePayrollResult, PayrollRun, PayrollRunSummary, Payslip, PayslipRow } from "./types";

const RUNS_KEY = "sms-mock-payroll-runs";
const PAYSLIPS_KEY = "sms-mock-payroll-payslips";
const SEEDED_KEY = "sms-mock-payroll-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let runs = migrateLegacyRecordsToDefaultTenant(loadJson<PayrollRun[]>(RUNS_KEY, []));
let payslips = migrateLegacyRecordsToDefaultTenant(loadJson<Payslip[]>(PAYSLIPS_KEY, []));

const persistRuns = () => saveJson(RUNS_KEY, runs);
const persistPayslips = () => saveJson(PAYSLIPS_KEY, payslips);

function requireEntity<T extends { id: string; tenantId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (runs.length === 0 && payslips.length === 0) {
    const staff = await listStaff();
    const seeded = buildSeedPayrollData(staff);
    runs = seeded.runs.map((r) => ({ ...r, tenantId: DEFAULT_TENANT_ID }));
    payslips = seeded.payslips.map((p) => ({ ...p, tenantId: DEFAULT_TENANT_ID }));
    persistRuns();
    persistPayslips();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed payroll mock data", err);
});

function summarize(run: PayrollRun): PayrollRunSummary {
  const rows = payslips.filter((p) => p.tenantId === run.tenantId && p.runId === run.id);
  return {
    ...run,
    staffCount: rows.length,
    totalNetPay: rows.reduce((sum, p) => sum + p.netPay, 0),
    paidCount: rows.filter((p) => p.paid).length,
  };
}

export async function listPayrollRuns(): Promise<PayrollRunSummary[]> {
  await seedPromise;
  return mockDelay(
    scopedToCurrentTenant(runs).map(summarize).sort((a, b) => b.month.localeCompare(a.month)),
    350,
  );
}

export async function getPayrollRun(id: string): Promise<PayrollRunSummary> {
  await seedPromise;
  return mockDelay(summarize(requireEntity(runs, id, "Payroll run")), 300);
}

export async function listPayslips(runId?: string): Promise<PayslipRow[]> {
  await seedPromise;
  const staff = await listStaff();
  const staffById = new Map(staff.map((s) => [s.id, s] as const));
  const scopedPayslips = scopedToCurrentTenant(payslips);
  const filtered = runId ? scopedPayslips.filter((p) => p.runId === runId) : scopedPayslips;
  const rows = filtered
    .map((p) => {
      const staffMember = staffById.get(p.staffId);
      return staffMember ? { ...p, staff: staffMember } : null;
    })
    .filter((row): row is PayslipRow => row !== null)
    .sort((a, b) => b.month.localeCompare(a.month) || a.staff.firstName.localeCompare(b.staff.firstName));
  return mockDelay(rows, 400);
}

export async function generatePayrollRun(month: string): Promise<GeneratePayrollResult> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  if (runs.some((r) => r.tenantId === tenantId && r.month === month)) {
    await mockDelay(null, 300);
    throw new Error(`Payroll for ${month} has already been generated`);
  }

  const staff = await listStaff();
  const eligible = staff.filter((s) => s.status === "active" || s.status === "on-leave");

  const run: PayrollRun = { id: genId("run"), tenantId, month, status: "draft", generatedAt: new Date().toISOString() };
  let createdCount = 0;
  let skippedCount = 0;
  const created: Payslip[] = [];

  for (const s of eligible) {
    if (s.salaryHistory.some((p) => p.month === month)) {
      skippedCount++;
      continue;
    }
    created.push({
      id: genId("psl"),
      tenantId,
      runId: run.id,
      staffId: s.id,
      month,
      basic: s.salary.basic,
      allowances: s.salary.allowances,
      deductions: s.salary.deductions,
      netPay: s.salary.basic + s.salary.allowances - s.salary.deductions,
      paid: false,
    });
    createdCount++;
  }

  runs = [run, ...runs];
  payslips = [...created, ...payslips];
  persistRuns();
  persistPayslips();

  return mockDelay({ run, createdCount, skippedCount }, 700);
}

export async function finalizePayrollRun(id: string): Promise<PayrollRun> {
  await seedPromise;
  const run = requireEntity(runs, id, "Payroll run");
  if (run.status === "finalized") {
    await mockDelay(null, 300);
    throw new Error("This run is already finalized");
  }
  const updated: PayrollRun = { ...run, status: "finalized", finalizedAt: new Date().toISOString() };
  runs = runs.map((r) => (r.id === id ? updated : r));
  persistRuns();
  return mockDelay(updated, 400);
}

export async function deletePayrollRun(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const run = requireEntity(runs, id, "Payroll run");
  if (run.status === "finalized") {
    await mockDelay(null, 300);
    throw new Error("Finalized runs can't be deleted");
  }
  runs = runs.filter((r) => !(r.id === id && r.tenantId === tenantId));
  payslips = payslips.filter((p) => !(p.tenantId === tenantId && p.runId === id));
  persistRuns();
  persistPayslips();
  return mockDelay(undefined, 350);
}

export async function markPayslipPaid(id: string): Promise<Payslip> {
  await seedPromise;
  const slip = requireEntity(payslips, id, "Payslip");
  if (slip.paid) {
    await mockDelay(null, 300);
    throw new Error("This payslip is already marked paid");
  }
  const updated: Payslip = { ...slip, paid: true, paidOn: new Date().toISOString() };
  payslips = payslips.map((p) => (p.id === id ? updated : p));
  persistPayslips();
  await recordSalaryPayment(slip.staffId, slip.month);
  return mockDelay(updated, 450);
}
