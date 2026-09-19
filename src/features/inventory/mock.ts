import type { InventoryItem, ItemCategory, StockTransaction, Vendor } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

export const SEED_CATEGORIES: ItemCategory[] = [
  { id: "cat-1", name: "Stationery", description: "Paper, pens, and classroom writing supplies." },
  { id: "cat-2", name: "Sports Equipment", description: "Equipment for PE classes and school teams." },
  { id: "cat-3", name: "Lab Equipment", description: "Science lab apparatus and consumables." },
  { id: "cat-4", name: "Furniture", description: "Desks, chairs, and classroom fixtures." },
  { id: "cat-5", name: "Electronics & IT", description: "Projectors, cables, and computer peripherals." },
  { id: "cat-6", name: "Cleaning Supplies", description: "Janitorial and housekeeping consumables." },
];

export const SEED_VENDORS: Vendor[] = [
  { id: "ven-1", name: "Bengaluru Office Supplies Co.", contactPerson: "Suresh Rao", phone: "+91 80 4012 3456", email: "sales@bosc.example.com", address: "45 Commercial Street, Bengaluru" },
  { id: "ven-2", name: "SportsFit Equipment Traders", contactPerson: "Ravi Nayak", phone: "+91 80 2233 4455", email: "orders@sportsfit.example.com", address: "12 Sports Complex Road, Bengaluru" },
  { id: "ven-3", name: "TechZone Electronics", contactPerson: "Divya Menon", phone: "+91 80 3344 5566", email: "b2b@techzone.example.com", address: "88 Electronics City, Bengaluru" },
  { id: "ven-4", name: "Clean & Green Supplies", contactPerson: "Anitha Kumar", phone: "+91 80 4455 6677", email: "info@cleangreen.example.com", address: "23 Industrial Layout, Bengaluru" },
  { id: "ven-5", name: "Campus Furniture Works", contactPerson: "Manoj Pillai", phone: "+91 80 5566 7788", email: "sales@campusfurniture.example.com", address: "67 Furniture Market, Bengaluru" },
];

interface SeedItemSpec {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  unit: InventoryItem["unit"];
  unitCost: number;
  reorderLevel: number;
  location: string;
  openingQuantity: number;
  issuedQuantity?: number;
  vendorId: string;
}

