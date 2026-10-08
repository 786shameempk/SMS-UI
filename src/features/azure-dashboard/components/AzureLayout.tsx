import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, BellRing, Boxes, ChartLine, Cloud, Container, Cpu, Database, HardDrive, LayoutDashboard, RefreshCw, Settings, Wallet, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { cn } from "@/utils/cn";
import { useAzureOverview, useRefreshAzure } from "../hooks";
import { relativeTime } from "../utils";

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const GROUPS: Array<{ title: string; items: NavEntry[] }> = [
  { title: "Overview", items: [{ to: "/admin/azure", label: "Overview", icon: LayoutDashboard, end: true }] },
  { title: "Cost Management", items: [{ to: "/admin/azure/cost", label: "Cost & forecast", icon: Wallet }] },
  {
    title: "Infrastructure",
    items: [
      { to: "/admin/azure/resources", label: "Resources", icon: Boxes },
      { to: "/admin/azure/compute", label: "Virtual machines", icon: Cpu },
      { to: "/admin/azure/databases", label: "SQL databases", icon: Database },
      { to: "/admin/azure/storage", label: "Storage", icon: HardDrive },
      { to: "/admin/azure/containers", label: "Container registry", icon: Container },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { to: "/admin/azure/monitoring", label: "Metrics & health", icon: ChartLine },
      { to: "/admin/azure/alerts", label: "Alerts", icon: BellRing },
    ],
  },
  { title: "Settings", items: [{ to: "/admin/azure/settings", label: "Azure setup", icon: Settings }] },
];

/** The Azure Infrastructure area: a header with the subscription and Refresh, a section nav, and the routed page. */
export default function AzureLayout() {
  const overview = useAzureOverview();
  const refresh = useRefreshAzure();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const subscription = overview.data?.subscription.data;
  const alerts = overview.data?.alerts.data?.length ?? 0;
  const updatedAt = overview.dataUpdatedAt ? new Date(overview.dataUpdatedAt).toISOString() : null;

  return (
    <PageContainer width="wide">
      <header className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground ring-1 ring-inset ring-primary/20">
            <Cloud className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-page-title">Azure Infrastructure</h1>
            <p className="truncate text-sm text-muted-foreground">
              {subscription ? (
                <>
                  <span className="font-medium text-foreground">{subscription.name ?? "Subscription"}</span>
                  {subscription.primaryLocation && <> · {subscription.primaryLocation}</>}
                  <span className="hidden sm:inline"> · {subscription.id}</span>
                </>
              ) : (
                "SchoolSphere hosting, cost and health"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {updatedAt ? `Last updated: ${relativeTime(updatedAt, now)}` : "Loading…"}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refresh()} loading={overview.isFetching}>
            {!overview.isFetching && <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <nav aria-label="Azure sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-5 lg:overflow-visible lg:px-0 lg:pb-0">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex shrink-0 gap-1 lg:block lg:space-y-1">
              <p className="hidden px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground lg:block">{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                  {item.to.endsWith("/alerts") && alerts > 0 && (
                    <Badge variant="danger" className="ml-auto px-1.5">{alerts}</Badge>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
          <p className="hidden items-center gap-1.5 px-2 text-[11px] text-muted-foreground lg:flex">
            <Activity className="h-3 w-3" aria-hidden="true" /> Read-only · refreshes every 5 min
          </p>
        </nav>

        <main className="min-w-0 space-y-6">
          <Outlet />
        </main>
      </div>
    </PageContainer>
  );
}
