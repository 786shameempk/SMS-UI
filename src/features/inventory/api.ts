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
import { buildSeedInventory, SEED_CATEGORIES, SEED_VENDORS } from "./mock";
import type {
  InventoryItem,
  InventoryItemFormValues,
  InventoryValuation,
  ItemCategory,
  ItemCategoryFormValues,
  LowStockItem,
  StockAdjustmentFormValues,
  StockInFormValues,
  StockOutFormValues,
  StockTransaction,
  StockTransactionRow,
  Vendor,
  VendorFormValues,
} from "./types";

const CATEGORIES_KEY = "sms-mock-inventory-categories";
const VENDORS_KEY = "sms-mock-inventory-vendors";
const ITEMS_KEY = "sms-mock-inventory-items";
const TRANSACTIONS_KEY = "sms-mock-inventory-transactions";
const SEEDED_KEY = "sms-mock-inventory-seeded";

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

let categories = migrateLegacyRecordsToDefaultTenant(loadJson<ItemCategory[]>(CATEGORIES_KEY, []));
let vendors = migrateLegacyRecordsToDefaultTenant(loadJson<Vendor[]>(VENDORS_KEY, []));
let items = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<InventoryItem[]>(ITEMS_KEY, [])));
let transactions = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<StockTransaction[]>(TRANSACTIONS_KEY, [])));

const persistCategories = () => saveJson(CATEGORIES_KEY, categories);
const persistVendors = () => saveJson(VENDORS_KEY, vendors);
const persistItems = () => saveJson(ITEMS_KEY, items);
const persistTransactions = () => saveJson(TRANSACTIONS_KEY, transactions);

