import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  InventoryItem,
  InventoryItemFormValues,
  InventoryValuation,
  ItemCategory,
  ItemCategoryFormValues,
  ItemUnit,
  LowStockItem,
  StockAdjustmentFormValues,
  StockInFormValues,
  StockOutFormValues,
  StockTransaction,
  StockTransactionRow,
  StockTransactionType,
  Vendor,
  VendorFormValues,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const UNIT_TO_API: Record<ItemUnit, string> = {
  piece: "Piece",
  box: "Box",
  packet: "Packet",
  kg: "Kg",
  litre: "Litre",
  ream: "Ream",
  set: "Set",
};
const UNIT_FROM_API: Record<string, ItemUnit> = {
  Piece: "piece",
  Box: "box",
  Packet: "packet",
  Kg: "kg",
  Litre: "litre",
  Ream: "ream",
  Set: "set",
};

const TRANSACTION_TYPE_FROM_API: Record<string, StockTransactionType> = {
  Purchase: "purchase",
  Issue: "issue",
  Adjustment: "adjustment",
};

// ── API response shapes (CampusService DTOs) ────────────────────────────────

interface ApiItemCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
}

interface ApiVendor {
  id: string;
  tenantId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface ApiInventoryItem {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  name: string;
  categoryId: string;
  unit: string;
  unitCost: number;
  reorderLevel: number;
  quantityInStock: number;
  location: string | null;
}

interface ApiLowStockItem extends ApiInventoryItem {
  shortBy: number;
}

interface ApiStockTransaction {
  id: string;
  tenantId: string;
  branchId: string;
  itemId: string;
  type: string;
  quantityDelta: number;
  date: string;
  vendorId: string | null;
  unitCost: number | null;
  issuedTo: string | null;
  reason: string | null;
  reference: string | null;
  createdAt: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapCategory(dto: ApiItemCategory): ItemCategory {
  return { id: dto.id, tenantId: dto.tenantId, name: dto.name, description: dto.description ?? undefined };
}

function mapVendor(dto: ApiVendor): Vendor {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    name: dto.name,
    contactPerson: dto.contactPerson ?? undefined,
    phone: dto.phone ?? undefined,
    email: dto.email ?? undefined,
    address: dto.address ?? undefined,
  };
}

function mapItem(dto: ApiInventoryItem): InventoryItem {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    code: dto.code,
    name: dto.name,
    categoryId: dto.categoryId,
    unit: UNIT_FROM_API[dto.unit] ?? "piece",
    unitCost: dto.unitCost,
    reorderLevel: dto.reorderLevel,
    quantityInStock: dto.quantityInStock,
    location: dto.location ?? undefined,
  };
}

function mapTransaction(dto: ApiStockTransaction): StockTransaction {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    itemId: dto.itemId,
    type: TRANSACTION_TYPE_FROM_API[dto.type] ?? "adjustment",
    quantityDelta: dto.quantityDelta,
    date: dto.date,
    vendorId: dto.vendorId ?? undefined,
    unitCost: dto.unitCost ?? undefined,
    issuedTo: dto.issuedTo ?? undefined,
    reason: dto.reason ?? undefined,
    reference: dto.reference ?? undefined,
    createdAt: dto.createdAt,
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function blankToNull(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

// ── Categories ───────────────────────────────────────────────────────────

export async function listCategories(): Promise<ItemCategory[]> {
  const categories = await unwrap(campusHttpClient.get<ApiItemCategory[]>("/api/itemcategories"));
  return categories.map(mapCategory);
}

export async function createCategory(values: ItemCategoryFormValues): Promise<ItemCategory> {
  const dto = await unwrap(
    campusHttpClient.post<ApiItemCategory>("/api/itemcategories", { name: values.name, description: blankToNull(values.description) }),
  );
  return mapCategory(dto);
}

export async function updateCategory(id: string, values: ItemCategoryFormValues): Promise<ItemCategory> {
  const dto = await unwrap(
    campusHttpClient.put<ApiItemCategory>(`/api/itemcategories/${id}`, { name: values.name, description: blankToNull(values.description) }),
  );
  return mapCategory(dto);
}

export async function deleteCategory(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/itemcategories/${id}`));
}

// ── Vendors ──────────────────────────────────────────────────────────────

function vendorPayload(values: VendorFormValues) {
  return {
    name: values.name,
    contactPerson: blankToNull(values.contactPerson),
    phone: blankToNull(values.phone),
    email: blankToNull(values.email),
    address: blankToNull(values.address),
  };
}

export async function listVendors(): Promise<Vendor[]> {
  const vendors = await unwrap(campusHttpClient.get<ApiVendor[]>("/api/vendors"));
  return vendors.map(mapVendor);
}

export async function createVendor(values: VendorFormValues): Promise<Vendor> {
  const dto = await unwrap(campusHttpClient.post<ApiVendor>("/api/vendors", vendorPayload(values)));
  return mapVendor(dto);
}

export async function updateVendor(id: string, values: VendorFormValues): Promise<Vendor> {
  const dto = await unwrap(campusHttpClient.put<ApiVendor>(`/api/vendors/${id}`, vendorPayload(values)));
  return mapVendor(dto);
}

export async function deleteVendor(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/vendors/${id}`));
}

