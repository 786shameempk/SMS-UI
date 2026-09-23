import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyThemeMode, type ThemeMode } from "@/features/settings/theme";

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
    }),
    { name: "sms-ui" },
  ),
);
