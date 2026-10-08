import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyThemeMode, type ThemeMode } from "@/features/settings/theme";
import { DEFAULT_DATE_RANGE } from "@/features/dashboard/dateRange";
import type { DashboardDateRange, DashboardScopeView } from "@/features/dashboard/types";
import type { SavedDashboardLayout } from "@/features/dashboard/layout";
import type { DashboardDataSource } from "@/features/dashboard/dataSource";

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
  /**
   * Each user's saved widget layout (order, size, shown/hidden), keyed by user id. Resolved against the widgets
   * the user may see on every load, so a stale layout never brings back a widget they've lost access to.
   */
  dashboardLayouts: Record<string, SavedDashboardLayout>;
  /** null = forget the saved layout (back to the role's default dashboard). */
  setDashboardLayout: (userId: string, layout: SavedDashboardLayout | null) => void;
  /** This browser's live/demo choice; null = the deployment default. Ignored where demo data isn't allowed. */
  dashboardDataSource: DashboardDataSource | null;
  setDashboardDataSource: (source: DashboardDataSource | null) => void;
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
      dashboardLayouts: {},
      setDashboardLayout: (userId, layout) =>
        set((s) => {
          const next = { ...s.dashboardLayouts };
          if (layout) next[userId] = layout;
          else delete next[userId];
          return { dashboardLayouts: next };
        }),
      dashboardDataSource: null,
      setDashboardDataSource: (source) => set({ dashboardDataSource: source }),
    }),
    {
      name: "sms-ui",
      version: 1,
      // v0 kept one browser-wide list of hidden widgets; v1 saves a full layout per user.
      migrate: (persisted) => {
        const { hiddenDashboardWidgets: _legacy, ...rest } = (persisted ?? {}) as Record<string, unknown>;
        return rest as unknown as UiState;
      },
    },
  ),
);