// ── Items ────────────────────────────────────────────────────────────────

function itemPayload(values: InventoryItemFormValues) {
  return {
    code: values.code,
    name: values.name,
    categoryId: values.categoryId,
    unit: UNIT_TO_API[values.unit],
    unitCost: values.unitCost,
    reorderLevel: values.reorderLevel,
    location: blankToNull(values.location),
  };
}

export async function listItems(): Promise<InventoryItem[]> {
  const items = await unwrap(campusHttpClient.get<ApiInventoryItem[]>("/api/inventoryitems"));
  return items.map(mapItem);
}

export async function createItem(values: InventoryItemFormValues): Promise<InventoryItem> {
  const dto = await unwrap(campusHttpClient.post<ApiInventoryItem>("/api/inventoryitems", itemPayload(values)));
  return mapItem(dto);
}

export async function updateItem(id: string, values: InventoryItemFormValues): Promise<InventoryItem> {
  const dto = await unwrap(campusHttpClient.put<ApiInventoryItem>(`/api/inventoryitems/${id}`, itemPayload(values)));
  return mapItem(dto);
}

export async function deleteItem(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/inventoryitems/${id}`));
}

// ── Stock transactions ──────────────────────────────────────────────────

/** Plain StockTransactionDto rows joined with items/vendors here; rows whose item no longer resolves are dropped, matching the mock. */
export async function listTransactions(itemId?: string): Promise<StockTransactionRow[]> {
  const [transactions, items, vendors] = await Promise.all([
    unwrap(campusHttpClient.get<ApiStockTransaction[]>("/api/stocktransactions", { params: itemId ? { itemId } : undefined })),
    listItems(),
    listVendors(),
  ]);
  const itemById = new Map(items.map((i) => [i.id, i] as const));
  const vendorById = new Map(vendors.map((v) => [v.id, v] as const));
  return transactions
    .map(mapTransaction)
    .map((t): StockTransactionRow | null => {
      const item = itemById.get(t.itemId);
      if (!item) return null;
      return { ...t, item, vendor: t.vendorId ? vendorById.get(t.vendorId) : undefined };
    })
    .filter((row): row is StockTransactionRow => row !== null);
}

export async function recordPurchase(values: StockInFormValues): Promise<StockTransaction> {
  const dto = await unwrap(
    campusHttpClient.post<ApiStockTransaction>("/api/stocktransactions/purchase", {
      itemId: values.itemId,
      quantity: values.quantity,
      unitCost: values.unitCost,
      vendorId: values.vendorId || null,
      date: values.date,
      reference: blankToNull(values.reference),
    }),
  );
  return mapTransaction(dto);
}

export async function recordIssue(values: StockOutFormValues): Promise<StockTransaction> {
  const dto = await unwrap(
    campusHttpClient.post<ApiStockTransaction>("/api/stocktransactions/issue", {
      itemId: values.itemId,
      quantity: values.quantity,
      issuedTo: values.issuedTo,
      reason: blankToNull(values.reason),
      date: values.date,
    }),
  );
  return mapTransaction(dto);
}

export async function recordAdjustment(values: StockAdjustmentFormValues): Promise<StockTransaction> {
  const dto = await unwrap(
    campusHttpClient.post<ApiStockTransaction>("/api/stocktransactions/adjustment", {
      itemId: values.itemId,
      newQuantity: values.newQuantity,
      reason: values.reason,
      date: values.date,
    }),
  );
  return mapTransaction(dto);
}

// ── Reports ──────────────────────────────────────────────────────────────

export async function getLowStockItems(): Promise<LowStockItem[]> {
  const rows = await unwrap(campusHttpClient.get<ApiLowStockItem[]>("/api/inventoryreports/low-stock"));
  return rows.map((r) => ({ ...mapItem(r), shortBy: r.shortBy }));
}

export async function getInventoryValuation(): Promise<InventoryValuation> {
  return unwrap(campusHttpClient.get<InventoryValuation>("/api/inventoryreports/valuation"));
}
