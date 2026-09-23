import { financeHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listClasses } from "@/features/academics/api";
import { listStudents } from "@/features/students/api";
import type {
  DiscountAppliesTo,
  DiscountType,
  FeeDiscount,
  FeeDiscountFormValues,
  FeeFrequency,
  FeeInvoice,
  FeeInvoiceStatus,
  FeeStructure,
  FeeStructureFormValues,
  FeeType,
  GenerateInvoicesParams,
  GenerateInvoicesResult,
  InstallmentStatus,
  InvoiceInstallment,
  PaymentMode,
  Receipt,
  RecordPaymentParams,
  Refund,
  RefundFormValues,
  RefundStatus,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// FinanceService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase/snake_case unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const FEE_TYPE_TO_API: Record<FeeType, string> = {
  tuition: "Tuition",
  bus: "Bus",
  hostel: "Hostel",
  library: "Library",
  exam: "Exam",
  miscellaneous: "Miscellaneous",
};
const FEE_TYPE_FROM_API: Record<string, FeeType> = {
  Tuition: "tuition",
  Bus: "bus",
  Hostel: "hostel",
  Library: "library",
  Exam: "exam",
  Miscellaneous: "miscellaneous",
};

const FREQUENCY_TO_API: Record<FeeFrequency, string> = {
  one_time: "OneTime",
  monthly: "Monthly",
  term_wise: "TermWise",
  annual: "Annual",
};
const FREQUENCY_FROM_API: Record<string, FeeFrequency> = {
  OneTime: "one_time",
  Monthly: "monthly",
  TermWise: "term_wise",
  Annual: "annual",
};

const DISCOUNT_TYPE_TO_API: Record<DiscountType, string> = { percentage: "Percentage", flat: "Flat" };
const DISCOUNT_TYPE_FROM_API: Record<string, DiscountType> = { Percentage: "percentage", Flat: "flat" };

const DISCOUNT_APPLIES_TO_TO_API: Record<DiscountAppliesTo, string> = { all: "All", specific: "Specific" };
const DISCOUNT_APPLIES_TO_FROM_API: Record<string, DiscountAppliesTo> = { All: "all", Specific: "specific" };

const INVOICE_STATUS_FROM_API: Record<string, FeeInvoiceStatus> = {
  Due: "due",
  Paid: "paid",
  Overdue: "overdue",
  Partial: "partial",
};

const INSTALLMENT_STATUS_FROM_API: Record<string, InstallmentStatus> = { Due: "due", Paid: "paid", Overdue: "overdue" };

const PAYMENT_MODE_TO_API: Record<PaymentMode, string> = { cash: "Cash", card: "Card", online: "Online", cheque: "Cheque" };
const PAYMENT_MODE_FROM_API: Record<string, PaymentMode> = { Cash: "cash", Card: "card", Online: "online", Cheque: "cheque" };

const REFUND_STATUS_FROM_API: Record<string, RefundStatus> = { Pending: "pending", Processed: "processed" };

// ── API response shapes (FinanceService DTOs) ───────────────────────────────

interface ApiFeeStructure {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  academicYearId: string;
  classId: string | null;
  feeType: string;
  amount: number;
  frequency: string;
  lateFineFlat: number | null;
  lateFinePerDay: number | null;
}

interface ApiFeeDiscount {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  type: string;
  value: number;
  appliesTo: string;
  studentIds: string[];
  description: string | null;
}

interface ApiInvoiceInstallment {
  id: string;
  dueDate: string;
  amount: number;
  status: string;
}

interface ApiFeeInvoice {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  feeStructureId: string;
  feeType: string;
  term: string;
  amount: number;
  discountId: string | null;
  discountAmount: number;
  fineAmount: number;
  netAmount: number;
  dueDate: string;
  status: string;
  installments: ApiInvoiceInstallment[];
  paidOn: string | null;
  paidAmount: number | null;
}

interface ApiReceipt {
  id: string;
  tenantId: string;
  branchId: string;
  feeInvoiceId: string;
  receiptNumber: string;
  amount: number;
  paidOn: string;
  paymentMode: string;
}

