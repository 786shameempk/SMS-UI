import { useUiStore } from "./useUiStore";
import { applyThemeMode } from "@/features/settings/theme";

vi.mock("@/features/settings/theme", () => ({ applyThemeMode: vi.fn() }));

describe("ui store", () => {
  const initial = useUiStore.getState();
  beforeEach(() => useUiStore.setState(initial, true));

  it("toggles the sidebar and nav sections", () => {
    const s = () => useUiStore.getState();

    s().toggleSidebar();
    s().toggleNavSection("Finance");
    s().toggleNavSection("Academics");
    s().toggleNavSection("Finance");
    s().expandNavSection("Academics");
    s().expandNavSection("Missing");

    expect(s().isSidebarCollapsed).toBe(true);
    expect(s().collapsedNavSections).toEqual([]);
    s().toggleNavSection("Hostel");
    expect(s().collapsedNavSections).toEqual(["Hostel"]);
  });

  it("applies the theme mode before storing it, and persists preferences", () => {
    const s = useUiStore.getState();

    s.setThemeMode("dark");
    s.setDashboardScopeView("segregated" as never);
    s.setDashboardDateRange({ preset: "custom" } as never);
    s.setDashboardLayout("u1", { version: 1, items: [], updatedAt: "x" });

    expect(applyThemeMode).toHaveBeenCalledWith("dark");
    expect(useUiStore.getState()).toMatchObject({ themeMode: "dark", dashboardScopeView: "segregated", dashboardDateRange: { preset: "custom" }, dashboardLayouts: { u1: { version: 1, items: [] } } });
    expect(JSON.parse(localStorage.getItem("sms-ui")!).state.themeMode).toBe("dark");
  });

  it("drops the old browser-wide hidden-widgets list when upgrading saved preferences", async () => {
    localStorage.setItem("sms-ui", JSON.stringify({ version: 0, state: { themeMode: "light", hiddenDashboardWidgets: ["fees"] } }));
    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState().themeMode).toBe("light");
    expect(useUiStore.getState()).not.toHaveProperty("hiddenDashboardWidgets");
  });

  it("saves and forgets a layout per user", () => {
    const layout = { version: 1 as const, items: [], updatedAt: "x" };
    useUiStore.getState().setDashboardLayout("a", layout);
    useUiStore.getState().setDashboardLayout("b", layout);
    useUiStore.getState().setDashboardLayout("a", null);
    expect(Object.keys(useUiStore.getState().dashboardLayouts)).toEqual(["b"]);
  });
});
