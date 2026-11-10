import { campusHttpClient } from "@/lib/httpClient";
import type {
  Adjustment,
  AdjustmentInput,
  AdjustmentReason,
  AuditEntry,
  BulkIssueInput,
  Category,
  CategoryInput,
  CountStatus,
  Dashboard,
  GoodsReceipt,
  GoodsReceiptInput,
  InvoiceInput,
  InvoiceStatus,
  Issue,
  IssueInput,
  IssueStatus,
  Item,
  ItemInput,
  ItemKind,
  LedgerEntry,
  MovementType,
  Page,
  PaymentMethod,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderStatus,
  ReceiptStatus,
  RecipientType,
  ReportFilters,
  ReportInfo,
  ReportResult,
  Requisition,
  RequisitionInput,
  RequisitionStatus,
  ReturnInput,
  ReturnKind,
  ReturnStatus,
  Sale,
  SaleInput,
  SalePaymentStatus,
  Settings,
  StockCount,
  StockLevel,
  Store,
  StoreInput,
  StoreNotification,
  StoreReturn,
  Supplier,
  SupplierInput,
  SupplierInvoice,
  Transfer,
  TransferInput,
} from "./types";

const base = "/api/store";

type Params = object;

/** Query-string parameters without the empty ones, so the server never sees "?search=&status=". */
const clean = (params?: Params) => (params ? Object.fromEntries(Object.entries(params as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null && v !== "")) : undefined);

const get = async <T>(url: string, params?: Params) => (await campusHttpClient.get<T>(`${base}${url}`, { params: clean(params) })).data;
const post = async <T>(url: string, body?: unknown) => (await campusHttpClient.post<T>(`${base}${url}`, body ?? {})).data;
const put = async <T>(url: string, body?: unknown) => (await campusHttpClient.put<T>(`${base}${url}`, body ?? {})).data;
const del = async <T = void>(url: string) => (await campusHttpClient.delete<T>(`${base}${url}`)).data;

export interface Paging {
  pageNumber?: number;
  pageSize?: number;
}

// ── Dashboard, alerts, audit, settings ──────────────────────────────────────
export const getDashboard = (from?: string, to?: string, storeId?: string) => get<Dashboard>("/dashboard", { from, to, storeId });
export const listNotifications = (unreadOnly = false) => get<{ items: StoreNotification[]; unread: number }>("/notifications", { unreadOnly, take: 30 });
export const markNotificationsRead = (ids?: string[]) => post<void>("/notifications/read", { ids: ids ?? null });
export const listAudit = (p: Paging & { entityType?: string; search?: string; from?: string; to?: string }) => get<Page<AuditEntry>>("/audit", p);
export const getSettings = () => get<Settings>("/settings");
export const saveSettings = (s: Settings) => put<Settings>("/settings", s);

// ── Stores, categories, items, suppliers ────────────────────────────────────
export const listStores = (includeInactive = false) => get<Store[]>("/stores", { includeInactive });
export const createStore = (s: StoreInput) => post<Store>("/stores", s);
export const updateStore = (id: string, s: StoreInput) => put<Store>(`/stores/${id}`, s);
export const deleteStore = (id: string) => del<{ removed: boolean }>(`/stores/${id}`);

export const listCategories = (includeInactive = true) => get<Category[]>("/categories", { includeInactive });
export const createCategory = (c: CategoryInput) => post<Category>("/categories", c);
export const updateCategory = (id: string, c: CategoryInput) => put<Category>(`/categories/${id}`, c);
export const deleteCategory = (id: string) => del(`/categories/${id}`);

export interface ItemFilters extends Paging {
  search?: string;
  categoryId?: string;
  kind?: ItemKind;
  active?: boolean;
  lowOnly?: boolean;
  storeId?: string;
}
export const listItems = (f: ItemFilters) => get<Page<Item>>("/items", { ...f });
export const getItem = (id: string) => get<Item>(`/items/${id}`);
export const createItem = (i: ItemInput) => post<Item>("/items", i);
export const updateItem = (id: string, i: ItemInput) => put<Item>(`/items/${id}`, i);
export const deleteItem = (id: string) => del<{ removed: boolean }>(`/items/${id}`);

export const listSuppliers = (f: Paging & { search?: string; active?: boolean }) => get<Page<Supplier>>("/suppliers", f);
export const getSupplierOptions = async () => (await listSuppliers({ active: true, pageSize: 200 })).items;
export const createSupplier = (s: SupplierInput) => post<Supplier>("/suppliers", s);
export const updateSupplier = (id: string, s: SupplierInput) => put<Supplier>(`/suppliers/${id}`, s);
export const deleteSupplier = (id: string) => del<{ removed: boolean }>(`/suppliers/${id}`);

// ── Purchasing ──────────────────────────────────────────────────────────────
export const listRequisitions = (f: Paging & { search?: string; status?: RequisitionStatus; storeId?: string }) => get<Page<Requisition>>("/requisitions", f);
export const getRequisition = (id: string) => get<Requisition>(`/requisitions/${id}`);
export const createRequisition = (r: RequisitionInput) => post<Requisition>("/requisitions", r);
export const updateRequisition = (id: string, r: RequisitionInput) => put<Requisition>(`/requisitions/${id}`, r);
export const submitRequisition = (id: string) => post<Requisition>(`/requisitions/${id}/submit`);
export const decideRequisition = (id: string, approve: boolean, note?: string) => post<Requisition>(`/requisitions/${id}/decision`, { approve, note });
export const cancelRequisition = (id: string) => post<Requisition>(`/requisitions/${id}/cancel`);

