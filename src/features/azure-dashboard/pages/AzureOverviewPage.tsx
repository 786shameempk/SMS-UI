import { Link } from "react-router-dom";
import { Boxes, Container, Cpu, Database, HardDrive, HeartPulse, Info, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { azureErrorMessage } from "../api";
import { AzureCard, HealthBadge, SectionBoundary, UsageBar } from "../components/AzureUi";
import CostChart from "../components/CostChart";
import { useAzureOverview } from "../hooks";
import { gb, money, percent, usagePercent } from "../utils";

export default function AzureOverviewPage() {
  const query = useAzureOverview();
  const loading = query.isPending;
  const d = query.data;
  const retry = () => void query.refetch();

  if (query.isError) {
    return <ErrorState title="Azure dashboard unavailable" description={azureErrorMessage(query.error)} onRetry={retry} retrying={query.isFetching} />;
  }

  const cost = d?.cost.data;
  const health = d?.health.data;
  const currency = cost?.currency ?? "";
  const budget = cost?.monthlyBudget ?? null;
  const budgetUsed = budget && cost ? (cost.monthToDate / budget) * 100 : null;

  return (
    <div className="space-y-6">
      <section aria-label="Cost summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="This month"
          icon={Wallet}
          tone="brand"
          loading={loading}
          value={d && !d.cost.available ? "Unavailable" : money(cost?.monthToDate, currency)}
          hint={cost?.previousMonth != null ? `Last month ${money(cost.previousMonth, currency)}` : d?.cost.error ?? undefined}
        />
        <StatCard
          label="Today"
          icon={TrendingUp}
          tone="info"
          loading={loading}
          value={d && !d.cost.available ? "Unavailable" : money(cost?.today, currency)}
          hint={cost?.yesterday != null ? `Yesterday ${money(cost.yesterday, currency)}` : "Azure reports cost with a delay"}
        />
        <StatCard
          label="Forecast"
          icon={PiggyBank}
          tone="warning"
          loading={loading}
          value={cost?.forecast != null ? money(cost.forecast, currency) : "Not available"}
          hint={cost?.forecast != null ? "Projected month total (Azure)" : "Azure can't forecast yet"}
        />
        <StatCard
          label="Azure credit remaining"
          icon={Info}
          tone="neutral"
          loading={loading}
          value="Unavailable"
          hint="Credit balance isn't exposed through this API"
        />
      </section>

      {budget && budgetUsed !== null && (
        <AzureCard title="Monitoring budget" description="Your own limit for alerts - not an Azure billing budget.">
          <UsageBar value={budgetUsed} label={`${money(cost?.monthToDate, currency)} of ${money(budget, currency)}`} />
        </AzureCard>
      )}

      <section aria-label="Resource summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Resources" icon={Boxes} tone="brand" loading={loading} value={d?.resources.data?.total ?? (d ? "—" : "")} hint={d?.subscription.data ? `${d.subscription.data.resourceGroupCount} resource groups` : d?.resources.error ?? undefined} />
        <StatCard
          label="Health"
          icon={HeartPulse}
          tone={health && (health.critical > 0 ? "danger" : health.warning > 0 ? "warning" : "success") || "neutral"}
          loading={loading}
          value={health ? `${health.healthy} healthy` : d ? "Unavailable" : ""}
          hint={health ? `${health.warning} warning · ${health.critical} critical · ${health.unknown} unknown` : d?.health.error ?? undefined}
        />
        <StatCard
          label="SQL databases"
          icon={Database}
          tone="info"
          loading={loading}
          value={d?.sql.data ? d.sql.data.databaseCount : d ? "Unavailable" : ""}
          hint={d?.sql.data ? `${d.sql.data.poolCount} elastic pool${d.sql.data.poolCount === 1 ? "" : "s"} · CPU ${percent(d.sql.data.cpuPercent)}` : d?.sql.error ?? undefined}
        />
        <StatCard
          label="Blob storage"
          icon={HardDrive}
          tone="success"
          loading={loading}
          value={d?.storage.data ? gb(d.storage.data.usedGb) : d ? "Unavailable" : ""}
          hint={d?.storage.data ? `${d.storage.data.accountCount} account${d.storage.data.accountCount === 1 ? "" : "s"}` : d?.storage.error ?? undefined}
        />
      </section>

      <AzureCard title="Daily cost" description="Month to date, from Azure Cost Management">
        <SectionBoundary section={d?.cost} loading={loading} title="Cost data" onRetry={retry} rows={5}>
          {(c) => <CostChart data={c.daily} currency={c.currency} />}
        </SectionBoundary>
      </AzureCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AzureCard title="Compute" description="Virtual machines" actions={<Link to="/admin/azure/compute" className="text-sm font-medium text-primary-text hover:underline">Details</Link>}>
          <SectionBoundary section={d?.compute} loading={loading} title="Compute data" onRetry={retry}>
            {(c) => (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm"><Cpu className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{c.vmCount} VM{c.vmCount === 1 ? "" : "s"} · {c.running} running</div>
                <UsageBar value={c.averageCpuPercent} label="Average CPU (last hour)" />
              </div>
            )}
          </SectionBoundary>
        </AzureCard>

        <AzureCard title="SQL" description="Databases and elastic pools" actions={<Link to="/admin/azure/databases" className="text-sm font-medium text-primary-text hover:underline">Details</Link>}>
          <SectionBoundary section={d?.sql} loading={loading} title="SQL data" onRetry={retry}>
            {(s) => (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{s.databaseCount} database{s.databaseCount === 1 ? "" : "s"} on {s.serverCount} server{s.serverCount === 1 ? "" : "s"}</div>
                <UsageBar value={s.cpuPercent} label="CPU" />
                <UsageBar value={usagePercent(s.storageUsedGb, s.storageLimitGb)} label="Storage" detail={`${gb(s.storageUsedGb)} / ${gb(s.storageLimitGb)}`} />
              </div>
            )}
          </SectionBoundary>
        </AzureCard>

        <AzureCard title="Storage" actions={<Link to="/admin/azure/storage" className="text-sm font-medium text-primary-text hover:underline">Details</Link>}>
          <SectionBoundary section={d?.storage} loading={loading} title="Storage data" onRetry={retry}>
            {(s) => (
              <p className="flex items-center gap-2 text-sm"><HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{gb(s.usedGb)} used across {s.accountCount} account{s.accountCount === 1 ? "" : "s"}{s.containerCount != null && ` · ${s.containerCount} containers`}</p>
            )}
          </SectionBoundary>
        </AzureCard>

        <AzureCard title="Container registry" actions={<Link to="/admin/azure/containers" className="text-sm font-medium text-primary-text hover:underline">Details</Link>}>
          <SectionBoundary section={d?.containers} loading={loading} title="Registry data" onRetry={retry}>
            {(c) => (
              <p className="flex items-center gap-2 text-sm"><Container className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{c.registryCount} registr{c.registryCount === 1 ? "y" : "ies"} · {c.repositoryCount ?? "—"} repositories · {gb(c.storageGb)}</p>
            )}
          </SectionBoundary>
        </AzureCard>
      </div>

      <AzureCard title="Needs attention" description="Generated from live readings" actions={<Link to="/admin/azure/alerts" className="text-sm font-medium text-primary-text hover:underline">All alerts</Link>}>
        <SectionBoundary section={d?.alerts} loading={loading} title="Alerts" onRetry={retry}>
          {(alerts) =>
            alerts.length === 0 ? (
              <EmptyState size="sm" bare title="All clear" description="No resource is over its warning thresholds." />
            ) : (
              <ul className="divide-y divide-border/70">
                {alerts.slice(0, 5).map((a) => (
                  <li key={`${a.resource}-${a.message}`} className="flex items-start gap-3 py-2.5 text-sm">
                    <Badge variant={a.severity === "Critical" ? "danger" : "warning"} dot>{a.severity}</Badge>
                    <span className="min-w-0"><span className="font-medium">{a.resource}</span> <span className="text-muted-foreground">{a.message}</span></span>
                  </li>
                ))}
              </ul>
            )
          }
        </SectionBoundary>
      </AzureCard>

      {health && health.resources.length > 0 && (
        <AzureCard title="Resource health" description="From Azure Resource Health">
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {health.resources.slice(0, 9).map((r) => (
              <li key={r.resourceId} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                <span className="truncate">{r.resourceName}</span>
                <HealthBadge state={r.state} />
              </li>
            ))}
          </ul>
        </AzureCard>
      )}
    </div>
  );
}
