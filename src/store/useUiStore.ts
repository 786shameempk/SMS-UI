import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyThemeMode, type ThemeMode } from "@/features/settings/theme";
import { DEFAULT_DATE_RANGE } from "@/features/dashboard/dateRange";
import type { DashboardDateRange, DashboardScopeView } from "@/features/dashboard/types";
import type { DashboardWidgetId } from "@/features/dashboard/widgets";

interface UiState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Titles of nav sections the user has collapsed in the expanded sidebar. */
  collapsedNavSections: string[];
  toggleNavSection: (title: string) => void;
  expandNavSection: (title: string) => void;
  /** Per-user preference, not per-tenant — see the doc comment on applyThemeMode in settings/theme.ts. */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /** Dashboard controls — per-user preferences, remembered across visits. */
  dashboardScopeView: DashboardScopeView;
  setDashboardScopeView: (view: DashboardScopeView) => void;
  dashboardDateRange: DashboardDateRange;
  setDashboardDateRange: (range: DashboardDateRange) => void;
  /** Stored as the *hidden* set so widgets added in future releases show up by default. */
  hiddenDashboardWidgets: DashboardWidgetId[];
  setHiddenDashboardWidgets: (ids: DashboardWidgetId[]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      collapsedNavSections: [],
      toggleNavSection: (title) =>
        set((s) => ({
          collapsedNavSections: s.collapsedNavSections.includes(title)
            ? s.collapsedNavSections.filter((t) => t !== title)
            : [...s.collapsedNavSections, title],
        })),
      expandNavSection: (title) =>
        set((s) => ({ collapsedNavSections: s.collapsedNavSections.filter((t) => t !== title) })),
      themeMode: "system",
      setThemeMode: (mode) => {
        applyThemeMode(mode);
        set({ themeMode: mode });
      },
      dashboardScopeView: "aggregated",
      setDashboardScopeView: (view) => set({ dashboardScopeView: view }),
      dashboardDateRange: DEFAULT_DATE_RANGE,
      setDashboardDateRange: (range) => set({ dashboardDateRange: range }),
      hiddenDashboardWidgets: [],
      setHiddenDashboardWidgets: (ids) => set({ hiddenDashboardWidgets: ids }),
    }),
    { name: "sms-ui" },
  ),
);
