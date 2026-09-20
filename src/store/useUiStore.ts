import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyThemeMode, type ThemeMode } from "@/features/settings/theme";

interface UiState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Per-user preference, not per-tenant — see the doc comment on applyThemeMode in settings/theme.ts. */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      themeMode: "system",
      setThemeMode: (mode) => {
        applyThemeMode(mode);
        set({ themeMode: mode });
      },
    }),
    { name: "sms-ui" },
  ),
);
