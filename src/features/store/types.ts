// School Store Management: shapes returned by CampusService (/api/store). Enums arrive as their names; dates as "yyyy-MM-dd" or ISO timestamps.

export interface Page<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export type ItemKind = "Consumable" | "NonConsumable";
export type StaffRole = "Manager" | "Keeper";
export type MovementType =
  | "Opening" | "GoodsReceipt" | "Issue" | "IssueReturn" | "Sale" | "SaleReturn" | "SupplierReturn" | "TransferOut" | "TransferIn" | "Adjustment" | "Damaged" | "Expired" | "Lost" | "CountAdjustment";
export type RequisitionStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Cancelled" | "Ordered";
export type PurchaseOrderStatus = "Draft" | "Ordered" | "PartiallyReceived" | "Received" | "Cancelled";
export type ReceiptStatus = "Pending" | "Approved" | "Rejected";
export type InvoiceStatus = "Unpaid" | "Partial" | "Paid" | "Cancelled";
export type RecipientType = "Student" | "Teacher" | "Staff" | "Department" | "Class" | "Laboratory" | "Facility" | "Other";
export type IssueStatus = "Requested" | "Approved" | "Rejected" | "Issued" | "PartiallyReturned" | "Returned" | "Cancelled";
export type SalePaymentStatus = "Unpaid" | "Partial" | "Paid";
export type BuyerType = "Student" | "Parent" | "Staff" | "WalkIn";
export type PaymentMethod = "Cash" | "Online" | "Card" | "Cheque" | "BankTransfer" | "Other";
export type ReturnKind = "Issue" | "Sale" | "Supplier";
export type ReturnStatus = "Requested" | "Approved" | "Rejected";
export type ReturnCondition = "Good" | "Damaged" | "Expired" | "Lost";
export type AdjustmentReason = "Opening" | "Inward" | "Outward" | "Correction" | "Damaged" | "Expired" | "Lost";
export type CountStatus = "Open" | "Reconciled" | "Cancelled";

export interface StoreStaff {
  userId: string;
  name: string;
  role: StaffRole;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  staff: StoreStaff[];
  itemCount: number;
  totalQuantity: number;
  stockValue: number;
}

export interface StoreInput {
  name: string;
  code: string;
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  staff: StoreStaff[];
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
  description?: string | null;
  isActive: boolean;
  itemCount: number;
}

