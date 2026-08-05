export const FEE_TYPES = ["tuition", "bus", "hostel", "library", "exam", "miscellaneous"] as const;
export type FeeType = (typeof FEE_TYPES)[number];

export type FeeFrequency = "one_time" | "monthly" | "term_wise" | "annual";

export interface FeeStructure {
  id: string;
  name: string;
  academicYearId: string;
  classId?: string;
  feeType: FeeType;
  amount: number;
  frequency: FeeFrequency;
  /** Flat late fine applied once an invoice generated from this structure goes overdue. */
  lateFineFlat?: number;
  /** Additional per-day-late fine, compounding with lateFineFlat while an invoice remains overdue. */
  lateFinePerDay?: number;
}

export interface FeeStructureFormValues {
  name: string;
  academicYearId: string;
  classId?: string;
  feeType: FeeType;
  amount: number;
  frequency: FeeFrequency;
  lateFineFlat?: number;
  lateFinePerDay?: number;
}

export type DiscountType = "percentage" | "flat";
export type DiscountAppliesTo = "all" | "specific";

export interface FeeDiscount {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  appliesTo: DiscountAppliesTo;
  /** Only meaningful when appliesTo === "specific". */
  studentIds: string[];
  description?: string;
}

export interface FeeDiscountFormValues {
  name: string;
  type: DiscountType;
  value: number;
  appliesTo: DiscountAppliesTo;
  studentIds: string[];
  description?: string;
}

export type InstallmentStatus = "paid" | "due" | "overdue";

export interface InvoiceInstallment {
  id: string;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
}

export type FeeInvoiceStatus = "paid" | "due" | "overdue" | "partial";

export interface FeeInvoice {
  id: string;
  studentId: string;
  feeStructureId: string;
  feeType: FeeType;
  term: string;
  amount: number;
  discountId?: string;
  discountAmount: number;
  fineAmount: number;
  netAmount: number;
  dueDate: string;
  status: FeeInvoiceStatus;
  installments?: InvoiceInstallment[];
  paidOn?: string;
  paidAmount?: number;
}

export interface GenerateInvoicesParams {
  feeStructureId: string;
  academicYearId: string;
  term: string;
  dueDate: string;
}

export interface GenerateInvoicesResult {
  createdCount: number;
  skippedCount: number;
}

export type PaymentMode = "cash" | "card" | "online" | "cheque";

export interface RecordPaymentParams {
  amount: number;
  mode: PaymentMode;
}

export interface Receipt {
  id: string;
  invoiceId: string;
  receiptNumber: string;
  amount: number;
  paidOn: string;
  paymentMode: PaymentMode;
}

export type RefundStatus = "pending" | "processed";

export interface Refund {
  id: string;
  invoiceId: string;
  amount: number;
  reason: string;
  refundedOn: string;
  status: RefundStatus;
}

export interface RefundFormValues {
  invoiceId: string;
  amount: number;
  reason: string;
}
