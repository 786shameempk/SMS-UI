import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { formatDateTime } from "@/utils/format";
import { AzureCard, HealthBadge, QueryBoundary } from "../components/AzureUi";
import MetricExplorer from "../components/MetricExplorer";
import { useAzureHealth, useAzureResources } from "../hooks";

export default function AzureMonitoringPage() {
  const resources = useAzureResources();
  const health = useAzureHealth();
  const [selected, setSelected] = useState("");

  const options = resources.data ?? [];
  const resourceId = selected || options.find((r) => /virtualmachines|elasticpools|storageaccounts/i.test(r.type))?.id || options[0]?.id || "";

  return (
    <div className="space-y-6">
      <AzureCard title="Metrics" description="Pick any resource and a metric Azure Monitor exposes for it">
        <QueryBoundary query={resources} title="Resources" isEmpty={(d) => d.length === 0} emptyTitle="No resources to monitor">
          {(data) => (
            <div className="space-y-4">
              <Select value={resourceId} onValueChange={setSelected}>
                <SelectTrigger className="w-full sm:w-96" aria-label="Resource">
                  <SelectValue placeholder="Choose a resource" />
                </SelectTrigger>
                <SelectContent>
                  {data.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} · {r.typeLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MetricExplorer key={resourceId} resourceId={resourceId} />
            </div>
          )}
        </QueryBoundary>
      </AzureCard>

      <AzureCard title="Resource health" description="From Azure Resource Health - resources it doesn't cover show as Unknown">
        <QueryBoundary query={health} title="Resource health" isEmpty={(d) => d.resources.length === 0} emptyTitle="No health information" emptyDescription="Azure returned no availability statuses.">
          {(h) => (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Healthy" value={h.healthy} tone="success" />
                <StatCard label="Warning" value={h.warning} tone="warning" />
                <StatCard label="Critical" value={h.critical} tone="danger" />
                <StatCard label="Unknown" value={h.unknown} tone="neutral" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {h.resources.map((r) => (
                    <TableRow key={r.resourceId}>
                      <TableCell className="font-medium">{r.resourceName}</TableCell>
                      <TableCell><HealthBadge state={r.state} /></TableCell>
                      <TableCell className="max-w-md text-muted-foreground">{r.summary ?? r.azureState}</TableCell>
                      <TableCell className="text-muted-foreground">{r.since ? formatDateTime(r.since) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </QueryBoundary>
      </AzureCard>
    </div>
  );
}
