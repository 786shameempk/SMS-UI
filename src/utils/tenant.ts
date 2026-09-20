import { useAuthStore } from "@/store/authStore";
import { DEFAULT_TENANT_ID } from "@/constants/tenant";
import { defaultBranchIdForTenant } from "@/constants/branch";

export { DEFAULT_TENANT_ID };
export { defaultBranchIdForTenant };

/** Ambient read of "which tenant's data is currently in view" — same style every api.ts already uses for localStorage. */
export function getCurrentTenantId(): string {
  return useAuthStore.getState().activeTenantId ?? DEFAULT_TENANT_ID;
}

/** Ambient read of "which branch of the active tenant is currently in view" — same style as getCurrentTenantId(). */
export function getCurrentBranchId(): string {
  return useAuthStore.getState().activeBranchId ?? defaultBranchIdForTenant(getCurrentTenantId());
}

/**
 * For pre-existing browser data only: fills in a missing tenantId on records saved before this
 * migration existed. Freshly-seeded data should be stamped explicitly at its own seed call site
 * instead of relying on this — keeps "this predates multi-tenancy" and "this is today's seed"
 * distinct, so a future real second-tenant seed forgetting to stamp tenantId is loud (a console
 * warning), not silently folded into the default tenant's bucket.
 */
export function migrateLegacyRecordsToDefaultTenant<T extends { tenantId?: string }>(records: T[]): (T & { tenantId: string })[] {
  let backfilledCount = 0;
  const result = records.map((r) => {
    if (r.tenantId) return r as T & { tenantId: string };
    backfilledCount += 1;
    return { ...r, tenantId: DEFAULT_TENANT_ID };
  });
  if (backfilledCount > 0) {
    console.warn(`[tenant] Backfilled ${backfilledCount} pre-existing record(s) with no tenantId to "${DEFAULT_TENANT_ID}".`);
  }
  return result;
}

export function scopedToCurrentTenant<T extends { tenantId: string }>(records: T[]): T[] {
  const tenantId = getCurrentTenantId();
  return records.filter((r) => r.tenantId === tenantId);
}

/**
 * For pre-existing data that already has a tenantId but predates branches: fills in a missing
 * branchId using that record's *own* tenant's default branch, not a single global default —
 * records may already span more than one tenant (from the earlier tenant retrofit), each
 * needing its own tenant's "main campus" id, not necessarily the currently active tenant's.
 */
export function migrateLegacyRecordsToDefaultBranch<T extends { tenantId: string; branchId?: string }>(
  records: T[],
): (T & { branchId: string })[] {
  let backfilledCount = 0;
  const result = records.map((r) => {
    if (r.branchId) return r as T & { branchId: string };
    backfilledCount += 1;
    return { ...r, branchId: defaultBranchIdForTenant(r.tenantId) };
  });
  if (backfilledCount > 0) {
    console.warn(`[branch] Backfilled ${backfilledCount} pre-existing record(s) with no branchId to their tenant's default branch.`);
  }
  return result;
}

/** Filters by branch alone — used within the branches module itself, which already scopes by tenant separately. */
export function scopedToCurrentBranch<T extends { branchId: string }>(records: T[]): T[] {
  const branchId = getCurrentBranchId();
  return records.filter((r) => r.branchId === branchId);
}

export function scopedToCurrentTenantAndBranch<T extends { tenantId: string; branchId: string }>(records: T[]): T[] {
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  return records.filter((r) => r.tenantId === tenantId && r.branchId === branchId);
}

// ── Settings backup/restore/reset — generic, module-agnostic tenant scoping ──
// These work directly on raw localStorage rather than importing every module's api.ts, since
// their whole job is operating across all of them uniformly. A key is treated as one of three
// shapes: a known per-tenant singleton map (TENANT_MAP_KEYS, keyed by tenantId), an array of
// tenant-tagged records (anything else under sms-mock-*/sms-settings- whose parsed value is an
// array), or a global key untouched by tenant scoping (GLOBAL_KEYS, plus any "*-seeded" bootstrap
// flag). Anything that doesn't match one of these shapes is skipped rather than guessed at, since
// exporting/merging the wrong shape risks leaking or corrupting another tenant's data.

