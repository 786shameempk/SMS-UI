import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorStatus } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { resolveDateRange } from "./dateRange";
import type { DashboardDataSource } from "./dataSource";
import { liveSource } from "./sources/live";
import { mockSource } from "./sources/mock";
import type { DashboardContext, DashboardSourceImpl, WidgetDataKey } from "./sources/types";
import type { DashboardData, DashboardDateRange } from "./types";

export const SOURCES: Record<DashboardDataSource, DashboardSourceImpl> = { live: liveSource, mock: mockSource };

/**
 * Every dashboard query starts with ["dashboard", source, …] and includes who is looking and at which school/
 * branch, so switching source, user, tenant or branch never shows another scope's cached figures.
 */
function useScopeKey(source: DashboardDataSource) {
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const branchId = useAuthStore((s) => s.activeBranchId);
  return ["dashboard", source, user?.id ?? "anon", user?.role ?? "none", tenantId, branchId] as const;
}

/** Who the viewer is in the school (their staff record, own student record or children). Loaded once per scope. */
export function useDashboardIdentity(source: DashboardDataSource) {
  const role = useAuthStore((s) => s.user?.role ?? "admin");
  const scopeKey = useScopeKey(source);
  return useQuery({
    queryKey: [...scopeKey, "identity"],
    queryFn: () => SOURCES[source].identity(role),
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

/** One widget's data. Disabled (never fetched) while hidden or until the identity it depends on is known. */
export function useDashboardWidget<K extends WidgetDataKey>(
  source: DashboardDataSource,
  key: K,
  options: { enabled: boolean; ctx: DashboardContext | null; dateRange: DashboardDateRange; refreshSeconds?: number },
) {
  const scopeKey = useScopeKey(source);
  const refreshMs = (options.refreshSeconds ?? 0) * 1000;
  return useQuery<DashboardData[K]>({
    // The learners in view are part of the key, so switching child never shows the other child's figures.
    queryKey: [...scopeKey, "widget", key, options.dateRange, options.ctx?.identity.learners.map((l) => l.studentId).join(",") ?? ""],
    queryFn: () => SOURCES[source].widgets[key](options.ctx!),
    enabled: options.enabled && options.ctx !== null,
    staleTime: refreshMs > 0 ? Math.min(refreshMs, 2 * 60_000) : 2 * 60_000,
    // Live widgets (bus status, notifications) poll while the page is visible; React Query pauses it offline.
    refetchInterval: refreshMs > 0 ? refreshMs : false,
    // One retry, then the card shows its own "Try again" - a dashboard shouldn't sit on skeletons for half a minute.
    // A refused request (401/403) won't succeed on retry.
    retry: (count, error) => count < 1 && !isAccessDenied(error),
  });
}

/** The server refused the data (signed out, or no permission for it). */
export function isAccessDenied(error: unknown): boolean {
  const status = getApiErrorStatus(error);
  return status === 401 || status === 403;
}

/**
 * When the oldest figure on the dashboard was fetched (0 = nothing yet), kept in sync with the query cache
 * so "Updated … ago" stays correct as widgets refresh on their own schedules.
 */
export function useDashboardUpdatedAt(source: DashboardDataSource): number {
  const cache = useQueryClient().getQueryCache();
  const [oldest, setOldest] = useState(0);
  useEffect(() => {
    const compute = () => {
      let min = 0;
      for (const q of cache.findAll({ queryKey: ["dashboard", source], type: "active" })) {
        const at = q.state.dataUpdatedAt;
        if (at > 0 && (min === 0 || at < min)) min = at;
      }
      setOldest(min);
    };
    compute();
    // Only fetch results move the timestamp; the cache's many other events (observers mounting, options
    // changing on every render) would re-render the page for nothing.
    return cache.subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success") compute();
      else if (event.type === "observerRemoved") compute();
    });
  }, [cache, source]);
  return oldest;
}

/** Builds the loader context once the identity is known. */
export function buildContext(
  user: { id: string; role: DashboardContext["role"] } | null,
  identity: DashboardContext["identity"] | undefined,
  dateRange: DashboardDateRange,
): DashboardContext | null {
  if (!user || !identity) return null;
  return { role: user.role, userId: user.id, identity, range: resolveDateRange(dateRange) };
}