interface ApiRefund {
  id: string;
  tenantId: string;
  branchId: string;
  feeInvoiceId: string;
  amount: number;
  reason: string;
  refundedOn: string;
  status: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapFeeStructure(dto: ApiFeeStructure): FeeStructure {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    name: dto.name,
    academicYearId: dto.academicYearId,
    classId: dto.classId ?? undefined,
    feeType: FEE_TYPE_FROM_API[dto.feeType] ?? "tuition",
    amount: dto.amount,
    frequency: FREQUENCY_FROM_API[dto.frequency] ?? "term_wise",
    lateFineFlat: dto.lateFineFlat ?? undefined,
    lateFinePerDay: dto.lateFinePerDay ?? undefined,
  };
}

function mapFeeDiscount(dto: ApiFeeDiscount): FeeDiscount {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    name: dto.name,
    type: DISCOUNT_TYPE_FROM_API[dto.type] ?? "flat",
    value: dto.value,
    appliesTo: DISCOUNT_APPLIES_TO_FROM_API[dto.appliesTo] ?? "all",
    studentIds: dto.studentIds,
    description: dto.description ?? undefined,
  };
}

function mapInstallment(dto: ApiInvoiceInstallment): InvoiceInstallment {
  return { id: dto.id, dueDate: dto.dueDate, amount: dto.amount, status: INSTALLMENT_STATUS_FROM_API[dto.status] ?? "due" };
}

function mapFeeInvoice(dto: ApiFeeInvoice): FeeInvoice {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    studentId: dto.studentId,
    feeStructureId: dto.feeStructureId,
    feeType: FEE_TYPE_FROM_API[dto.feeType] ?? "tuition",
    term: dto.term,
    amount: dto.amount,
    discountId: dto.discountId ?? undefined,
    discountAmount: dto.discountAmount,
    fineAmount: dto.fineAmount,
    netAmount: dto.netAmount,
    dueDate: dto.dueDate,
    status: INVOICE_STATUS_FROM_API[dto.status] ?? "due",
    installments: dto.installments.length > 0 ? dto.installments.map(mapInstallment) : undefined,
    paidOn: dto.paidOn ?? undefined,
    paidAmount: dto.paidAmount ?? undefined,
  };
}

function mapReceipt(dto: ApiReceipt): Receipt {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    invoiceId: dto.feeInvoiceId,
    receiptNumber: dto.receiptNumber,
    amount: dto.amount,
    paidOn: dto.paidOn,
    paymentMode: PAYMENT_MODE_FROM_API[dto.paymentMode] ?? "cash",
  };
}