const GLOBAL_KEYS = new Set(["sms-mock-password-overrides"]);

function isGlobalKey(key: string): boolean {
  return GLOBAL_KEYS.has(key) || key.endsWith("-seeded");
}

/** Settings' singleton values, stored as Record<tenantId, T> once tenant-scoped. */
const TENANT_MAP_KEYS = new Set([
  "sms-mock-settings-profile",
  "sms-mock-settings-localization",
  "sms-mock-settings-branding",
  "sms-mock-settings-radius",
  "sms-mock-settings-density",
]);

function isTenantTaggedArray(value: unknown): value is Array<{ tenantId?: string }> {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && "tenantId" in item);
}

function relevantKeys(): string[] {
  return Object.keys(localStorage).filter((k) => k.startsWith("sms-mock-") || k.startsWith("sms-settings-"));
}

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function exportTenantSnapshot(): Record<string, unknown> {
  const tenantId = getCurrentTenantId();
  const snapshot: Record<string, unknown> = {};
  for (const key of relevantKeys()) {
    if (isGlobalKey(key)) continue;
    const parsed = readJson(key);
    if (parsed === undefined) continue;

    if (TENANT_MAP_KEYS.has(key)) {
      const map = parsed as Record<string, unknown>;
      if (tenantId in map) snapshot[key] = { [tenantId]: map[tenantId] };
      continue;
    }
    if (isTenantTaggedArray(parsed)) {
      snapshot[key] = parsed.filter((item) => item.tenantId === tenantId);
    }
  }
  return snapshot;
}

/** Replaces only the current tenant's rows within each key — other tenants' rows in the same key are left untouched. */
export function mergeTenantSnapshot(data: Record<string, unknown>): void {
  const tenantId = getCurrentTenantId();
  for (const [key, value] of Object.entries(data)) {
    if (!(key.startsWith("sms-mock-") || key.startsWith("sms-settings-")) || isGlobalKey(key)) continue;

    if (TENANT_MAP_KEYS.has(key)) {
      const existing = (readJson(key) as Record<string, unknown>) ?? {};
      const incoming = value as Record<string, unknown>;
      if (tenantId in incoming) existing[tenantId] = incoming[tenantId];
      localStorage.setItem(key, JSON.stringify(existing));
      continue;
    }
    if (Array.isArray(value)) {
      const existing = (readJson(key) as Array<{ tenantId?: string }>) ?? [];
      const others = existing.filter((item) => item?.tenantId !== tenantId);
      const incoming = (value as Array<{ tenantId?: string }>).filter((item) => item?.tenantId === tenantId);
      localStorage.setItem(key, JSON.stringify([...others, ...incoming]));
    }
  }
}

/**
 * Clears only the current tenant's own rows. `*-seeded` bootstrap flags are only cleared when
 * resetting the default tenant (so its demo data reseeds on reload) — any other tenant never had
 * seed data to begin with, so resetting it just leaves it empty, which is correct.
 */
export function resetCurrentTenantData(): void {
  const tenantId = getCurrentTenantId();
  for (const key of relevantKeys()) {
    if (key.startsWith("sms-mock-settings-")) continue; // settings/audit/backup-history preserved, same as before tenant-scoping
    if (isGlobalKey(key)) {
      if (key.endsWith("-seeded") && tenantId === DEFAULT_TENANT_ID) localStorage.removeItem(key);
      continue;
    }
    const parsed = readJson(key);
    if (parsed === undefined) continue;

    if (TENANT_MAP_KEYS.has(key)) {
      const map = parsed as Record<string, unknown>;
      delete map[tenantId];
      localStorage.setItem(key, JSON.stringify(map));
      continue;
    }
    if (isTenantTaggedArray(parsed)) {
      const remaining = parsed.filter((item) => item.tenantId !== tenantId);
      localStorage.setItem(key, JSON.stringify(remaining));
    }
  }
}
