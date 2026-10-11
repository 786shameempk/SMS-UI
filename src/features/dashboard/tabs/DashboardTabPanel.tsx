/* oxlint-disable react/only-export-components -- a lazy-component registry, like registry.tsx */
import { lazy, Suspense, type ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardTabId } from "./catalog";
import type { TabProps } from "./ui";

/**
 * Each tab is its own chunk, so the charts and cards of a tab the viewer never opens are never downloaded.
 * ("overview" is not here: it is the page's widget grid.)
 */
const TAB_COMPONENTS: Record<Exclude<DashboardTabId, "overview">, ComponentType<TabProps>> = {
  executive: lazy(() => import("./ExecutiveTab")),
  finance: lazy(() => import("./FinanceTab")),
  admissions: lazy(() => import("./AdmissionsTab")),
  campus: lazy(() => import("./CampusTab")),
  engagement: lazy(() => import("./EngagementTab")),
  teacher: lazy(() => import("./TeacherTab")),
  hr: lazy(() => import("./HrTab")),
  academics: lazy(() => import("./AcademicsTab")),
};

export default function DashboardTabPanel({ tab, ...props }: TabProps & { tab: Exclude<DashboardTabId, "overview"> }) {
  const Tab = TAB_COMPONENTS[tab];
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Tab {...props} />
    </Suspense>
  );
}