export interface CategoryInput {
  name: string;
  parentId?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface ItemSupplier {
  supplierId: string;
  supplierName: string;
  price?: number | null;
  isPreferred: boolean;
}

export interface ItemStock {
  storeId: string;
  storeName: string;
  quantity: number;
  averageCost: number;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId: string;
  categoryName?: string | null;
  subCategoryId?: string | null;
  subCategoryName?: string | null;
  description?: string | null;
  unit: string;
  brand?: string | null;
  model?: string | null;
  kind: ItemKind;
  minStock: number;
  reorderQuantity: number;
  maxStock: number;
  purchasePrice: number;
  sellingPrice?: number | null;
  taxPercent: number;
  imageUrl?: string | null;
  isActive: boolean;
  totalStock: number;
  storeStock?: number | null;
  suppliers: ItemSupplier[];
  stock?: ItemStock[] | null;
}

export interface ItemInput {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  categoryId: string;
  subCategoryId?: string | null;
  description?: string | null;
  unit: string;
  brand?: string | null;
  model?: string | null;
  kind: ItemKind;
  minStock: number;
  reorderQuantity: number;
  maxStock: number;
  purchasePrice: number;
  sellingPrice?: number | null;
  taxPercent: number;
  imageUrl?: string | null;
  isActive: boolean;
  suppliers: { supplierId: string; price?: number | null; isPreferred: boolean }[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  paymentTerms?: string | null;
  paymentDueDays: number;
  bankDetails?: string | null;
  isActive: boolean;
  totalPurchased: number;
  outstanding: number;
}

export type SupplierInput = Omit<Supplier, "id" | "totalPurchased" | "outstanding">;

export interface Settings {
  requireIssueApproval: boolean;
  requireReceiptApproval: boolean;
  notifyLowStock: boolean;
}

export interface RequisitionLine {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  note?: string | null;
}

export interface Requisition {
  id: string;
  reference: string;
  storeId: string;
  storeName: string;
  requestedOn: string;
  neededBy?: string | null;
  department?: string | null;
  reason?: string | null;
  priority: string;
  status: RequisitionStatus;
  requestedBy?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  estimatedTotal: number;
  purchaseOrderReference?: string | null;
  lines: RequisitionLine[];
}

export interface RequisitionInput {
  storeId: string;
  neededBy?: string | null;
  department?: string | null;
  reason?: string | null;
  priority: string;
  lines: { itemId: string; quantity: number; estimatedPrice: number; note?: string | null }[];
  submit: boolean;
}

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  storeId: string;
  storeName: string;
  requisitionId?: string | null;
  requisitionReference?: string | null;
  orderDate: string;
  expectedDate?: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes?: string | null;
  paymentTerms?: string | null;
  receiptCount: number;
  invoicedAmount: number;
  lines: PurchaseOrderLine[];
}

export interface PurchaseOrderInput {
  supplierId: string;
  storeId: string;
  requisitionId?: string | null;
  orderDate?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  lines: { itemId: string; quantity: number; unitPrice: number; discountPercent: number; taxPercent: number }[];
  place: boolean;
}

export interface GoodsReceiptLine {
  id: string;
  purchaseOrderLineId: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

export interface GoodsReceipt {
  id: string;
  reference: string;
  purchaseOrderId: string;
  purchaseOrderReference: string;
  storeId: string;
  storeName: string;
  supplierId: string;
  supplierName: string;
  receivedOn: string;
  supplierInvoiceNumber?: string | null;
  notes?: string | null;
  status: ReceiptStatus;
  receivedBy?: string | null;
  decidedBy?: string | null;
  value: number;
  lines: GoodsReceiptLine[];
}

export interface GoodsReceiptInput {
  purchaseOrderId: string;
  receivedOn?: string | null;
  supplierInvoiceNumber?: string | null;
  notes?: string | null;
  lines: { purchaseOrderLineId: string; quantity: number }[];
}

export interface SupplierPayment {
  id: string;
  amount: number;
  paidOn: string;
  method: PaymentMethod;
  paymentReference?: string | null;
  recordedBy?: string | null;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId?: string | null;
  purchaseOrderReference?: string | null;
  goodsReceiptId?: string | null;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  overdue: boolean;
  notes?: string | null;
  payments: SupplierPayment[];
}

export interface InvoiceInput {
  invoiceNumber: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  amount: number;
  notes?: string | null;
}

export interface StockLevel {
  storeId: string;
  storeName: string;
  itemId: string;
  itemName: string;
  sku: string;
  category?: string | null;
  unit: string;
  quantity: number;
  averageCost: number;
  value: number;
  minStock: number;
  reorderQuantity: number;
  status: string;
}

export interface LedgerEntry {
  id: string;
  at: string;
  reference: string;
  storeId: string;
  storeName: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  type: MovementType;
  quantityChange: number;
  balanceAfter: number;
  unitCost: number;
  reason?: string | null;
  by?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
}

export interface AdjustmentInput {
  storeId: string;
  reason: AdjustmentReason;
  remarks: string;
  adjustedOn?: string | null;
  lines: { itemId: string; quantityChange: number; unitCost?: number | null }[];
}

export interface Adjustment {
  id: string;
  reference: string;
  storeId: string;
  storeName: string;
  reason: AdjustmentReason;
  remarks: string;
  adjustedOn: string;
  adjustedBy?: string | null;
  createdAt: string;
  lines: { itemId: string; itemName: string; sku: string; unit: string; quantityChange: number; unitCost?: number | null }[];
}

export interface TransferInput {
  fromStoreId: string;
  toStoreId: string;
  transferredOn?: string | null;
  notes?: string | null;
  lines: { itemId: string; quantity: number }[];
}

export interface Transfer {
  id: string;
  reference: string;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  transferredOn: string;
  notes?: string | null;
  transferredBy?: string | null;
  value: number;
  lines: { itemId: string; itemName: string; sku: string; unit: string; quantity: number; unitCost: number }[];
}

export interface CountLine {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  systemQuantity: number;
  countedQuantity?: number | null;
  variance?: number | null;
  note?: string | null;
}

export interface StockCount {
  id: string;
  reference: string;
  storeId: string;
  storeName: string;
  countDate: string;
  status: CountStatus;
  remarks?: string | null;
  countedBy?: string | null;
  reconciledAt?: string | null;
  reconciledBy?: string | null;
  lineCount: number;
  varianceCount: number;
  lines: CountLine[];
}

export interface IssueLine {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  returnedQuantity: number;
  writtenOffQuantity: number;
  outstanding: number;
  unitCost: number;
}

export interface Issue {
  id: string;
  reference: string;
  storeId: string;
  storeName: string;
  recipientType: RecipientType;
  recipientId?: string | null;
  recipientName: string;
  recipientDetail?: string | null;
  purpose?: string | null;
  issueDate: string;
  expectedReturnDate?: string | null;
  isReturnable: boolean;
  status: IssueStatus;
  requestedBy?: string | null;
  decidedBy?: string | null;
  decisionNote?: string | null;
  issuedBy?: string | null;
  issuedAt?: string | null;
  overdue: boolean;
  lines: IssueLine[];
}

export interface IssueInput {
  storeId: string;
  recipientType: RecipientType;
  recipientId?: string | null;
  recipientName: string;
  recipientDetail?: string | null;
  purpose?: string | null;
  issueDate?: string | null;
  expectedReturnDate?: string | null;
  isReturnable: boolean;
  lines: { itemId: string; quantity: number }[];
  requestOnly: boolean;
}

export interface BulkIssueInput {
  storeId: string;
  recipientType: RecipientType;
  recipients: { recipientId?: string | null; recipientName: string; recipientDetail?: string | null }[];
  purpose?: string | null;
  issueDate?: string | null;
  expectedReturnDate?: string | null;
  isReturnable: boolean;
  lines: { itemId: string; quantity: number }[];
}

export interface SaleLine {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
}

export interface SalePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  paymentReference?: string | null;
  paidAt: string;
  receivedBy?: string | null;
}

export interface Sale {
  id: string;
  reference: string;
  storeId: string;
  storeName: string;
  buyerType: BuyerType;
  studentId?: string | null;
  buyerName: string;
  buyerDetail?: string | null;
  soldAt: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: SalePaymentStatus;
  notes?: string | null;
  soldBy?: string | null;
  lines: SaleLine[];
  payments: SalePayment[];
}

export interface SaleInput {
  storeId: string;
  buyerType: BuyerType;
  studentId?: string | null;
  buyerName: string;
  buyerDetail?: string | null;
  notes?: string | null;
  lines: { itemId: string; quantity: number; unitPrice?: number | null; discountPercent: number }[];
  payments: { amount: number; method: PaymentMethod; paymentReference?: string | null }[];
}

export interface ReturnLine {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  sourceLineId?: string | null;
  quantity: number;
  condition: ReturnCondition;
}

export interface StoreReturn {
  id: string;
  reference: string;
  kind: ReturnKind;
  storeId: string;
  storeName: string;
  issueId?: string | null;
  issueReference?: string | null;
  saleId?: string | null;
  saleReference?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  partyName?: string | null;
  reason?: string | null;
  status: ReturnStatus;
  requestedBy?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  createdAt: string;
  lines: ReturnLine[];
}

export interface ReturnInput {
  kind: ReturnKind;
  issueId?: string | null;
  saleId?: string | null;
  supplierId?: string | null;
  storeId?: string | null;
  goodsReceiptId?: string | null;
  reason?: string | null;
  lines: { sourceLineId?: string | null; itemId?: string | null; quantity: number; condition: ReturnCondition }[];
  approveNow: boolean;
}

export interface MonthlyPoint {
  month: string;
  purchases: number;
  consumption: number;
  sales: number;
}

export interface Dashboard {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingRequisitions: number;
  pendingPurchaseOrders: number;
  pendingReceipts: number;
  pendingIssues: number;
  pendingReturns: number;
  overdueIssues: number;
  supplierDue: number;
  overdueInvoices: number;
  stores: number;
  from: string;
  to: string;
  monthly: MonthlyPoint[];
  byCategory: { category: string; quantity: number; value: number }[];
  lowStock: { itemId: string; itemName: string; sku: string; unit: string; quantity: number; minStock: number; reorderQuantity: number }[];
  recentMovements: LedgerEntry[];
  recentIssues: { id: string; reference: string; recipientName: string; recipientType: RecipientType; status: IssueStatus; issueDate: string }[];
  recentSales: { id: string; reference: string; buyerName: string; total: number; paymentStatus: SalePaymentStatus; soldAt: string }[];
}

export interface StoreNotification {
  id: string;
  kind: string;
  title: string;
  message: string;
  link?: string | null;
  at: string;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  reference?: string | null;
  action: string;
  summary?: string | null;
  at: string;
  by?: string | null;
}

export interface ReportInfo {
  key: string;
  title: string;
  description: string;
  group: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: "text" | "number" | "money" | "date";
}

export interface ReportResult {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: unknown[][];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totals: Record<string, number>;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  storeId?: string;
  categoryId?: string;
  itemId?: string;
  supplierId?: string;
  kind?: string;
  search?: string;
}
