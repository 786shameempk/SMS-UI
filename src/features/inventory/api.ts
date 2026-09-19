import { mockDelay } from "@/utils/mockDelay";
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

let categories = loadJson<ItemCategory[]>(CATEGORIES_KEY, []);
let vendors = loadJson<Vendor[]>(VENDORS_KEY, []);
let items = loadJson<InventoryItem[]>(ITEMS_KEY, []);
let transactions = loadJson<StockTransaction[]>(TRANSACTIONS_KEY, []);

const persistCategories = () => saveJson(CATEGORIES_KEY, categories);
const persistVendors = () => saveJson(VENDORS_KEY, vendors);
const persistItems = () => saveJson(ITEMS_KEY, items);
const persistTransactions = () => saveJson(TRANSACTIONS_KEY, transactions);

function requireEntity<T extends { id: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`${label} not found`);
  return found;
}

function performSeed(): void {
  if (loadJson(SEEDED_KEY, false)) return;

  if (categories.length === 0) {
    categories = SEED_CATEGORIES.map((c) => ({ ...c }));
    persistCategories();
  }
  if (vendors.length === 0) {
    vendors = SEED_VENDORS.map((v) => ({ ...v }));
    persistVendors();
  }
  if (items.length === 0 && transactions.length === 0) {
    const seeded = buildSeedInventory();
    items = seeded.items;
    transactions = seeded.transactions;
    persistItems();
    persistTransactions();
  }

  saveJson(SEEDED_KEY, true);
}

performSeed();

// ── Categories ───────────────────────────────────────────────────────────

export async function listCategories(): Promise<ItemCategory[]> {
  return mockDelay([...categories], 300);
}

export async function createCategory(values: ItemCategoryFormValues): Promise<ItemCategory> {
  const category: ItemCategory = { id: genId("cat"), ...values };
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
  requireEntity(categories, id, "Category");
  if (items.some((i) => i.categoryId === id)) {
    await mockDelay(null, 300);
    throw new Error("This category has items assigned to it and can't be deleted");
  }
  categories = categories.filter((c) => c.id !== id);
  persistCategories();
  return mockDelay(undefined, 350);
}

// ── Vendors ──────────────────────────────────────────────────────────────

export async function listVendors(): Promise<Vendor[]> {
  return mockDelay([...vendors], 300);
}

export async function createVendor(values: VendorFormValues): Promise<Vendor> {
  const vendor: Vendor = { id: genId("ven"), ...values };
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
  requireEntity(vendors, id, "Vendor");
  if (transactions.some((t) => t.vendorId === id)) {
    await mockDelay(null, 300);
    throw new Error("This vendor has purchase history and can't be deleted");
  }
  vendors = vendors.filter((v) => v.id !== id);
  persistVendors();
  return mockDelay(undefined, 350);
}

// ── Items ────────────────────────────────────────────────────────────────

export async function listItems(): Promise<InventoryItem[]> {
  return mockDelay([...items].sort((a, b) => a.code.localeCompare(b.code)), 350);
}

export async function createItem(values: InventoryItemFormValues): Promise<InventoryItem> {
  if (items.some((i) => i.code.trim().toLowerCase() === values.code.trim().toLowerCase())) {
    await mockDelay(null, 300);
    throw new Error("An item with this code already exists");
  }
  const item: InventoryItem = { id: genId("item"), ...values, quantityInStock: 0 };
  items = [...items, item];
  persistItems();
  return mockDelay(item, 400);
}

export async function updateItem(id: string, values: InventoryItemFormValues): Promise<InventoryItem> {
  requireEntity(items, id, "Item");
  if (items.some((i) => i.id !== id && i.code.trim().toLowerCase() === values.code.trim().toLowerCase())) {
    await mockDelay(null, 300);
    throw new Error("An item with this code already exists");
  }
  items = items.map((i) => (i.id === id ? { ...i, ...values } : i));
  persistItems();
  return mockDelay(requireEntity(items, id, "Item"), 400);
}

export async function deleteItem(id: string): Promise<void> {
  const item = requireEntity(items, id, "Item");
  if (item.quantityInStock > 0) {
    await mockDelay(null, 300);
    throw new Error("This item still has stock on hand — issue or adjust it to zero before deleting");
  }
  items = items.filter((i) => i.id !== id);
  persistItems();
  return mockDelay(undefined, 350);
}

// ── Stock transactions ──────────────────────────────────────────────────

export async function listTransactions(itemId?: string): Promise<StockTransactionRow[]> {
  const vendorById = new Map(vendors.map((v) => [v.id, v] as const));
  const itemById = new Map(items.map((i) => [i.id, i] as const));
  const filtered = itemId ? transactions.filter((t) => t.itemId === itemId) : transactions;
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
  const item = requireEntity(items, values.itemId, "Item");
  if (values.quantity <= 0) {
    await mockDelay(null, 300);
    throw new Error("Quantity must be greater than zero");
  }
  const transaction: StockTransaction = {
    id: genId("txn"),
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
  const item = requireEntity(items, values.itemId, "Item");
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
  const item = requireEntity(items, values.itemId, "Item");
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
  const rows = items
    .filter((i) => i.quantityInStock <= i.reorderLevel)
    .map((i) => ({ ...i, shortBy: Math.max(0, i.reorderLevel - i.quantityInStock) }))
    .sort((a, b) => b.shortBy - a.shortBy);
  return mockDelay(rows, 350);
}

export async function getInventoryValuation(): Promise<InventoryValuation> {
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const byCategory = new Map<string, { itemCount: number; totalQuantity: number; totalValue: number }>();

  for (const item of items) {
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
    { rows, totalValue: rows.reduce((sum, r) => sum + r.totalValue, 0), totalItems: items.length },
    400,
  );
}
