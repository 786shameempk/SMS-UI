import type { ModulePermissions, UserRole } from "@/types/auth";
import { applyServerWidgets, defaultLayout, fillRows, moveItem, moveOnto, moveVisible, resolveLayout, toSavedLayout, updateItem, type SavedDashboardLayout } from "./layout";
import { WIDGET_REGISTRY } from "./registry";
import { availableWidgets, canViewWidget, WIDGET_CATALOG, WIDGETS_BY_ID, type DashboardWidgetId } from "./widgets";

const ids = (role: UserRole, allBranches = false, modules: ModulePermissions | null = null) =>
  availableWidgets({ role, allBranches, modules }).map((w) => w.id);

const perms = (granted: string[]) => new Proxy({} as ModulePermissions, { get: (_, k) => granted.includes(String(k)) });

describe("widget catalog", () => {
  it("has unique ids and a registry renderer for every widget, fed by the loader the config names", () => {
    expect(new Set(WIDGET_CATALOG.map((w) => w.id)).size).toBe(WIDGET_CATALOG.length);
    for (const w of WIDGET_CATALOG) {
      const entry = WIDGET_REGISTRY[w.id];
      expect(entry, w.id).toBeDefined();
      if (w.dataSource.kind === "loader") {
        expect(entry.kind, w.id).toBe("loader");
        expect(entry.kind === "loader" && entry.key, w.id).toBe(w.dataSource.key);
      } else {
        expect(entry.kind, w.id).toBe("component");
      }
    }
  });

  it("uses only supported sizes and non-negative refresh intervals", () => {
    for (const w of WIDGET_CATALOG) {
      expect([3, 4, 6, 8, 12]).toContain(w.defaultWidth);
      expect([1, 2, 3]).toContain(w.defaultHeight);
      expect(w.refreshInterval).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("widget visibility", () => {
  it("applies role rules", () => {
    expect(ids("teacher")).not.toContain("revenue");
    expect(ids("parent")).not.toContain("birthdays");
    expect(ids("parent")).toContain("todayClasses");
    expect(ids("admin")).not.toContain("todayClasses");
    expect(ids("admin")).toContain("recentActivity");
    expect(ids("teacher")).not.toContain("recentActivity");
  });

  it("shows the branch roll-up only to users who cover every branch", () => {
    expect(ids("admin", false)).not.toContain("scopeOverview");
    expect(ids("admin", true)).toContain("scopeOverview");
  });

  it("offers a module's widget only to users who can open that module", () => {
    expect(ids("librarian", false, perms(["library"]))).toContain("libraryDue");
    expect(ids("teacher", false, perms(["attendance"]))).not.toContain("libraryDue");
    expect(ids("accountant", false, perms(["fees"]))).toEqual(expect.arrayContaining(["revenue", "feesDue"]));
    expect(ids("accountant", false, perms(["fees"]))).not.toContain("performance");
    // No permission map yet (demo sign-in): the role rules alone apply.
    expect(ids("teacher", false, null)).toContain("libraryDue");
  });

  it("lets parents and students see their own fees, bus and hostel without the staff module", () => {
    const none = perms([]);
    for (const role of ["parent", "student"] as const) {
      expect(ids(role, false, none)).toEqual(expect.arrayContaining(["feesDue", "busStatus", "hostel", "attendance", "upcomingExams"]));
    }
    // ...but a teacher without the fees module doesn't get the school's fee list.
    expect(ids("teacher", false, none)).not.toContain("feesDue");
  });

  it("canViewWidget agrees with availableWidgets", () => {
    const viewer = { role: "principal" as const, allBranches: true, modules: perms(["fees", "examinations"]) };
    expect(availableWidgets(viewer).map((w) => w.id)).toEqual(WIDGET_CATALOG.filter((w) => canViewWidget(w, viewer)).map((w) => w.id).sort(
      (a, b) => WIDGETS_BY_ID.get(a)!.defaultOrder - WIDGETS_BY_ID.get(b)!.defaultOrder,
    ));
  });
});

describe("dashboard layout", () => {
  const admin = availableWidgets({ role: "admin", allBranches: true, modules: null });
  const teacher = availableWidgets({ role: "teacher", allBranches: false, modules: null });
  const saved = (items: SavedDashboardLayout["items"]): SavedDashboardLayout => ({ version: 1, items, updatedAt: "2026-01-01T00:00:00Z" });

  it("defaults to every allowed widget, visible, in default order and size", () => {
    const items = defaultLayout(admin);
    expect(items.map((i) => i.id)).toEqual(admin.map((w) => w.id));
    expect(items.every((i) => i.visible)).toBe(true);
    expect(items[0]).toMatchObject({ id: "stats", w: 12, h: 1 });
  });

  it("restores a saved order, sizes and hidden widgets", () => {
    const items = resolveLayout(admin, saved([
      { id: "notifications", visible: true, w: 6, h: 2 },
      { id: "stats", visible: false, w: 12, h: 1 },
    ]));
    expect(items[0]).toEqual({ id: "notifications", visible: true, w: 6, h: 2 });
    expect(items[1]).toMatchObject({ id: "stats", visible: false });
    expect(items).toHaveLength(admin.length);
  });

  it("never brings back a widget the user is no longer allowed, even if it is in their saved layout", () => {
    // Saved while an admin; now a teacher (or the permission was revoked).
    const items = resolveLayout(teacher, saved([
      { id: "revenue", visible: true, w: 8, h: 2 },
      { id: "recentActivity", visible: true, w: 8, h: 1 },
      { id: "stats", visible: true, w: 12, h: 1 },
    ]));
    expect(items.map((i) => i.id)).not.toContain("revenue");
    expect(items.map((i) => i.id)).not.toContain("recentActivity");
    expect(items[0].id).toBe("stats");
  });

  it("ignores unknown ids, duplicates, bad sizes and unknown versions", () => {
    const items = resolveLayout(admin, saved([
      { id: "nope" as DashboardWidgetId, visible: true, w: 12, h: 1 },
      { id: "calendar", visible: true, w: 5 as never, h: 9 as never },
      { id: "calendar", visible: false, w: 12, h: 1 },
    ]));
    expect(items.filter((i) => i.id === "calendar")).toEqual([{ id: "calendar", visible: true, w: 4, h: 2 }]);
    expect(items.map((i) => i.id)).not.toContain("nope");
    expect(resolveLayout(admin, { version: 2 } as never)).toEqual(defaultLayout(admin));
  });

  it("slots widgets added after the layout was saved next to their default neighbours", () => {
    const items = resolveLayout(admin, saved([
      { id: "notifications", visible: true, w: 4, h: 1 },
      { id: "stats", visible: true, w: 12, h: 1 },
    ]));
    // scopeOverview (default order 20) goes after stats (10), not at the end.
    const at = (id: DashboardWidgetId) => items.findIndex((i) => i.id === id);
    expect(at("scopeOverview")).toBe(at("stats") + 1);
    expect(items).toHaveLength(admin.length);
  });

  it("keeps fixed widgets at their defaults", () => {
    const fixed = admin.map((w) => (w.id === "stats" ? { ...w, configurable: false } : w));
    const items = resolveLayout(fixed, saved([{ id: "stats", visible: false, w: 3, h: 3 }]));
    expect(items.find((i) => i.id === "stats")).toEqual({ id: "stats", visible: true, w: 12, h: 1 });
  });

  it("moves, resizes and round-trips through the saved form", () => {
    const base = defaultLayout(admin);
    const moved = moveItem(base, "notifications", 0);
    expect(moved[0].id).toBe("notifications");
    expect(moved).toHaveLength(base.length);
    expect(moveItem(base, "stats", 999).at(-1)?.id).toBe("stats");
    const resized = updateItem(moved, "notifications", { w: 6 });
    expect(resized[0].w).toBe(6);
    expect(resolveLayout(admin, toSavedLayout(resized))).toEqual(resized);
  });

  it("fills short rows to the edge, sharing the spare columns", () => {
    expect(fillRows([12, 8, 4, 4, 4, 4], 12)).toEqual([12, 8, 4, 4, 4, 4]); // already full
    expect(fillRows([3, 3], 12)).toEqual([6, 6]); // a short last row
    expect(fillRows([8, 8], 12)).toEqual([12, 12]); // the next card doesn't fit
    expect(fillRows([3, 6, 3, 3, 3], 12)).toEqual([3, 6, 3, 6, 6]);
    expect(fillRows([4, 4, 3], 12)).toEqual([4, 4, 4]);
    expect(fillRows([3, 3, 3], 6)).toEqual([3, 3, 6]);
    expect(fillRows([], 12)).toEqual([]);
  });

  it("drag and drop puts the dragged widget in the target's place", () => {
    const base = defaultLayout(admin);
    const order = (items: typeof base) => items.map((i) => i.id);
    // Backward: lands before the target.
    expect(order(moveOnto(base, "notifications", "stats")).slice(0, 2)).toEqual(["notifications", "stats"]);
    // Forward: lands after the target (which shifts back one).
    expect(order(moveOnto(base, "stats", "scopeOverview")).slice(0, 2)).toEqual(["scopeOverview", "stats"]);
    expect(moveOnto(base, "stats", "stats")).toEqual(base);
    expect(moveOnto(base, "stats", "nope" as DashboardWidgetId)).toEqual(base);
  });

  it("arrow moves step over hidden widgets", () => {
    const base = updateItem(updateItem(defaultLayout(admin), "scopeOverview", { visible: false }), "alerts", { visible: false });
    const moved = moveVisible(base, "attendance", -1);
    expect(moved.filter((i) => i.visible).map((i) => i.id).slice(0, 2)).toEqual(["attendance", "stats"]);
    // Already first / last: unchanged.
    expect(moveVisible(moved, "attendance", -1)).toEqual(moved);
    const last = moved.filter((i) => i.visible).at(-1)!.id;
    expect(moveVisible(moved, last, 1)).toEqual(moved);
  });

  it("applies the server's widget list and school defaults", () => {
    const narrowed = applyServerWidgets(admin, [
      { id: "notifications", defaultVisible: false, defaultOrder: 1, defaultWidth: 6, defaultHeight: 2, configurable: false, refreshInterval: 15 },
      { id: "stats", defaultVisible: true, defaultOrder: 2, defaultWidth: 7 as never, defaultHeight: 1, configurable: true, refreshInterval: -5 },
    ]);
    expect(narrowed.map((w) => w.id)).toEqual(["notifications", "stats"]);
    expect(narrowed[0]).toMatchObject({ defaultVisible: false, defaultWidth: 6, defaultHeight: 2, configurable: false, refreshInterval: 15 });
    expect(narrowed[1]).toMatchObject({ defaultWidth: 12, refreshInterval: 0 });
  });
});