export interface PurchaseOrderFilters extends Paging {
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  storeId?: string;
  from?: string;
  to?: string;
  openOnly?: boolean;
}
export const listPurchaseOrders = (f: PurchaseOrderFilters) => get<Page<PurchaseOrder>>("/purchase-orders", { ...f });
export const getPurchaseOrder = (id: string) => get<PurchaseOrder>(`/purchase-orders/${id}`);
export const createPurchaseOrder = (p: PurchaseOrderInput) => post<PurchaseOrder>("/purchase-orders", p);
export const updatePurchaseOrder = (id: string, p: PurchaseOrderInput) => put<PurchaseOrder>(`/purchase-orders/${id}`, p);
export const placePurchaseOrder = (id: string) => post<PurchaseOrder>(`/purchase-orders/${id}/place`);
export const cancelPurchaseOrder = (id: string, reason?: string) => post<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { reason });
export const closePurchaseOrder = (id: string) => post<PurchaseOrder>(`/purchase-orders/${id}/close`);

export const listReceipts = (f: Paging & { search?: string; status?: ReceiptStatus; supplierId?: string; purchaseOrderId?: string }) => get<Page<GoodsReceipt>>("/receipts", f);
export const createReceipt = (g: GoodsReceiptInput) => post<GoodsReceipt>("/receipts", g);
export const decideReceipt = (id: string, approve: boolean, note?: string) => post<GoodsReceipt>(`/receipts/${id}/decision`, { approve, note });

export const listInvoices = (f: Paging & { search?: string; status?: InvoiceStatus; supplierId?: string; overdueOnly?: boolean }) => get<Page<SupplierInvoice>>("/invoices", f);
export const createInvoice = (i: InvoiceInput) => post<SupplierInvoice>("/invoices", i);
export const payInvoice = (id: string, p: { amount: number; paidOn?: string; method: PaymentMethod; paymentReference?: string }) => post<SupplierInvoice>(`/invoices/${id}/payments`, p);
export const cancelInvoice = (id: string) => post<SupplierInvoice>(`/invoices/${id}/cancel`);

// ── Stock ───────────────────────────────────────────────────────────────────
export const listStockLevels = (f: Paging & { storeId?: string; categoryId?: string; search?: string; status?: string; includeZero?: boolean }) => get<Page<StockLevel>>("/stock/levels", f);
export const listLedger = (f: Paging & { storeId?: string; itemId?: string; type?: MovementType; from?: string; to?: string; reference?: string }) => get<Page<LedgerEntry>>("/stock/ledger", f);
export const listAdjustments = (f: Paging & { storeId?: string; reason?: AdjustmentReason }) => get<Page<Adjustment>>("/stock/adjustments", f);
export const createAdjustment = (a: AdjustmentInput) => post<Adjustment>("/stock/adjustments", a);
export const listTransfers = (f: Paging & { storeId?: string }) => get<Page<Transfer>>("/stock/transfers", f);
export const createTransfer = (t: TransferInput) => post<Transfer>("/stock/transfers", t);
export const listCounts = (f: Paging & { storeId?: string; status?: CountStatus }) => get<Page<StockCount>>("/stock/counts", f);
export const getCount = (id: string) => get<StockCount>(`/stock/counts/${id}`);
export const startCount = (c: { storeId: string; countDate?: string; remarks?: string; categoryId?: string }) => post<StockCount>("/stock/counts", c);
export const saveCount = (id: string, lines: { lineId: string; countedQuantity: number | null; note?: string | null }[]) => put<StockCount>(`/stock/counts/${id}`, { lines });
export const reconcileCount = (id: string, reason?: string) => post<StockCount>(`/stock/counts/${id}/reconcile`, { reason });
export const cancelCount = (id: string) => post<StockCount>(`/stock/counts/${id}/cancel`);

// ── Issues, sales and returns ───────────────────────────────────────────────
export interface IssueFilters extends Paging {
  search?: string;
  status?: IssueStatus;
  recipientType?: RecipientType;
  recipientId?: string;
  storeId?: string;
  from?: string;
  to?: string;
  overdueOnly?: boolean;
}
export const listIssues = (f: IssueFilters) => get<Page<Issue>>("/issues", { ...f });
export const createIssue = (i: IssueInput) => post<Issue>("/issues", i);
export const bulkIssue = (i: BulkIssueInput) => post<Issue[]>("/issues/bulk", i);
export const decideIssue = (id: string, approve: boolean, note?: string) => post<Issue>(`/issues/${id}/decision`, { approve, note });
export const fulfilIssue = (id: string) => post<Issue>(`/issues/${id}/fulfil`);
export const cancelIssue = (id: string) => post<Issue>(`/issues/${id}/cancel`);

export const listSales = (f: Paging & { search?: string; status?: SalePaymentStatus; studentId?: string; storeId?: string; from?: string; to?: string }) => get<Page<Sale>>("/sales", f);
export const createSale = (s: SaleInput) => post<Sale>("/sales", s);
export const paySale = (id: string, p: { amount: number; method: PaymentMethod; paymentReference?: string }) => post<Sale>(`/sales/${id}/payments`, p);

export const listReturns = (f: Paging & { search?: string; kind?: ReturnKind; status?: ReturnStatus; storeId?: string }) => get<Page<StoreReturn>>("/returns", f);
export const createReturn = (r: ReturnInput) => post<StoreReturn>("/returns", r);
export const decideReturn = (id: string, approve: boolean, note?: string) => post<StoreReturn>(`/returns/${id}/decision`, { approve, note });

// ── Reports ─────────────────────────────────────────────────────────────────
export const listReports = () => get<ReportInfo[]>("/reports");
export const runReport = (key: string, f: ReportFilters & Paging) => get<ReportResult>(`/reports/${key}`, { ...f });
