import { mockDelay } from "@/utils/mockDelay";
import {
  DEFAULT_TENANT_ID,
  defaultBranchIdForTenant,
  getCurrentBranchId,
  getCurrentTenantId,
  migrateLegacyRecordsToDefaultBranch,
  migrateLegacyRecordsToDefaultTenant,
  scopedToCurrentTenant,
  scopedToCurrentTenantAndBranch,
} from "@/utils/tenant";
import { listClasses } from "@/features/academics/api";
import { listStudents } from "@/features/students/api";
import { buildSeedFeeData, SEED_DISCOUNTS, SEED_FEE_STRUCTURES } from "./mock";
import type {
  FeeDiscount,
  FeeDiscountFormValues,
  FeeInvoice,
  FeeStructure,
  FeeStructureFormValues,
  GenerateInvoicesParams,
  GenerateInvoicesResult,
  PaymentMode,
  Receipt,
  RecordPaymentParams,
  Refund,
  RefundFormValues,
} from "./types";

const STRUCTURES_KEY = "sms-mock-fee-structures";
const DISCOUNTS_KEY = "sms-mock-fee-discounts";
const INVOICES_KEY = "sms-mock-fee-invoices";
const RECEIPTS_KEY = "sms-mock-fee-receipts";
const REFUNDS_KEY = "sms-mock-fee-refunds";
const SEEDED_KEY = "sms-mock-fees-seeded";

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

let structures = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<FeeStructure[]>(STRUCTURES_KEY, [])));
let discounts = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<FeeDiscount[]>(DISCOUNTS_KEY, [])));
let invoices = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<FeeInvoice[]>(INVOICES_KEY, [])));
let receipts = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<Receipt[]>(RECEIPTS_KEY, [])));
let refunds = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<Refund[]>(REFUNDS_KEY, [])));

const persistStructures = () => saveJson(STRUCTURES_KEY, structures);
const persistDiscounts = () => saveJson(DISCOUNTS_KEY, discounts);
const persistInvoices = () => saveJson(INVOICES_KEY, invoices);
const persistReceipts = () => saveJson(RECEIPTS_KEY, receipts);
const persistRefunds = () => saveJson(REFUNDS_KEY, refunds);

