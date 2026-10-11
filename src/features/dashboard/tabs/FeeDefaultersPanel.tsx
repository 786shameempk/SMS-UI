import { useAuthStore } from "@/store/authStore";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import type { DashboardDataSource } from "../dataSource";
import type { DashboardDateRange } from "../types";
import { FeeDefaultersCard } from "../components/RoleWidgets";
import { buildContext, useDashboardIdentity, useDashboardWidget } from "../useDashboard";

/**
 * The Overview's "Fee defaulters" card, reused so names and balances match it exactly. It needs the dashboard
 * context (who is looking, which students exist), so it builds its own rather than asking the page for it.
 */
export default function FeeDefaultersPanel({ source, dateRange }: { source: DashboardDataSource; dateRange: DashboardDateRange }) {
  const user = useAuthStore((s) => s.user);
  const identity = useDashboardIdentity(source);
  const ctx = buildContext(user, identity.data, dateRange);
  const defaulters = useDashboardWidget(source, "feeDefaulters", { enabled: true, ctx, dateRange });
  if (defaulters.isError) return <ErrorState size="sm" onRetry={() => defaulters.refetch()} retrying={defaulters.isRefetching} />;
  if (!defaulters.data) return <Skeleton className="h-64 rounded-xl" />;
  return <FeeDefaultersCard defaulters={defaulters.data} />;
}
