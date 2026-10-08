import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/useUiStore";
import { resolveDateRange } from "../dateRange";
import type { DashboardDataSource } from "../dataSource";
import type { DashboardDateRange } from "../types";
import { SOURCES } from "../useDashboard";
import ScopeOverview from "./ScopeOverview";

/** The branch roll-up. Aggregated ignores the header branch (every branch of the active school); segregated is just that branch. */
export default function ScopeOverviewWidget({
  source,
  dateRange,
  rangeLabel,
}: {
  source: DashboardDataSource;
  dateRange: DashboardDateRange;
  rangeLabel: string;
}) {
  const scopeView = useUiStore((s) => s.dashboardScopeView);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const scope = useQuery({
    queryKey: ["dashboard", source, "scope", scopeView, activeTenantId, scopeView === "segregated" ? activeBranchId : null, dateRange],
    queryFn: () => SOURCES[source].scope(scopeView, activeTenantId, activeBranchId, resolveDateRange(dateRange)),
    retry: 1,
  });
  return <ScopeOverview summary={scope.data} view={scopeView} isLoading={scope.isLoading} isError={scope.isError} rangeLabel={rangeLabel} />;
}
