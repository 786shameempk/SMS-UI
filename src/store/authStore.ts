import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, ModulePermissions } from "@/types/auth";
import { DEFAULT_TENANT_ID } from "@/constants/tenant";
import { defaultBranchIdForTenant } from "@/constants/branch";

const REMEMBERED_SESSION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const DEFAULT_SESSION_MS = 1000 * 60 * 60 * 12; // 12 hours

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  modulePermissions: ModulePermissions | null;
  expiresAt: number | null;
  /** Which tenant's data is currently in view. Locked to the user's own tenantId for everyone
   *  except superAdmin, who can switch it (see Header's tenant switcher). Never undefined, so
   *  there's no gap before this store's own persisted value rehydrates. */
  activeTenantId: string;
  /** Which branch (campus) of the active tenant is currently in view. Locked to the user's own
   *  branchId for everyone except admin/superAdmin, who can switch it (see Header's branch
   *  switcher). Never undefined, same rehydration-gap reasoning as activeTenantId. */
  activeBranchId: string;

  setSession: (user: AuthUser, token: string, permissions: ModulePermissions, rememberMe?: boolean) => void;
  setActiveTenantId: (tenantId: string) => void;
  setActiveBranchId: (branchId: string) => void;
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
      activeTenantId: DEFAULT_TENANT_ID,
      activeBranchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),

      setSession: (user, token, modulePermissions, rememberMe = true) => {
        const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
        set({
          user,
          token,
          modulePermissions,
          expiresAt: Date.now() + (rememberMe ? REMEMBERED_SESSION_MS : DEFAULT_SESSION_MS),
          activeTenantId: tenantId,
          activeBranchId: user.branchId ?? defaultBranchIdForTenant(tenantId),
        });
      },

      setActiveTenantId: (tenantId) =>
        // Switching tenant also resets the active branch: whatever was active almost certainly
        // doesn't belong to the newly selected tenant.
        set({ activeTenantId: tenantId, activeBranchId: defaultBranchIdForTenant(tenantId) }),

      setActiveBranchId: (branchId) => set({ activeBranchId: branchId }),

      isSessionValid: () => {
        const { token, expiresAt } = get();
        return Boolean(token) && Boolean(expiresAt) && expiresAt! > Date.now();
      },

      clearAuth: () => {
        set({
          token: null,
          user: null,
          modulePermissions: null,
          expiresAt: null,
          activeTenantId: DEFAULT_TENANT_ID,
          activeBranchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
        });
        localStorage.removeItem("sms-auth");
      },
    }),
    { name: "sms-auth" },
  ),
);
