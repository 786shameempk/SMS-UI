export type ItemUnit = "piece" | "box" | "packet" | "kg" | "litre" | "ream" | "set";

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ItemCategoryFormValues {
  name: string;
  description?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface VendorFormValues {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  unit: ItemUnit;
  unitCost: number;
  reorderLevel: number;
  quantityInStock: number;
  location?: string;
}

export interface InventoryItemFormValues {
  code: string;
  name: string;
  categoryId: string;
  unit: ItemUnit;
  unitCost: number;
  reorderLevel: number;
  location?: string;
}

export type StockTransactionType = "purchase" | "issue" | "adjustment";

export interface StockTransaction {
  id: string;
  itemId: string;
  type: StockTransactionType;
  quantityDelta: number;
  date: string;
  vendorId?: string;
  unitCost?: number;
  issuedTo?: string;
  reason?: string;
  reference?: string;
  createdAt: string;
}

export interface StockTransactionRow extends StockTransaction {
  item: InventoryItem;
  vendor?: Vendor;
}

export interface StockInFormValues {
  itemId: string;
  quantity: number;
  unitCost: number;
  vendorId?: string;
  date: string;
  reference?: string;
}

export interface StockOutFormValues {
  itemId: string;
  quantity: number;
  issuedTo: string;
  reason?: string;
  date: string;
}

export interface StockAdjustmentFormValues {
  itemId: string;
  newQuantity: number;
  reason: string;
  date: string;
}

export interface LowStockItem extends InventoryItem {
  shortBy: number;
}

export interface InventoryValuationRow {
  categoryId: string;
  categoryName: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
}

export interface InventoryValuation {
  rows: InventoryValuationRow[];
  totalValue: number;
  totalItems: number;
}
