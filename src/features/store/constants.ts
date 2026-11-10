import type {
  AdjustmentReason, BuyerType, CountStatus, InvoiceStatus, IssueStatus, ItemKind, MovementType, PaymentMethod, PurchaseOrderStatus, ReceiptStatus, RecipientType, RequisitionStatus,
  ReturnCondition, ReturnKind, ReturnStatus, SalePaymentStatus,
} from "./types";

export const ITEM_KIND_LABEL: Record<ItemKind, string> = { Consumable: "Consumable", NonConsumable: "Non-consumable (returnable asset)" };

export const UNITS = ["Nos", "Box", "Packet", "Pair", "Set", "Ream", "Kg", "Gram", "Litre", "Metre", "Roll", "Bottle", "Dozen"];

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  Opening: "Opening stock",
  GoodsReceipt: "Goods received",
  Issue: "Issued",
  IssueReturn: "Returned from issue",
  Sale: "Sold",
  SaleReturn: "Sale return",
  SupplierReturn: "Returned to supplier",
  TransferOut: "Transferred out",
  TransferIn: "Transferred in",
  Adjustment: "Adjustment",
  Damaged: "Damaged",
  Expired: "Expired",
  Lost: "Lost or missing",
  CountAdjustment: "Stock count difference",
};

export const REQUISITION_STATUS_LABEL: Record<RequisitionStatus, string> = {
  Draft: "Draft", Submitted: "Awaiting approval", Approved: "Approved", Rejected: "Rejected", Cancelled: "Cancelled", Ordered: "Ordered",
};

export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  Draft: "Draft", Ordered: "Ordered", PartiallyReceived: "Partly received", Received: "Received", Cancelled: "Cancelled",
};

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = { Pending: "Awaiting approval", Approved: "Approved", Rejected: "Rejected" };

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = { Unpaid: "Unpaid", Partial: "Part paid", Paid: "Paid", Cancelled: "Cancelled" };

export const RECIPIENT_LABEL: Record<RecipientType, string> = {
  Student: "Student", Teacher: "Teacher", Staff: "Non-teaching staff", Department: "Department", Class: "Class", Laboratory: "Laboratory", Facility: "Other facility", Other: "Other",
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  Requested: "Awaiting approval", Approved: "Approved, not yet issued", Rejected: "Rejected", Issued: "Issued", PartiallyReturned: "Partly returned", Returned: "Returned", Cancelled: "Cancelled",
};

export const SALE_STATUS_LABEL: Record<SalePaymentStatus, string> = { Unpaid: "Unpaid", Partial: "Part paid", Paid: "Paid" };

export const BUYER_LABEL: Record<BuyerType, string> = { Student: "Student", Parent: "Parent (for a student)", Staff: "Staff member", WalkIn: "Walk-in" };

export const PAYMENT_LABEL: Record<PaymentMethod, string> = { Cash: "Cash", Online: "Online / UPI", Card: "Card", Cheque: "Cheque", BankTransfer: "Bank transfer", Other: "Other" };

export const RETURN_KIND_LABEL: Record<ReturnKind, string> = { Issue: "Issued item returned", Sale: "Sale return", Supplier: "Return to supplier" };

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = { Requested: "Awaiting decision", Approved: "Approved", Rejected: "Rejected" };

export const CONDITION_LABEL: Record<ReturnCondition, string> = { Good: "Good - back on the shelf", Damaged: "Damaged - written off", Expired: "Expired - written off", Lost: "Lost - written off" };

export const ADJUSTMENT_LABEL: Record<AdjustmentReason, string> = {
  Opening: "Opening stock", Inward: "Stock inward", Outward: "Stock outward", Correction: "Correction", Damaged: "Damaged stock", Expired: "Expired stock", Lost: "Lost or missing stock",
};

/** Whether the reason adds stock (+), removes it (-), or the person chooses (null). */
export const ADJUSTMENT_SIGN: Record<AdjustmentReason, 1 | -1 | null> = { Opening: 1, Inward: 1, Outward: -1, Correction: null, Damaged: -1, Expired: -1, Lost: -1 };

export const COUNT_STATUS_LABEL: Record<CountStatus, string> = { Open: "Counting", Reconciled: "Reconciled", Cancelled: "Cancelled" };

export const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

export const NOTIFICATION_LABEL: Record<string, string> = {
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
  "requisition-submitted": "Requisition",
  "requisition-decided": "Requisition",
  "requisition-approved": "Requisition",
  "po-status": "Purchase order",
  "grn-pending": "Goods receipt",
  "grn-complete": "Goods receipt",
  "issue-request": "Item request",
  "issue-decided": "Item request",
  "issue-approved": "Item request",
  "return-request": "Return",
  "payment-due": "Supplier payment",
};