function requireEntity<T extends { id: string; tenantId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

function requireBranchEntity<T extends { id: string; tenantId: string; branchId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId() && item.branchId === getCurrentBranchId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

function performSeed(): void {
  if (loadJson(SEEDED_KEY, false)) return;
  const defaultBranchId = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

  if (categories.length === 0) {
    categories = SEED_CATEGORIES.map((c) => ({ ...c, tenantId: DEFAULT_TENANT_ID }));
    persistCategories();
  }
  if (vendors.length === 0) {
    vendors = SEED_VENDORS.map((v) => ({ ...v, tenantId: DEFAULT_TENANT_ID }));
    persistVendors();
  }
  if (items.length === 0 && transactions.length === 0) {
    const seeded = buildSeedInventory();
    items = seeded.items.map((i) => ({ ...i, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    transactions = seeded.transactions.map((t) => ({ ...t, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    persistItems();
    persistTransactions();
  }

  saveJson(SEEDED_KEY, true);
}

performSeed();

// ── Categories ───────────────────────────────────────────────────────────

export async function listCategories(): Promise<ItemCategory[]> {
  return mockDelay(scopedToCurrentTenant(categories), 300);
}

export async function createCategory(values: ItemCategoryFormValues): Promise<ItemCategory> {
  const category: ItemCategory = { id: genId("cat"), tenantId: getCurrentTenantId(), ...values };
  categories = [...categories, category];
  persistCategories();
  return mockDelay(category, 350);
}

export async function updateCategory(id: string, values: ItemCategoryFormValues): Promise<ItemCategory> {
  requireEntity(categories, id, "Category");
  categories = categories.map((c) => (c.id === id ? { ...c, ...values } : c));
  persistCategories();
  return mockDelay(requireEntity(categories, id, "Category"), 350);
}

export async function deleteCategory(id: string): Promise<void> {
  const tenantId = getCurrentTenantId();
  requireEntity(categories, id, "Category");
  if (items.some((i) => i.tenantId === tenantId && i.categoryId === id)) {
    await mockDelay(null, 300);
    throw new Error("This category has items assigned to it and can't be deleted");
  }
  categories = categories.filter((c) => !(c.id === id && c.tenantId === tenantId));
  persistCategories();
  return mockDelay(undefined, 350);
}

// ── Vendors ──────────────────────────────────────────────────────────────

export async function listVendors(): Promise<Vendor[]> {
  return mockDelay(scopedToCurrentTenant(vendors), 300);
}

export async function createVendor(values: VendorFormValues): Promise<Vendor> {
  const vendor: Vendor = { id: genId("ven"), tenantId: getCurrentTenantId(), ...values };
  vendors = [...vendors, vendor];
  persistVendors();
  return mockDelay(vendor, 350);
}

export async function updateVendor(id: string, values: VendorFormValues): Promise<Vendor> {
  requireEntity(vendors, id, "Vendor");
  vendors = vendors.map((v) => (v.id === id ? { ...v, ...values } : v));
  persistVendors();
  return mockDelay(requireEntity(vendors, id, "Vendor"), 350);
}

export async function deleteVendor(id: string): Promise<void> {
  const tenantId = getCurrentTenantId();
  requireEntity(vendors, id, "Vendor");
  if (transactions.some((t) => t.tenantId === tenantId && t.vendorId === id)) {
    await mockDelay(null, 300);
    throw new Error("This vendor has purchase history and can't be deleted");
  }
  vendors = vendors.filter((v) => !(v.id === id && v.tenantId === tenantId));
  persistVendors();
  return mockDelay(undefined, 350);
}

// ── Items ────────────────────────────────────────────────────────────────

export async function listItems(): Promise<InventoryItem[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(items).sort((a, b) => a.code.localeCompare(b.code)), 350);
}

export async function createItem(values: InventoryItemFormValues): Promise<InventoryItem> {
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  if (
    items.some(
      (i) => i.tenantId === tenantId && i.branchId === branchId && i.code.trim().toLowerCase() === values.code.trim().toLowerCase(),
    )
  ) {
    await mockDelay(null, 300);
    throw new Error("An item with this code already exists");
  }
  const item: InventoryItem = { id: genId("item"), tenantId, branchId, ...values, quantityInStock: 0 };
  items = [...items, item];
  persistItems();
  return mockDelay(item, 400);
}

export async function updateItem(id: string, values: InventoryItemFormValues): Promise<InventoryItem> {
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireBranchEntity(items, id, "Item");
  if (
    items.some(
      (i) =>
        i.tenantId === tenantId &&
        i.branchId === branchId &&
        i.id !== id &&
        i.code.trim().toLowerCase() === values.code.trim().toLowerCase(),
    )
  ) {
    await mockDelay(null, 300);
    throw new Error("An item with this code already exists");
  }
  items = items.map((i) => (i.id === id ? { ...i, ...values } : i));
  persistItems();
  return mockDelay(requireBranchEntity(items, id, "Item"), 400);
}

export async function deleteItem(id: string): Promise<void> {
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const item = requireBranchEntity(items, id, "Item");
  if (item.quantityInStock > 0) {
    await mockDelay(null, 300);
    throw new Error("This item still has stock on hand — issue or adjust it to zero before deleting");
  }
  items = items.filter((i) => !(i.id === id && i.tenantId === tenantId && i.branchId === branchId));
  persistItems();
  return mockDelay(undefined, 350);
}

// ── Stock transactions ──────────────────────────────────────────────────

export async function listTransactions(itemId?: string): Promise<StockTransactionRow[]> {
  const vendorById = new Map(vendors.map((v) => [v.id, v] as const));
  const itemById = new Map(items.map((i) => [i.id, i] as const));
  const scopedTransactions = scopedToCurrentTenantAndBranch(transactions);
  const filtered = itemId ? scopedTransactions.filter((t) => t.itemId === itemId) : scopedTransactions;
  const rows = filtered
    .map((t): StockTransactionRow | null => {
      const item = itemById.get(t.itemId);
      if (!item) return null;
      const vendor = t.vendorId ? vendorById.get(t.vendorId) : undefined;
      return { ...t, item, vendor };
    })
    .filter((row): row is StockTransactionRow => row !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return mockDelay(rows, 400);
}

export async function recordPurchase(values: StockInFormValues): Promise<StockTransaction> {
  const item = requireBranchEntity(items, values.itemId, "Item");
  if (values.quantity <= 0) {
    await mockDelay(null, 300);
    throw new Error("Quantity must be greater than zero");
  }
  const transaction: StockTransaction = {
    id: genId("txn"),
    tenantId: item.tenantId,
    branchId: item.branchId,
    itemId: values.itemId,
    type: "purchase",
    quantityDelta: values.quantity,
    date: values.date,
    vendorId: values.vendorId,
    unitCost: values.unitCost,
    reference: values.reference?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  items = items.map((i) => (i.id === item.id ? { ...i, quantityInStock: i.quantityInStock + values.quantity, unitCost: values.unitCost } : i));
  transactions = [transaction, ...transactions];
  persistItems();
  persistTransactions();
  return mockDelay(transaction, 500);
}

export async function recordIssue(values: StockOutFormValues): Promise<StockTransaction> {
  const item = requireBranchEntity(items, values.itemId, "Item");
  if (values.quantity <= 0) {
    await mockDelay(null, 300);
    throw new Error("Quantity must be greater than zero");
  }
  if (values.quantity > item.quantityInStock) {
    await mockDelay(null, 300);
    throw new Error(`Only ${item.quantityInStock} ${item.unit}(s) of ${item.name} in stock`);
  }
  const transaction: StockTransaction = {
    id: genId("txn"),
    tenantId: item.tenantId,
    branchId: item.branchId,
    itemId: values.itemId,
    type: "issue",
    quantityDelta: -values.quantity,
    date: values.date,
    issuedTo: values.issuedTo.trim(),
    reason: values.reason?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  items = items.map((i) => (i.id === item.id ? { ...i, quantityInStock: i.quantityInStock - values.quantity } : i));
  transactions = [transaction, ...transactions];
  persistItems();
  persistTransactions();
  return mockDelay(transaction, 500);
}

export async function recordAdjustment(values: StockAdjustmentFormValues): Promise<StockTransaction> {
  const item = requireBranchEntity(items, values.itemId, "Item");
  if (values.newQuantity < 0) {
    await mockDelay(null, 300);
    throw new Error("Quantity can't be negative");
  }
  const delta = values.newQuantity - item.quantityInStock;
  if (delta === 0) {
    await mockDelay(null, 300);
    throw new Error("New quantity matches current stock — nothing to adjust");
  }
  const transaction: StockTransaction = {
    id: genId("txn"),
    tenantId: item.tenantId,
    branchId: item.branchId,
    itemId: values.itemId,
    type: "adjustment",
    quantityDelta: delta,
    date: values.date,
    reason: values.reason.trim(),
    createdAt: new Date().toISOString(),
  };
  items = items.map((i) => (i.id === item.id ? { ...i, quantityInStock: values.newQuantity } : i));
  transactions = [transaction, ...transactions];
  persistItems();
  persistTransactions();
  return mockDelay(transaction, 500);
}

// ── Reports ──────────────────────────────────────────────────────────────

export async function getLowStockItems(): Promise<LowStockItem[]> {
  const rows = scopedToCurrentTenantAndBranch(items)
    .filter((i) => i.quantityInStock <= i.reorderLevel)
    .map((i) => ({ ...i, shortBy: Math.max(0, i.reorderLevel - i.quantityInStock) }))
    .sort((a, b) => b.shortBy - a.shortBy);
  return mockDelay(rows, 350);
}

export async function getInventoryValuation(): Promise<InventoryValuation> {
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const byCategory = new Map<string, { itemCount: number; totalQuantity: number; totalValue: number }>();
  const scopedItems = scopedToCurrentTenantAndBranch(items);

  for (const item of scopedItems) {
    const bucket = byCategory.get(item.categoryId) ?? { itemCount: 0, totalQuantity: 0, totalValue: 0 };
    bucket.itemCount += 1;
    bucket.totalQuantity += item.quantityInStock;
    bucket.totalValue += item.quantityInStock * item.unitCost;
    byCategory.set(item.categoryId, bucket);
  }

  const rows = Array.from(byCategory.entries())
    .map(([categoryId, bucket]) => ({ categoryId, categoryName: categoryById.get(categoryId)?.name ?? "Uncategorized", ...bucket }))
    .sort((a, b) => b.totalValue - a.totalValue);

  return mockDelay(
    { rows, totalValue: rows.reduce((sum, r) => sum + r.totalValue, 0), totalItems: scopedItems.length },
    400,
  );
}
