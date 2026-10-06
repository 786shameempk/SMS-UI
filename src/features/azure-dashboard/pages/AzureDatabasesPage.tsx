import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AzureCard, KeyValue, QueryBoundary, UsageBar } from "../components/AzureUi";
import { useAzureCost, useAzureDatabases } from "../hooks";
import { downloadCsv, gb, money, percent, usagePercent } from "../utils";

export default function AzureDatabasesPage() {
  const sql = useAzureDatabases();
  const currency = useAzureCost().data?.currency ?? "";

  return (
    <QueryBoundary query={sql} title="Azure SQL data" isEmpty={(d) => d.servers.length === 0} emptyTitle="No SQL servers" emptyDescription="No Azure SQL server was found in this subscription." rows={4}>
      {(data) => (
        <div className="space-y-6">
          {data.pools.map((pool) => (
            <AzureCard
              key={pool.id}
              title={`Elastic pool · ${pool.name}`}
              description={`${pool.server} · ${pool.tier ?? pool.sku ?? "unknown tier"}${pool.capacity ? ` · ${pool.capacity} ${pool.sku?.toLowerCase().includes("pool") ? "eDTU/vCore" : "units"}` : ""}`}
              actions={<Badge variant="brand">{pool.databaseCount} database{pool.databaseCount === 1 ? "" : "s"}</Badge>}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <UsageBar value={pool.cpuPercent} label="CPU" />
                  <UsageBar value={usagePercent(pool.storageUsedGb, pool.storageLimitGb)} label="Storage" detail={`${gb(pool.storageUsedGb)} / ${gb(pool.storageLimitGb)}`} />
                  <UsageBar value={pool.dataIoPercent} label="Data IO" />
                  <UsageBar value={pool.logIoPercent} label="Log IO" />
                </div>
                <dl className="grid grid-cols-2 gap-4 content-start">
                  <KeyValue label="Cost this month">{money(pool.monthCost, currency)}</KeyValue>
                  <KeyValue label="Region">{pool.location}</KeyValue>
                  <div className="col-span-2">
                    <KeyValue label="Databases in the pool">
                      <span className="flex flex-wrap gap-1.5">{pool.databases.length === 0 ? "None" : pool.databases.map((n) => <Badge key={n} variant="neutral">{n}</Badge>)}</span>
                    </KeyValue>
                  </div>
                </dl>
              </div>
            </AzureCard>
          ))}

          <AzureCard
            title="Databases"
            description="Single and pooled databases, discovered from Azure"
            actions={
              <Button
                variant="outline"
                size="sm"
                disabled={data.databases.length === 0}
                onClick={() => downloadCsv("azure-databases.csv", [["Database", "Server", "Tier", "Pool", "Storage used (GB)", "Storage limit (GB)", "CPU %", "Data IO %", "Log IO %", `Month cost (${currency})`], ...data.databases.map((d) => [d.name, d.server, d.tier, d.elasticPool, d.storageUsedGb, d.storageLimitGb, d.cpuPercent, d.dataIoPercent, d.logIoPercent, d.monthCost])])}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            }
          >
            {data.databases.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No databases on these servers.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Pool</TableHead>
                    <TableHead className="min-w-44">Storage</TableHead>
                    <TableHead className="text-right">CPU</TableHead>
                    <TableHead className="text-right">Data IO</TableHead>
                    <TableHead className="text-right">Log IO</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.databases.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.server}</TableCell>
                      <TableCell>{d.tier ?? d.sku ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{d.elasticPool ?? "—"}</TableCell>
                      <TableCell><UsageBar value={usagePercent(d.storageUsedGb, d.storageLimitGb)} detail={`${gb(d.storageUsedGb)} / ${gb(d.storageLimitGb)}`} /></TableCell>
                      <TableCell className="text-right tabular-nums">{percent(d.cpuPercent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{percent(d.dataIoPercent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{percent(d.logIoPercent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(d.monthCost, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AzureCard>

          <AzureCard title="SQL servers">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Databases</TableHead>
                  <TableHead className="text-right">Pools</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.servers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.location ?? "—"}</TableCell>
                    <TableCell>{s.state ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.databaseCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.poolCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AzureCard>
        </div>
      )}
    </QueryBoundary>
  );
}
