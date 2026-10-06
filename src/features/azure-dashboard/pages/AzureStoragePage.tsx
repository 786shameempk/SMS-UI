import { Badge } from "@/components/ui/badge";
import { AzureCard, KeyValue, QueryBoundary } from "../components/AzureUi";
import { useAzureCost, useAzureStorage } from "../hooks";
import { gb, money } from "../utils";

export default function AzureStoragePage() {
  const storage = useAzureStorage();
  const currency = useAzureCost().data?.currency ?? "";

  return (
    <QueryBoundary query={storage} title="Storage data" isEmpty={(d) => d.length === 0} emptyTitle="No storage accounts" emptyDescription="No storage account was found in this subscription." rows={4}>
      {(accounts) => (
        <div className="space-y-6">
          {accounts.map((a) => (
            <AzureCard key={a.id} title={a.name} description={`${a.sku ?? "Unknown SKU"} · ${a.kind ?? "storage"} · ${a.location ?? "unknown region"}`}>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KeyValue label="Used">{gb(a.usedGb)}</KeyValue>
                <KeyValue label="Blob data">{gb(a.blobGb)}</KeyValue>
                <KeyValue label="Blobs">{a.blobCount?.toLocaleString() ?? "—"}</KeyValue>
                <KeyValue label="Cost this month">{money(a.monthCost, currency)}</KeyValue>
                <div className="sm:col-span-2 lg:col-span-4">
                  <KeyValue label={`Containers${a.containerCount != null ? ` (${a.containerCount})` : ""}`}>
                    {a.containers.length === 0 ? "None listed" : <span className="flex flex-wrap gap-1.5">{a.containers.map((c) => <Badge key={c} variant="neutral">{c}</Badge>)}</span>}
                  </KeyValue>
                </div>
              </dl>
            </AzureCard>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}
