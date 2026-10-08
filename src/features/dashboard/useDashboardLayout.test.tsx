import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { authHttpClient } from "@/lib/httpClient";
import { useUiStore } from "@/store/useUiStore";
import { apiError, signIn, signOut, stubClient, testQueryClient } from "@/test/utils";
import type { ServerDashboard } from "./layoutApi";
import { availableWidgets } from "./widgets";
import { useDashboardLayout } from "./useDashboardLayout";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const teacherWidgets = availableWidgets({ role: "teacher", allBranches: false, modules: null });

const server = (over: Partial<ServerDashboard> = {}): ServerDashboard => ({
  role: "teacher",
  widgets: [
    { id: "stats", defaultVisible: true, defaultOrder: 10, defaultWidth: 12, defaultHeight: 1, configurable: true, refreshInterval: 300 },
    { id: "notifications", defaultVisible: true, defaultOrder: 5, defaultWidth: 6, defaultHeight: 1, configurable: false, refreshInterval: 30 },
    { id: "calendar", defaultVisible: false, defaultOrder: 20, defaultWidth: 4, defaultHeight: 2, configurable: true, refreshInterval: 0 },
  ],
  layout: { items: [], customized: false, updatedAt: null },
  ...over,
});

function setup(source: "live" | "mock" = "live") {
  const queryClient = testQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return renderHook(() => useDashboardLayout(teacherWidgets, source), { wrapper });
}

describe("useDashboardLayout", () => {
  const initialUi = useUiStore.getState();
  let user: ReturnType<typeof signIn>;
  beforeEach(() => {
    useUiStore.setState({ ...initialUi, dashboardLayouts: {} }, true);
    user = signIn("teacher");
  });
  afterEach(() => {
    signOut();
    vi.restoreAllMocks();
  });

  it("live: shows only the widgets the server allows, with the school's defaults", async () => {
    stubClient(authHttpClient, { "GET /api/dashboard": server() });
    const { result } = setup();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.available.map((w) => w.id)).toEqual(["notifications", "stats", "calendar"]);
    expect(result.current.available[0]).toMatchObject({ configurable: false, refreshInterval: 30, defaultWidth: 6 });
    expect(result.current.items).toEqual([
      { id: "notifications", visible: true, w: 6, h: 1 },
      { id: "stats", visible: true, w: 12, h: 1 },
      { id: "calendar", visible: false, w: 4, h: 2 },
    ]);
    expect(result.current.isCustomized).toBe(false);
  });

  it("live: ignores a server widget the client doesn't know", async () => {
    const s = server();
    s.widgets.push({ id: "fromTheFuture" as never, defaultVisible: true, defaultOrder: 1, defaultWidth: 12, defaultHeight: 1, configurable: true, refreshInterval: 0 });
    stubClient(authHttpClient, { "GET /api/dashboard": s });
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.available.map((w) => w.id)).not.toContain("fromTheFuture");
  });

  it("live: restores the saved layout, saves changes to the server and mirrors them on the device", async () => {
    const calls = stubClient(authHttpClient, {
      "GET /api/dashboard": server({ layout: { items: [{ id: "calendar", visible: true, w: 6, h: 2 }], customized: true, updatedAt: "2026-10-04T00:00:00Z" } }),
      "PUT /api/dashboard/layout": (_: string, body: { items: unknown[] }) => ({ items: body.items, customized: true, updatedAt: "2026-10-04T01:00:00Z" }),
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // The saved widget keeps its size; widgets it doesn't mention slot in by default order.
    expect(result.current.items.map((i) => i.id)).toEqual(["notifications", "stats", "calendar"]);
    expect(result.current.items[2]).toEqual({ id: "calendar", visible: true, w: 6, h: 2 });
    expect(result.current.isCustomized).toBe(true);
    await waitFor(() => expect(useUiStore.getState().dashboardLayouts[user.id]?.items.map((i) => i.id)).toContain("calendar"));

    const next = result.current.items.map((i) => (i.id === "stats" ? { ...i, visible: false } : i));
    act(() => result.current.save(next));

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!;
    expect((put.body as { items: { id: string; visible: boolean }[] }).items.find((i) => i.id === "stats")?.visible).toBe(false);
    expect(result.current.items.find((i) => i.id === "stats")?.visible).toBe(false);
    expect(useUiStore.getState().dashboardLayouts[user.id]?.items.find((i) => i.id === "stats")?.visible).toBe(false);
  });

  it("live: rolls back when the server refuses the layout", async () => {
    stubClient(authHttpClient, {
      "GET /api/dashboard": server(),
      "PUT /api/dashboard/layout": () => {
        throw apiError(403, { title: "You don't have access to the Fee revenue widget." });
      },
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = result.current.items;

    act(() => result.current.save(before.map((i) => ({ ...i, visible: false }))));
    await waitFor(() => expect(result.current.items).toEqual(before));
  });

  it("live: reset goes back to the server's default", async () => {
    const calls = stubClient(authHttpClient, {
      "GET /api/dashboard": server({ layout: { items: [{ id: "stats", visible: false, w: 12, h: 1 }], customized: true, updatedAt: null } }),
      "POST /api/dashboard/layout/reset": { items: [], customized: false, updatedAt: null },
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.isCustomized).toBe(true));

    act(() => result.current.reset());
    await waitFor(() => expect(result.current.isCustomized).toBe(false));
    expect(calls.some((c) => c.method === "POST" && c.url === "/api/dashboard/layout/reset")).toBe(true);
    expect(result.current.items.find((i) => i.id === "stats")?.visible).toBe(true);
    expect(useUiStore.getState().dashboardLayouts[user.id]).toBeUndefined();
  });

  it("live: falls back to the copy on this device when the server can't be reached", async () => {
    useUiStore.getState().setDashboardLayout(user.id, { version: 1, items: [{ id: "holidays", visible: false, w: 6, h: 1 }], updatedAt: "x" });
    stubClient(authHttpClient, {
      "GET /api/dashboard": () => {
        throw apiError(503);
      },
    });
    const { result } = setup();
    // One retry first, then the fallback.
    await waitFor(() => expect(result.current.isOffline).toBe(true), { timeout: 4000 });
    expect(result.current.items.find((i) => i.id === "holidays")).toEqual({ id: "holidays", visible: false, w: 6, h: 1 });
    expect(result.current.available.length).toBe(teacherWidgets.length);
  });

  it("demo data: keeps the layout on this device and never calls the server", () => {
    const calls = stubClient(authHttpClient, {});
    const { result } = setup("mock");
    expect(result.current.isLoading).toBe(false);
    act(() => result.current.save(result.current.items.map((i) => ({ ...i, visible: i.id === "stats" }))));
    expect(useUiStore.getState().dashboardLayouts[user.id]).toBeDefined();
    expect(result.current.items.filter((i) => i.visible).map((i) => i.id)).toEqual(["stats"]);
    expect(calls).toHaveLength(0);
  });
});