function requireEntity<T extends { id: string; tenantId: string; branchId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId() && item.branchId === getCurrentBranchId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;
  const defaultBranchId = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

  if (structures.length === 0) {
    structures = SEED_FEE_STRUCTURES.map((s) => ({ ...s, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    persistStructures();
  }
  if (discounts.length === 0) {
    discounts = SEED_DISCOUNTS.map((d) => ({ ...d, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId, studentIds: [...d.studentIds] }));
    persistDiscounts();
  }
  if (invoices.length === 0) {
    const students = await listStudents();
    const { invoices: seededInvoices, receipts: seededReceipts, refunds: seededRefunds } = buildSeedFeeData(
      students,
      structures,
      discounts,
    );
    invoices = seededInvoices.map((inv) => ({ ...inv, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    receipts = seededReceipts.map((r) => ({ ...r, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    refunds = seededRefunds.map((r) => ({ ...r, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    persistInvoices();
    persistReceipts();
    persistRefunds();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed fees mock data", err);
});

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function deriveInvoice(invoice: FeeInvoice): FeeInvoice {
  if (invoice.status !== "due") return invoice;
  const dueDate = new Date(invoice.dueDate);
  const daysLate = daysBetween(dueDate, new Date());
  if (daysLate <= 0) return invoice;

  const structure = structures.find((s) => s.id === invoice.feeStructureId && s.tenantId === invoice.tenantId && s.branchId === invoice.branchId);
  const fineAmount = structure ? (structure.lateFineFlat ?? 0) + (structure.lateFinePerDay ?? 0) * daysLate : invoice.fineAmount;
  const netAmount = invoice.amount - invoice.discountAmount + fineAmount;
  return { ...invoice, status: "overdue", fineAmount, netAmount };
}

function deriveAndPersistAll(): FeeInvoice[] {
  let changed = false;
  const next = invoices.map((inv) => {
    const derived = deriveInvoice(inv);
    if (derived !== inv) changed = true;
    return derived;
  });
  if (changed) {
    invoices = next;
    persistInvoices();
  }
  return invoices;
}

function applicableDiscount(studentId: string): FeeDiscount | undefined {
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  return (
    discounts.find((d) => d.tenantId === tenantId && d.branchId === branchId && d.appliesTo === "specific" && d.studentIds.includes(studentId)) ??
    discounts.find((d) => d.tenantId === tenantId && d.branchId === branchId && d.appliesTo === "all")
  );
}

function computeDiscountAmount(amount: number, discount?: FeeDiscount): number {
  if (!discount) return 0;
  const raw = discount.type === "percentage" ? (amount * discount.value) / 100 : discount.value;
  return Math.min(amount, Math.round(raw));
}

// ── Fee structures ──────────────────────────────────────────────────────

export async function listFeeStructures(): Promise<FeeStructure[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(structures), 350);
}

export async function createFeeStructure(values: FeeStructureFormValues): Promise<FeeStructure> {
  await seedPromise;
  const structure: FeeStructure = { id: genId("fs"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  structures = [structure, ...structures];
  persistStructures();
  return mockDelay(structure, 400);
}

export async function updateFeeStructure(id: string, values: FeeStructureFormValues): Promise<FeeStructure> {
  await seedPromise;
  requireEntity(structures, id, "Fee structure");
  structures = structures.map((s) => (s.id === id ? { ...s, ...values } : s));
  persistStructures();
  return mockDelay(requireEntity(structures, id, "Fee structure"), 400);
}

export async function deleteFeeStructure(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(structures, id, "Fee structure");
  structures = structures.filter((s) => !(s.id === id && s.tenantId === tenantId && s.branchId === branchId));
  persistStructures();
  return mockDelay(undefined, 350);
}

// ── Discounts & scholarships ─────────────────────────────────────────────

export async function listDiscounts(): Promise<FeeDiscount[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(discounts), 300);
}

export async function createDiscount(values: FeeDiscountFormValues): Promise<FeeDiscount> {
  await seedPromise;
  const discount: FeeDiscount = { id: genId("disc"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  discounts = [discount, ...discounts];
  persistDiscounts();
  return mockDelay(discount, 400);
}

export async function updateDiscount(id: string, values: FeeDiscountFormValues): Promise<FeeDiscount> {
  await seedPromise;
  requireEntity(discounts, id, "Discount");
  discounts = discounts.map((d) => (d.id === id ? { ...d, ...values } : d));
  persistDiscounts();
  return mockDelay(requireEntity(discounts, id, "Discount"), 400);
}

export async function deleteDiscount(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(discounts, id, "Discount");
  discounts = discounts.filter((d) => !(d.id === id && d.tenantId === tenantId && d.branchId === branchId));
  persistDiscounts();
  return mockDelay(undefined, 350);
}

export async function applyDiscountToInvoice(invoiceId: string, discountId: string): Promise<FeeInvoice> {
  await seedPromise;
  const invoice = requireEntity(invoices, invoiceId, "Invoice");
  const discount = requireEntity(discounts, discountId, "Discount");
  const discountAmount = computeDiscountAmount(invoice.amount, discount);
  const updated: FeeInvoice = {
    ...invoice,
    discountId: discount.id,
    discountAmount,
    netAmount: invoice.amount - discountAmount + invoice.fineAmount,
  };
  invoices = invoices.map((inv) => (inv.id === invoiceId ? updated : inv));
  persistInvoices();
  return mockDelay(updated, 400);
}

// ── Invoices ─────────────────────────────────────────────────────────────

export async function listInvoices(): Promise<FeeInvoice[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(deriveAndPersistAll()), 350);
}

export async function listInvoicesForStudent(studentId: string): Promise<FeeInvoice[]> {
  await seedPromise;
  const all = scopedToCurrentTenantAndBranch(deriveAndPersistAll());
  return mockDelay(all.filter((inv) => inv.studentId === studentId), 350);
}

export async function getInvoice(id: string): Promise<FeeInvoice> {
  await seedPromise;
  const all = scopedToCurrentTenantAndBranch(deriveAndPersistAll());
  return mockDelay(requireEntity(all, id, "Invoice"), 300);
}

export async function generateInvoicesForStructure(params: GenerateInvoicesParams): Promise<GenerateInvoicesResult> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const structure = requireEntity(structures, params.feeStructureId, "Fee structure");
  const [students, classes] = await Promise.all([listStudents(), listClasses()]);

  let eligible = students.filter((s) => s.status === "active");
  if (structure.classId) {
    const schoolClass = classes.find((c) => c.id === structure.classId);
    eligible = schoolClass ? eligible.filter((s) => s.className === schoolClass.name) : [];
  }

  let createdCount = 0;
  let skippedCount = 0;
  const created: FeeInvoice[] = [];

  for (const student of eligible) {
    const exists = invoices.some(
      (inv) =>
        inv.tenantId === tenantId &&
        inv.branchId === branchId &&
        inv.studentId === student.id &&
        inv.feeStructureId === structure.id &&
        inv.term === params.term,
    );
    if (exists) {
      skippedCount++;
      continue;
    }
    const discount = applicableDiscount(student.id);
    const discountAmount = computeDiscountAmount(structure.amount, discount);
    const invoice: FeeInvoice = {
      id: genId("inv"),
      tenantId,
      branchId,
      studentId: student.id,
      feeStructureId: structure.id,
      feeType: structure.feeType,
      term: params.term,
      amount: structure.amount,
      discountId: discount?.id,
      discountAmount,
      fineAmount: 0,
      netAmount: structure.amount - discountAmount,
      dueDate: params.dueDate,
      status: "due",
    };
    created.push(invoice);
    createdCount++;
  }

  if (created.length) {
    invoices = [...created, ...invoices];
    persistInvoices();
  }

  return mockDelay({ createdCount, skippedCount }, 600);
}

export async function generateInstallments(invoiceId: string, count: number): Promise<FeeInvoice> {
  await seedPromise;
  const invoice = requireEntity(invoices, invoiceId, "Invoice");
  if (count < 2) {
    await mockDelay(null, 300);
    throw new Error("Installments require at least 2 parts");
  }
  const base = Math.floor(invoice.netAmount / count);
  const remainder = invoice.netAmount - base * count;
  const startDate = new Date(invoice.dueDate);
  const installments = Array.from({ length: count }).map((_, i) => {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    return {
      id: genId("inst"),
      dueDate: dueDate.toISOString(),
      amount: i === count - 1 ? base + remainder : base,
      status: "due" as const,
    };
  });
  const updated: FeeInvoice = { ...invoice, installments };
  invoices = invoices.map((inv) => (inv.id === invoiceId ? updated : inv));
  persistInvoices();
  return mockDelay(updated, 400);
}

export async function recordPayment(invoiceId: string, params: RecordPaymentParams): Promise<{ invoice: FeeInvoice; receipt: Receipt }> {
  await seedPromise;
  const invoice = requireEntity(invoices, invoiceId, "Invoice");
  if (params.amount <= 0) {
    await mockDelay(null, 300);
    throw new Error("Payment amount must be greater than zero");
  }

  const paidSoFar = invoice.paidAmount ?? 0;
  const newPaidAmount = Math.min(invoice.netAmount, paidSoFar + params.amount);
  const status = newPaidAmount >= invoice.netAmount ? "paid" : "partial";
  const now = new Date().toISOString();

  const updated: FeeInvoice = {
    ...invoice,
    status,
    paidAmount: newPaidAmount,
    paidOn: now,
    installments:
      status === "paid" && invoice.installments
        ? invoice.installments.map((inst) => ({ ...inst, status: "paid" as const }))
        : invoice.installments,
  };
  invoices = invoices.map((inv) => (inv.id === invoiceId ? updated : inv));
  persistInvoices();

  const receipt: Receipt = {
    id: genId("rcpt"),
    tenantId: invoice.tenantId,
    branchId: invoice.branchId,
    invoiceId,
    receiptNumber: `RCPT-${new Date().getFullYear()}-${String(scopedToCurrentTenant(receipts).length + 1).padStart(4, "0")}`,
    amount: params.amount,
    paidOn: now,
    paymentMode: params.mode,
  };
  receipts = [receipt, ...receipts];
  persistReceipts();

  return mockDelay({ invoice: updated, receipt }, 700);
}

export async function payInvoiceOnline(invoiceId: string, mode: PaymentMode = "online"): Promise<{ invoice: FeeInvoice; receipt: Receipt }> {
  const invoice = requireEntity(invoices, invoiceId, "Invoice");
  const remaining = invoice.netAmount - (invoice.paidAmount ?? 0);
  return recordPayment(invoiceId, { amount: remaining, mode });
}

// ── Receipts ─────────────────────────────────────────────────────────────

export async function listReceipts(): Promise<Receipt[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(receipts), 300);
}

export async function getReceipt(id: string): Promise<Receipt> {
  await seedPromise;
  return mockDelay(requireEntity(receipts, id, "Receipt"), 250);
}

// ── Refunds ──────────────────────────────────────────────────────────────

export async function listRefunds(): Promise<Refund[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(refunds), 300);
}

export async function requestRefund(values: RefundFormValues): Promise<Refund> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(invoices, values.invoiceId, "Invoice");
  const refund: Refund = { id: genId("refund"), tenantId, branchId, ...values, refundedOn: new Date().toISOString(), status: "pending" };
  refunds = [refund, ...refunds];
  persistRefunds();
  return mockDelay(refund, 400);
}

export async function processRefund(id: string): Promise<Refund> {
  await seedPromise;
  const refund = requireEntity(refunds, id, "Refund");
  const updated: Refund = { ...refund, status: "processed", refundedOn: new Date().toISOString() };
  refunds = refunds.map((r) => (r.id === id ? updated : r));
  persistRefunds();

  const invoice = invoices.find((inv) => inv.id === refund.invoiceId && inv.tenantId === refund.tenantId && inv.branchId === refund.branchId);
  if (invoice) {
    const newPaidAmount = Math.max(0, (invoice.paidAmount ?? 0) - refund.amount);
    const status = newPaidAmount <= 0 ? "due" : newPaidAmount >= invoice.netAmount ? "paid" : "partial";
    const revisedInvoice: FeeInvoice = { ...invoice, paidAmount: newPaidAmount, status };
    invoices = invoices.map((inv) => (inv.id === invoice.id ? revisedInvoice : inv));
    persistInvoices();
  }

  return mockDelay(updated, 500);
}
