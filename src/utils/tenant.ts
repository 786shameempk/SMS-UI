import { useAuthStore } from "@/store/authStore";
import { DEFAULT_TENANT_ID } from "@/constants/tenant";
import { defaultBranchIdForTenant } from "@/constants/branch";

export { DEFAULT_TENANT_ID };
export { defaultBranchIdForTenant };

/** Ambient read of "which tenant's data is currently in view" (the header tenant switcher). */
export function getCurrentTenantId(): string {
  return useAuthStore.getState().activeTenantId ?? DEFAULT_TENANT_ID;
}

/** Ambient read of "which branch of the active tenant is currently in view" — same style as getCurrentTenantId(). */
export function getCurrentBranchId(): string {
  return useAuthStore.getState().activeBranchId ?? defaultBranchIdForTenant(getCurrentTenantId());
}
