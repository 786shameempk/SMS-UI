import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, ModulePermissions } from "@/types/auth";

const REMEMBERED_SESSION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const DEFAULT_SESSION_MS = 1000 * 60 * 60 * 12; // 12 hours

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  modulePermissions: ModulePermissions | null;
  expiresAt: number | null;

  setSession: (user: AuthUser, token: string, permissions: ModulePermissions, rememberMe?: boolean) => void;
  isSessionValid: () => boolean;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      modulePermissions: null,
      expiresAt: null,

      setSession: (user, token, modulePermissions, rememberMe = true) =>
        set({
          user,
          token,
          modulePermissions,
          expiresAt: Date.now() + (rememberMe ? REMEMBERED_SESSION_MS : DEFAULT_SESSION_MS),
        }),

      isSessionValid: () => {
        const { token, expiresAt } = get();
        return Boolean(token) && Boolean(expiresAt) && expiresAt! > Date.now();
      },

      clearAuth: () => {
        set({ token: null, user: null, modulePermissions: null, expiresAt: null });
        localStorage.removeItem("sms-auth");
      },
    }),
    { name: "sms-auth" },
  ),
);