const ITEM_SPECS: SeedItemSpec[] = [
  { id: "item-1", code: "STA-001", name: "A4 Paper Ream", categoryId: "cat-1", unit: "ream", unitCost: 280, reorderLevel: 50, location: "Store Room A", openingQuantity: 150, issuedQuantity: 30, vendorId: "ven-1" },
  { id: "item-2", code: "STA-002", name: "Whiteboard Markers (box of 12)", categoryId: "cat-1", unit: "box", unitCost: 180, reorderLevel: 20, location: "Store Room A", openingQuantity: 30, issuedQuantity: 22, vendorId: "ven-1" },
  { id: "item-3", code: "STA-003", name: "Ballpoint Pens (box of 50)", categoryId: "cat-1", unit: "box", unitCost: 150, reorderLevel: 15, location: "Store Room A", openingQuantity: 60, issuedQuantity: 15, vendorId: "ven-1" },
  { id: "item-4", code: "SPT-001", name: "Cricket Bats", categoryId: "cat-2", unit: "piece", unitCost: 1200, reorderLevel: 10, location: "Sports Store", openingQuantity: 14, vendorId: "ven-2" },
  { id: "item-5", code: "SPT-002", name: "Footballs", categoryId: "cat-2", unit: "piece", unitCost: 800, reorderLevel: 8, location: "Sports Store", openingQuantity: 15, issuedQuantity: 12, vendorId: "ven-2" },
  { id: "item-6", code: "SPT-003", name: "Badminton Shuttlecocks (box of 12)", categoryId: "cat-2", unit: "box", unitCost: 350, reorderLevel: 10, location: "Sports Store", openingQuantity: 22, vendorId: "ven-2" },
  { id: "item-7", code: "LAB-001", name: "Test Tubes (set of 50)", categoryId: "cat-3", unit: "set", unitCost: 650, reorderLevel: 5, location: "Science Lab", openingQuantity: 12, vendorId: "ven-3" },
  { id: "item-8", code: "LAB-002", name: "Bunsen Burners", categoryId: "cat-3", unit: "piece", unitCost: 450, reorderLevel: 8, location: "Science Lab", openingQuantity: 10, issuedQuantity: 4, vendorId: "ven-3" },
  { id: "item-9", code: "LAB-003", name: "Microscopes", categoryId: "cat-3", unit: "piece", unitCost: 8500, reorderLevel: 3, location: "Science Lab", openingQuantity: 6, vendorId: "ven-3" },
  { id: "item-10", code: "FUR-001", name: "Student Desks", categoryId: "cat-4", unit: "piece", unitCost: 2200, reorderLevel: 10, location: "Maintenance Store", openingQuantity: 25, vendorId: "ven-5" },
  { id: "item-11", code: "FUR-002", name: "Classroom Chairs", categoryId: "cat-4", unit: "piece", unitCost: 850, reorderLevel: 20, location: "Maintenance Store", openingQuantity: 60, vendorId: "ven-5" },
  { id: "item-12", code: "FUR-003", name: "Whiteboards (4x6 ft)", categoryId: "cat-4", unit: "piece", unitCost: 3200, reorderLevel: 3, location: "Maintenance Store", openingQuantity: 5, issuedQuantity: 3, vendorId: "ven-5" },
  { id: "item-13", code: "ELC-001", name: "LED Projectors", categoryId: "cat-5", unit: "piece", unitCost: 32000, reorderLevel: 2, location: "IT Store", openingQuantity: 4, vendorId: "ven-3" },
  { id: "item-14", code: "ELC-002", name: "HDMI Cables", categoryId: "cat-5", unit: "piece", unitCost: 350, reorderLevel: 15, location: "IT Store", openingQuantity: 40, vendorId: "ven-3" },
  { id: "item-15", code: "ELC-003", name: "Wireless Mice", categoryId: "cat-5", unit: "piece", unitCost: 550, reorderLevel: 10, location: "IT Store", openingQuantity: 14, issuedQuantity: 10, vendorId: "ven-3" },
  { id: "item-16", code: "CLN-001", name: "Floor Cleaner (5L can)", categoryId: "cat-6", unit: "litre", unitCost: 420, reorderLevel: 10, location: "Janitor Store", openingQuantity: 18, vendorId: "ven-4" },
  { id: "item-17", code: "CLN-002", name: "Hand Sanitizer (1L bottle)", categoryId: "cat-6", unit: "litre", unitCost: 180, reorderLevel: 25, location: "Janitor Store", openingQuantity: 28, issuedQuantity: 22, vendorId: "ven-4" },
  { id: "item-18", code: "CLN-003", name: "Trash Bags (pack of 50)", categoryId: "cat-6", unit: "packet", unitCost: 220, reorderLevel: 15, location: "Janitor Store", openingQuantity: 30, vendorId: "ven-4" },
];

const ISSUE_PURPOSES: Record<string, string> = {
  "cat-1": "Classroom supply restock",
  "cat-2": "PE department",
  "cat-3": "Science lab practicals",
  "cat-4": "Classroom setup",
  "cat-5": "IT department",
  "cat-6": "Housekeeping department",
};

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildSeedInventory(): { items: InventoryItem[]; transactions: StockTransaction[] } {
  const items: InventoryItem[] = [];
  const transactions: StockTransaction[] = [];

  for (const spec of ITEM_SPECS) {
    const finalQuantity = spec.openingQuantity - (spec.issuedQuantity ?? 0);
    items.push({
      id: spec.id,
      code: spec.code,
      name: spec.name,
      categoryId: spec.categoryId,
      unit: spec.unit,
      unitCost: spec.unitCost,
      reorderLevel: spec.reorderLevel,
      quantityInStock: finalQuantity,
      location: spec.location,
    });

    transactions.push({
      id: genId("txn"),
      itemId: spec.id,
      type: "purchase",
      quantityDelta: spec.openingQuantity,
      date: daysAgo(180),
      vendorId: spec.vendorId,
      unitCost: spec.unitCost,
      reference: `PO-${spec.code}-OPEN`,
      createdAt: daysAgo(180),
    });

    if (spec.issuedQuantity) {
      transactions.push({
        id: genId("txn"),
        itemId: spec.id,
        type: "issue",
        quantityDelta: -spec.issuedQuantity,
        date: daysAgo(45),
        issuedTo: ISSUE_PURPOSES[spec.categoryId] ?? "General store issue",
        createdAt: daysAgo(45),
      });
    }
  }

  const microscopeIndex = items.findIndex((i) => i.id === "item-9");
  if (microscopeIndex !== -1) {
    items[microscopeIndex] = { ...items[microscopeIndex], quantityInStock: items[microscopeIndex].quantityInStock - 1 };
    transactions.push({
      id: genId("txn"),
      itemId: "item-9",
      type: "adjustment",
      quantityDelta: -1,
      date: daysAgo(20),
      reason: "Annual stock take — 1 unit found damaged beyond repair.",
      createdAt: daysAgo(20),
    });
  }

  return { items, transactions };
}
