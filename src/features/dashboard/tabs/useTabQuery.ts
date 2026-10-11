import { useQuery } from "@tanstack/react-query";
import { getApiErrorStatus } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import type { DashboardDataSource } from "../dataSource";
import type { DashboardDateRange } from "../types";

/**
 * One tab's data. The key starts with ["dashboard", source, …] like every dashboard query, so the page's Refresh
 * button and "Updated … ago" cover it, and carries who is looking and at which school and branch, so switching
 * user or branch never shows another scope's cached figures.
 */
export function useTabQuery<T>(
  source: DashboardDataSource,
  name: string,
  dateRange: DashboardDateRange | null,
  live: () => Promise<T>,
  mock: () => T,
) {
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const branchId = useAuthStore((s) => s.activeBranchId);
  return useQuery<T>({
    queryKey: ["dashboard", source, user?.id ?? "anon", user?.role ?? "none", tenantId, branchId, "tab", name, dateRange],
    queryFn: () => (source === "mock" ? Promise.resolve(mock()) : live()),
    staleTime: 2 * 60_000,
    retry: (count, error) => count < 1 && ![401, 403].includes(getApiErrorStatus(error) ?? 0),
  });
}
