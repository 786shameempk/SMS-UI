import { networkFailureCount } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { table } from "./storage";

/**
 * Last-known answers (rosters, registers, class lists) kept on this device so a register can be taken without a
 * connection. Rows belong to one signed-in person and one school/branch, and are deleted when they sign out or someone
 * else signs in (see purge.ts). Never holds tokens.
 */
interface CacheRow {
  id: string;
  userId: string;
  key: string;
  savedAt: number;
  value: unknown;
}

const cache = table<CacheRow>("cache");

/** Who and where the data belongs to; null when nobody is signed in (nothing is read or kept then). */
export function currentScope(): { userId: string; scope: string } | null {
  const { user, activeTenantId, activeBranchId } = useAuthStore.getState();
  return user ? { userId: user.id, scope: `${user.id}|${activeTenantId}|${activeBranchId}` } : null;
}

export async function readCached<T>(key: string): Promise<{ value: T; savedAt: number } | undefined> {
  const who = currentScope();
  if (!who) return undefined;
  const row = await cache.get(`${who.scope}|${key}`).catch(() => undefined);
  return row ? { value: row.value as T, savedAt: row.savedAt } : undefined;
}

export async function writeCached(key: string, value: unknown): Promise<void> {
  const who = currentScope();
  if (!who) return;
  const id = `${who.scope}|${key}`;
  await cache.put(id, { id, userId: who.userId, key, savedAt: Date.now(), value }).catch(() => undefined);
}

/** Deletes every saved answer, or only those of people other than `keepUserId`. */
export async function purgeCache(keepUserId?: string): Promise<void> {
  if (!keepUserId) return cache.clear().catch(() => undefined);
  const rows = await cache.all().catch(() => [] as CacheRow[]);
  await Promise.all(rows.filter((r) => r.userId !== keepUserId).map((r) => cache.delete(r.id).catch(() => undefined)));
}

export interface OfflineResult<T> {
  value: T;
  /** Set when the answer is the saved copy from this time, because the server could not be reached. */
  fromDevice?: number;
}

/**
 * Runs `fetcher`; when it fails because the server could not be reached, answers from the saved copy instead (and
 * says so). A refusal from the server (403, 404...) is never replaced by old data. Successful answers are saved.
 */
export async function withDeviceFallback<T>(key: string, fetcher: () => Promise<T>): Promise<OfflineResult<T>> {
  const failuresBefore = networkFailureCount();
  try {
    const value = await fetcher();
    void writeCached(key, value);
    return { value };
  } catch (err) {
    const unreachable = !navigator.onLine || networkFailureCount() !== failuresBefore;
    if (unreachable) {
      const saved = await readCached<T>(key);
      if (saved) return { value: saved.value, fromDevice: saved.savedAt };
    }
    throw err;
  }
}
