/**
 * Dependency-free by design, same reason as constants/tenant.ts: authStore.ts needs this to
 * compute a valid activeBranchId at login/tenant-switch time without importing the (much
 * heavier) branches feature module, which would create a circular import back through
 * utils/tenant.ts. A branch's "main campus" id is a pure, deterministic convention derived
 * from its tenant id, not a lookup into any stored data.
 */
export function defaultBranchIdForTenant(tenantId: string): string {
  return `${tenantId}-main`;
}
