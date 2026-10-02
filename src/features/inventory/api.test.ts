import * as inventory from "./api";
import { campusHttpClient } from "@/lib/httpClient";
import { checkCrud } from "@/test/crud";
import { stubClient } from "@/test/utils";

const item = (overrides: Record<string, unknown> = {}) => ({
  id: "it1", tenantId: "t", branchId: "b", code: "PEN", name: "Blue pen", categoryId: "c1", unit: "Box", unitCost: 50, reorderLevel: 10, quantityInStock: 4, location: null, ...overrides,
});
const vendor = { id: "v1", tenantId: "t", name: "Acme", contactPerson: null, phone: "999", email: null, address: null };
const txn = (overrides: Record<string, unknown> = {}) => ({
  id: "tx1", tenantId: "t", branchId: "b", itemId: "it1", type: "Purchase", quantityDelta: 10, date: "2026-10-01", vendorId: "v1", unitCost: 50, issuedTo: null, reason: null, reference: null, createdAt: "", ...overrides,
});

describe("inventory api", () => {
  it("categories send blank descriptions as null", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/itemcategories",
      dto: { id: "c1", tenantId: "t", name: "Stationery", description: null },
      values: { name: "Stationery", description: "   " } as never,
      list: inventory.listCategories,
      create: inventory.createCategory,
      update: inventory.updateCategory,
      remove: inventory.deleteCategory,
      sent: { name: "Stationery", description: null },
      mapped: { description: undefined },
    }));

  it("vendors", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/vendors",
      dto: vendor,
      values: { name: "Acme", contactPerson: " Ravi ", phone: "", email: "a@acme.test", address: undefined } as never,
      list: inventory.listVendors,
      create: inventory.createVendor,
      update: inventory.updateVendor,
      remove: inventory.deleteVendor,
      sent: { name: "Acme", contactPerson: "Ravi", phone: null, email: "a@acme.test", address: null },
      mapped: { phone: "999", email: undefined },
    }));

  it("items translate units", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/inventoryitems",
      dto: item(),
      values: { code: "PEN", name: "Blue pen", categoryId: "c1", unit: "ream", unitCost: 50, reorderLevel: 10, location: " Store A " } as never,
      list: inventory.listItems,
      create: inventory.createItem,
      update: inventory.updateItem,
      remove: inventory.deleteItem,
      sent: { code: "PEN", name: "Blue pen", categoryId: "c1", unit: "Ream", unitCost: 50, reorderLevel: 10, location: "Store A" },
      mapped: { unit: "box", location: undefined },
      fallback: { dto: item({ id: "it2", unit: "?" }), mapped: { unit: "piece" } },
    }));

  it("transactions join their item and vendor, dropping orphans", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/stocktransactions": [txn(), txn({ id: "tx2", itemId: "gone" }), txn({ id: "tx3", type: "?", vendorId: null })],
      "GET /api/inventoryitems": [item()],
      "GET /api/vendors": [vendor],
    });

    const rows = await inventory.listTransactions("it1");

    expect(rows.map((r) => [r.id, r.type])).toEqual([["tx1", "purchase"], ["tx3", "adjustment"]]);
    expect(rows[0]).toMatchObject({ item: { name: "Blue pen" }, vendor: { name: "Acme" }, issuedTo: undefined });
    expect(rows[1].vendor).toBeUndefined();
    expect((calls[0].config as { params: unknown }).params).toEqual({ itemId: "it1" });
  });

  it("purchase, issue and adjustment", async () => {
    const calls = stubClient(campusHttpClient, {
      "POST /api/stocktransactions/purchase": txn(),
      "POST /api/stocktransactions/issue": txn({ type: "Issue", quantityDelta: -2, issuedTo: "Class 5", vendorId: null }),
      "POST /api/stocktransactions/adjustment": txn({ type: "Adjustment", quantityDelta: -1, reason: "Damaged" }),
    });

    await inventory.recordPurchase({ itemId: "it1", quantity: 10, unitCost: 50, vendorId: "", date: "2026-10-01", reference: " PO-1 " } as never);
    expect((await inventory.recordIssue({ itemId: "it1", quantity: 2, issuedTo: "Class 5", reason: "", date: "2026-10-01" } as never)).issuedTo).toBe("Class 5");
    expect((await inventory.recordAdjustment({ itemId: "it1", newQuantity: 11, reason: "Damaged", date: "2026-10-01" } as never)).reason).toBe("Damaged");

    expect(calls[0].body).toEqual({ itemId: "it1", quantity: 10, unitCost: 50, vendorId: null, date: "2026-10-01", reference: "PO-1" });
    expect(calls[1].body).toEqual({ itemId: "it1", quantity: 2, issuedTo: "Class 5", reason: null, date: "2026-10-01" });
    expect(calls[2].body).toEqual({ itemId: "it1", newQuantity: 11, reason: "Damaged", date: "2026-10-01" });
  });

  it("low stock and valuation reports", async () => {
    stubClient(campusHttpClient, {
      "GET /api/inventoryreports/low-stock": [{ ...item(), shortBy: 6 }],
      "GET /api/inventoryreports/valuation": { rows: [], totalValue: 200, totalItems: 1 },
    });

    expect(await inventory.getLowStockItems()).toEqual([expect.objectContaining({ unit: "box", shortBy: 6 })]);
    expect((await inventory.getInventoryValuation()).totalValue).toBe(200);
  });
});