function mapRefund(dto: ApiRefund): Refund {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    invoiceId: dto.feeInvoiceId,
    amount: dto.amount,
    reason: dto.reason,
    refundedOn: dto.refundedOn,
    status: REFUND_STATUS_FROM_API[dto.status] ?? "pending",
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Fee structures ──────────────────────────────────────────────────────

export async function listFeeStructures(): Promise<FeeStructure[]> {
  const structures = await unwrap(financeHttpClient.get<ApiFeeStructure[]>("/api/feestructures"));
  return structures.map(mapFeeStructure);
}

export async function createFeeStructure(values: FeeStructureFormValues): Promise<FeeStructure> {
  const dto = await unwrap(
    financeHttpClient.post<ApiFeeStructure>("/api/feestructures", {
      name: values.name,
      academicYearId: values.academicYearId,
      classId: values.classId ?? null,
      feeType: FEE_TYPE_TO_API[values.feeType],
      amount: values.amount,
      frequency: FREQUENCY_TO_API[values.frequency],
      lateFineFlat: values.lateFineFlat ?? null,
      lateFinePerDay: values.lateFinePerDay ?? null,
    }),
  );
  return mapFeeStructure(dto);
}

export async function updateFeeStructure(id: string, values: FeeStructureFormValues): Promise<FeeStructure> {
  const dto = await unwrap(
    financeHttpClient.put<ApiFeeStructure>(`/api/feestructures/${id}`, {
      name: values.name,
      academicYearId: values.academicYearId,
      classId: values.classId ?? null,
      feeType: FEE_TYPE_TO_API[values.feeType],
      amount: values.amount,
      frequency: FREQUENCY_TO_API[values.frequency],
      lateFineFlat: values.lateFineFlat ?? null,
      lateFinePerDay: values.lateFinePerDay ?? null,
    }),
  );
  return mapFeeStructure(dto);
}

export async function deleteFeeStructure(id: string): Promise<void> {
  await unwrap(financeHttpClient.delete(`/api/feestructures/${id}`));
}

// ── Discounts & scholarships ─────────────────────────────────────────────

export async function listDiscounts(): Promise<FeeDiscount[]> {
  const discounts = await unwrap(financeHttpClient.get<ApiFeeDiscount[]>("/api/feediscounts"));
  return discounts.map(mapFeeDiscount);
}

export async function createDiscount(values: FeeDiscountFormValues): Promise<FeeDiscount> {
  const dto = await unwrap(
    financeHttpClient.post<ApiFeeDiscount>("/api/feediscounts", {
      name: values.name,
      type: DISCOUNT_TYPE_TO_API[values.type],
      value: values.value,
      appliesTo: DISCOUNT_APPLIES_TO_TO_API[values.appliesTo],
      studentIds: values.studentIds,
      description: values.description?.trim() || null,
    }),
  );
  return mapFeeDiscount(dto);
}

export async function updateDiscount(id: string, values: FeeDiscountFormValues): Promise<FeeDiscount> {
  const dto = await unwrap(
    financeHttpClient.put<ApiFeeDiscount>(`/api/feediscounts/${id}`, {
      name: values.name,
      type: DISCOUNT_TYPE_TO_API[values.type],
      value: values.value,
      appliesTo: DISCOUNT_APPLIES_TO_TO_API[values.appliesTo],
      studentIds: values.studentIds,
      description: values.description?.trim() || null,
    }),
  );
  return mapFeeDiscount(dto);
}

export async function deleteDiscount(id: string): Promise<void> {
  await unwrap(financeHttpClient.delete(`/api/feediscounts/${id}`));
}

/**
 * Not backed by FinanceService yet - `applyDiscountToInvoice` (manually re-applying/overriding a
 * discount on an already-generated invoice) was a deliberate scope decision left out of the backend
 * build (see docs/MICROSERVICES_PLAN.md's Fee Management section: "a small supplementary feature,
 * not part of the mock's core Invoices/Refunds flow, left as a future increment"). Kept as a real
 * exported function (not deleted) so `InvoicesTab`/`ApplyDiscountDialog` keep compiling and surface a
 * clear, honest error instead of a silent no-op or a client-only fake update that would revert on the
 * next refetch.
 */
export async function applyDiscountToInvoice(_invoiceId: string, _discountId: string): Promise<FeeInvoice> {
  throw new Error(
    "Applying a discount to an existing invoice isn't supported yet - FinanceService has no endpoint for it (see docs/MICROSERVICES_PLAN.md). Generate a new invoice after creating the discount instead.",
  );
}

// ── Invoices ─────────────────────────────────────────────────────────────

export async function listInvoices(): Promise<FeeInvoice[]> {
  const invoices = await unwrap(financeHttpClient.get<ApiFeeInvoice[]>("/api/feeinvoices"));
  return invoices.map(mapFeeInvoice);
}

export async function listInvoicesForStudent(studentId: string): Promise<FeeInvoice[]> {
  const invoices = await unwrap(financeHttpClient.get<ApiFeeInvoice[]>("/api/feeinvoices", { params: { studentId } }));
  return invoices.map(mapFeeInvoice);
}

/** No GET-by-id endpoint on FinanceService - resolved by listing and filtering, same as the small
 *  lookup-by-id precedent elsewhere in this codebase. */
export async function getInvoice(id: string): Promise<FeeInvoice> {
  const invoices = await listInvoices();
  const found = invoices.find((inv) => inv.id === id);
  if (!found) throw new Error("Invoice not found");
  return found;
}

/**
 * FinanceService's GenerateInvoicesForStructureCommand needs a caller-supplied EligibleStudentIds
 * list (deliberate scope decision - FinanceService has no cross-service HTTP client to AcademicService
 * yet, see docs/MICROSERVICES_PLAN.md). Resolved here the same way the mock's own
 * generateInvoicesForStructure used to: every active student, narrowed to the structure's class if it
 * has one.
 */
export async function generateInvoicesForStructure(params: GenerateInvoicesParams): Promise<GenerateInvoicesResult> {
  const [structures, students, classes] = await Promise.all([listFeeStructures(), listStudents(), listClasses()]);
  const structure = structures.find((s) => s.id === params.feeStructureId);
  if (!structure) throw new Error("Fee structure not found");

  let eligible = students.filter((s) => s.status === "active");
  if (structure.classId) {
    const schoolClass = classes.find((c) => c.id === structure.classId);
    eligible = schoolClass ? eligible.filter((s) => s.className === schoolClass.name) : [];
  }

  const dto = await unwrap(
    financeHttpClient.post<{ createdCount: number; skippedCount: number }>("/api/feeinvoices/generate", {
      feeStructureId: params.feeStructureId,
      term: params.term,
      dueDate: params.dueDate,
      eligibleStudentIds: eligible.map((s) => s.id),
    }),
  );
  return { createdCount: dto.createdCount, skippedCount: dto.skippedCount };
}

export async function generateInstallments(invoiceId: string, count: number): Promise<FeeInvoice> {
  const dto = await unwrap(financeHttpClient.post<ApiFeeInvoice>(`/api/feeinvoices/${invoiceId}/installments`, { count }));
  return mapFeeInvoice(dto);
}

export async function recordPayment(invoiceId: string, params: RecordPaymentParams): Promise<{ invoice: FeeInvoice; receipt: Receipt }> {
  const dto = await unwrap(
    financeHttpClient.post<{ invoice: ApiFeeInvoice; receipt: ApiReceipt }>(`/api/feeinvoices/${invoiceId}/payments`, {
      amount: params.amount,
      mode: PAYMENT_MODE_TO_API[params.mode],
    }),
  );
  return { invoice: mapFeeInvoice(dto.invoice), receipt: mapReceipt(dto.receipt) };
}

export async function payInvoiceOnline(invoiceId: string, mode: PaymentMode = "online"): Promise<{ invoice: FeeInvoice; receipt: Receipt }> {
  const invoice = await getInvoice(invoiceId);
  const remaining = invoice.netAmount - (invoice.paidAmount ?? 0);
  return recordPayment(invoiceId, { amount: remaining, mode });
}

// ── Receipts ─────────────────────────────────────────────────────────────

export async function listReceipts(): Promise<Receipt[]> {
  const receipts = await unwrap(financeHttpClient.get<ApiReceipt[]>("/api/receipts"));
  return receipts.map(mapReceipt);
}

/** No GET-by-id endpoint on FinanceService - resolved by listing and filtering. */
export async function getReceipt(id: string): Promise<Receipt> {
  const receipts = await listReceipts();
  const found = receipts.find((r) => r.id === id);
  if (!found) throw new Error("Receipt not found");
  return found;
}

// ── Refunds ──────────────────────────────────────────────────────────────

export async function listRefunds(): Promise<Refund[]> {
  const refunds = await unwrap(financeHttpClient.get<ApiRefund[]>("/api/refunds"));
  return refunds.map(mapRefund);
}

export async function requestRefund(values: RefundFormValues): Promise<Refund> {
  const dto = await unwrap(
    financeHttpClient.post<ApiRefund>("/api/refunds", {
      feeInvoiceId: values.invoiceId,
      amount: values.amount,
      reason: values.reason,
    }),
  );
  return mapRefund(dto);
}

export async function processRefund(id: string): Promise<Refund> {
  const dto = await unwrap(financeHttpClient.post<ApiRefund>(`/api/refunds/${id}/process`));
  return mapRefund(dto);
}
