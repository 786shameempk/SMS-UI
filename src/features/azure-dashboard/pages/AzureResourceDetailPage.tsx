import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AzureCard, HealthBadge, KeyValue, QueryBoundary } from "../components/AzureUi";
import MetricExplorer from "../components/MetricExplorer";
import { useAzureCost, useAzureResource } from "../hooks";
import { money } from "../utils";

export default function AzureResourceDetailPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const resource = useAzureResource(id);
  const currency = useAzureCost().data?.currency ?? "";

  return (
    <div className="space-y-6">
      <Link to="/admin/azure/resources" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All resources
      </Link>

      <QueryBoundary query={resource} title="Resource" rows={4}>
        {(r) => (
          <>
            <AzureCard
              title={r.name}
              description={r.typeLabel}
              actions={<HealthBadge state={r.status} />}
            >
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <KeyValue label="Resource group">{r.resourceGroup}</KeyValue>
                <KeyValue label="Region">{r.location}</KeyValue>
                <KeyValue label="SKU">{r.sku}</KeyValue>
                <KeyValue label="Kind">{r.kind}</KeyValue>
                <KeyValue label="Cost this month">{money(r.monthCost, currency)}</KeyValue>
                <KeyValue label="Type">{r.type}</KeyValue>
                <div className="sm:col-span-2 lg:col-span-3"><KeyValue label="Resource ID"><code className="break-all text-xs">{r.id}</code></KeyValue></div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <KeyValue label="Tags">
                    {Object.keys(r.tags).length === 0 ? "None" : (
                      <span className="flex flex-wrap gap-1.5">
                        {Object.entries(r.tags).map(([k, v]) => <Badge key={k} variant="neutral">{k}: {v}</Badge>)}
                      </span>
                    )}
                  </KeyValue>
                </div>
              </dl>
            </AzureCard>

            <AzureCard title="Metrics" description="Platform metrics from Azure Monitor">
              <MetricExplorer resourceId={r.id} />
            </AzureCard>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
