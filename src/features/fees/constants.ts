import type { DiscountType, FeeFrequency, FeeInvoiceStatus, FeeType, PaymentMode, RefundStatus } from "./types";

export const FEE_TYPE_OPTIONS: Array<{ value: FeeType; label: string }> = [
  { value: "tuition", label: "Tuition" },
  { value: "bus", label: "Bus" },
  { value: "hostel", label: "Hostel" },
  { value: "library", label: "Library" },
  { value: "exam", label: "Exam" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

export const FREQUENCY_OPTIONS: Array<{ value: FeeFrequency; label: string }> = [
  { value: "one_time", label: "One time" },
  { value: "monthly", label: "Monthly" },
  { value: "term_wise", label: "Term-wise" },
  { value: "annual", label: "Annual" },
];

export const DISCOUNT_TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "percentage", label: "Percentage" },
  { value: "flat", label: "Flat amount" },
];

export const PAYMENT_MODE_OPTIONS: Array<{ value: PaymentMode; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
  { value: "cheque", label: "Cheque" },
];

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const INVOICE_STATUS_CONFIG: Record<FeeInvoiceStatus, { label: string; variant: BadgeVariant }> = {
  paid: { label: "Paid", variant: "success" },
  due: { label: "Due", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
  partial: { label: "Partial", variant: "info" },
};

export const REFUND_STATUS_CONFIG: Record<RefundStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pending", variant: "warning" },
  processed: { label: "Processed", variant: "success" },
};
