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
    s.setHiddenDashboardWidgets(["fees" as never]);

    expect(applyThemeMode).toHaveBeenCalledWith("dark");
    expect(useUiStore.getState()).toMatchObject({ themeMode: "dark", dashboardScopeView: "segregated", dashboardDateRange: { preset: "custom" }, hiddenDashboardWidgets: ["fees"] });
    expect(JSON.parse(localStorage.getItem("sms-ui")!).state.themeMode).toBe("dark");
  });
});
