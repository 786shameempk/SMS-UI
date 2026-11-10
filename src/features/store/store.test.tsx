import { useState } from "react";
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { campusHttpClient } from "@/lib/httpClient";
import { signIn, signOut, stubClient } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import * as api from "./api";
import StoreLayout, { SECTIONS } from "./components/StoreLayout";
import { LinesEditor, money, newLine, qty, toNumber, useStoreAccess, type EditableLine } from "./shared";

const permissions = (extra: Record<string, boolean> = {}) => ({ store: true, ...extra }) as unknown as ModulePermissions;

afterEach(() => signOut());

describe("store api", () => {
  it("leaves empty filters out of the query string", async () => {
    const calls = stubClient(campusHttpClient, { "GET /api/store/items": { items: [], totalCount: 0, pageNumber: 1, pageSize: 15 } });

    await api.listItems({ search: "", categoryId: undefined, active: true, lowOnly: false, pageNumber: 1, pageSize: 15 });

    const config = calls[0].config as { params: Record<string, unknown> };
    expect(config.params).toEqual({ active: true, lowOnly: false, pageNumber: 1, pageSize: 15 });
  });

  it("creates with POST and updates with PUT on the record's own URL", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/store/stores": { id: "s1" }, "PUT /api/store/stores/s1": { id: "s1" } });
    const body = { name: "Main", code: "MAIN", isActive: true, staff: [] };

    await api.createStore(body);
    await api.updateStore("s1", body);

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["POST /api/store/stores", "PUT /api/store/stores/s1"]);
  });

  it("sends a goods receipt, an issue decision and a return the way the server expects them", async () => {
    const calls = stubClient(campusHttpClient, {
      "POST /api/store/receipts": { id: "g1" },
      "POST /api/store/issues/i1/decision": { id: "i1" },
      "POST /api/store/returns": { id: "r1" },
    });

    await api.createReceipt({ purchaseOrderId: "p1", lines: [{ purchaseOrderLineId: "l1", quantity: 4 }] });
    await api.decideIssue("i1", false, "Not needed");
    await api.createReturn({ kind: "Issue", issueId: "i1", lines: [{ sourceLineId: "l1", quantity: 1, condition: "Damaged" }], approveNow: false });

    expect(calls[0].body).toEqual({ purchaseOrderId: "p1", lines: [{ purchaseOrderLineId: "l1", quantity: 4 }] });
    expect(calls[1].body).toEqual({ approve: false, note: "Not needed" });
    expect(calls[2].body).toMatchObject({ kind: "Issue", issueId: "i1", approveNow: false });
  });

  it("asks a report for a page, with only the filters that are set", async () => {
    const calls = stubClient(campusHttpClient, { "GET /api/store/reports/stock-valuation": { key: "stock-valuation", columns: [], rows: [], totalCount: 0, pageNumber: 1, pageSize: 25, totals: {} } });

    await api.runReport("stock-valuation", { storeId: "s1", search: "", pageNumber: 2, pageSize: 25 });

    expect((calls[0].config as { params: Record<string, unknown> }).params).toEqual({ storeId: "s1", pageNumber: 2, pageSize: 25 });
  });
});

describe("useStoreAccess", () => {
  it("gives nothing without the module", () => {
    signIn("admin", {}, { store: false } as unknown as ModulePermissions);
    const { result } = renderHook(() => useStoreAccess());
    expect(result.current).toMatchObject({ hasModule: false, canView: false, issue: false, approve: false, reports: false });
  });

  it("judges an older session (no Staff.Managed marker) by the module alone", () => {
    signIn("teacher", {}, permissions());
    const { result } = renderHook(() => useStoreAccess());
    expect(result.current).toMatchObject({ hasModule: true, canView: true, issue: true, approve: true, sell: true, reports: true, export: true });
  });

  it("follows the school's staff actions once they are managed, with no regard to the role name", () => {
    signIn("admin", {}, permissions({ "Staff.Managed": true, "Store.View": true, "Store.Request": true }));
    const { result } = renderHook(() => useStoreAccess());
    expect(result.current).toMatchObject({ hasModule: true, canView: true, request: true, issue: false, approve: false, sell: false, receive: false, reports: false, export: false });
  });

  it("never grants a parent or student anything, even if the token lists it", () => {
    signIn("parent", {}, permissions({ "Staff.Managed": true, "Store.View": true, "Store.Issue": true }));
    const { result } = renderHook(() => useStoreAccess());
    expect(result.current).toMatchObject({ hasModule: false, canView: false, issue: false });
  });
});

describe("StoreLayout tabs", () => {
  const renderLayout = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    stubClient(campusHttpClient, { "GET /api/store/notifications": { items: [], unread: 0 } });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/store"]}><StoreLayout /></MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it("shows every section to someone who can do everything", async () => {
    signIn("admin", {}, permissions());
    renderLayout();
    const nav = await screen.findByRole("navigation", { name: "Store sections" });
    expect(nav.querySelectorAll("a")).toHaveLength(SECTIONS.length);
    expect(SECTIONS.map((s) => s.label)).toEqual(expect.arrayContaining(["Dashboard", "Stores & Warehouses", "Items", "Categories", "Suppliers", "Purchase Requisitions", "Purchase Orders", "Goods Receipt (GRN)", "Stock Management", "Item Issue / Distribution", "Store Sales", "Returns", "Reports"]));
  });

  it("groups the menu, announces the current page and opens from a button on phones", async () => {
    signIn("admin", {}, permissions());
    renderLayout();
    const nav = await screen.findByRole("navigation", { name: "Store sections" });
    expect(Array.from(nav.querySelectorAll("[role=group]")).map((g) => g.getAttribute("aria-label"))).toEqual(["Overview", "Master data", "Purchasing", "Stock and distribution", "Sales and insight"]);
    expect(nav.querySelector("a[aria-current=page]")?.textContent).toContain("Dashboard");
    const toggle = screen.getByRole("button", { name: /Dashboard/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("hides what the person has no permission for", async () => {
    signIn("teacher", {}, permissions({ "Staff.Managed": true, "Store.Request": true }));
    renderLayout();
    const nav = await screen.findByRole("navigation", { name: "Store sections" });
    const labels = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent);
    expect(labels).toEqual(["Items", "Purchase Requisitions", "Item Issue / Distribution"]);
  });
});

describe("LinesEditor", () => {
  const Harness = ({ initial }: { initial: EditableLine[] }) => {
    const [lines, setLines] = useState(initial);
    return <LinesEditor lines={lines} onChange={setLines} itemList={[]} showPrice />;
  };

  it("adds and removes lines but always keeps one", async () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><Harness initial={[newLine()]} /></QueryClientProvider>);

    expect(screen.getAllByLabelText("Quantity")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    await waitFor(() => expect(screen.getAllByLabelText("Quantity")).toHaveLength(2));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove line" })[0]);
    await waitFor(() => expect(screen.getAllByLabelText("Quantity")).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Remove line" })).toBeDisabled();
  });
});

describe("formatters", () => {
  it("formats numbers and treats blank or invalid input as zero", () => {
    expect(toNumber("")).toBe(0);
    expect(toNumber("abc")).toBe(0);
    expect(toNumber("12.5")).toBe(12.5);
    expect(qty(1234.5)).toMatch(/1,234\.5|1\.234,5|1 234,5/);
    expect(money(null)).toBe("—");
    expect(money(10)).toContain("10.00");
  });
});
