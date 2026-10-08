import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/utils/format";
import { AzureCard, KeyValue, QueryBoundary } from "../components/AzureUi";
import { useAzureContainers, useAzureCost } from "../hooks";
import { gb, money } from "../utils";

export default function AzureContainersPage() {
  const registries = useAzureContainers();
  const currency = useAzureCost().data?.currency ?? "";

  return (
    <QueryBoundary query={registries} title="Container registry data" isEmpty={(d) => d.length === 0} emptyTitle="No container registries" emptyDescription="No Azure Container Registry was found in this subscription." rows={4}>
      {(data) => (
        <div className="space-y-6">
          {data.map((r) => (
            <AzureCard key={r.id} title={r.name} description={`${r.sku ?? "Unknown SKU"} · ${r.location ?? "unknown region"}${r.loginServer ? ` · ${r.loginServer}` : ""}`}>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KeyValue label="Repositories">{r.repositoryCount ?? "—"}</KeyValue>
                <KeyValue label="Images (tags)">{r.imageCount ?? "—"}</KeyValue>
                <KeyValue label="Storage">{gb(r.storageGb)}</KeyValue>
                <KeyValue label="Cost this month">{money(r.monthCost, currency)}</KeyValue>
              </dl>

              {r.repositoriesNote && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-sm text-info-strong">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {r.repositoriesNote}
                </p>
              )}

              {r.repositories.length > 0 && (
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Repository</TableHead>
                        <TableHead>Latest tag</TableHead>
                        <TableHead className="text-right">Tags</TableHead>
                        <TableHead>Last updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.repositories.map((repo) => (
                        <TableRow key={repo.name}>
                          <TableCell className="font-medium">{repo.name}</TableCell>
                          <TableCell>{repo.latestTag ? <Badge variant="neutral">{repo.latestTag}</Badge> : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{repo.tagCount ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{repo.lastUpdated ? formatDateTime(repo.lastUpdated) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </AzureCard>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}
