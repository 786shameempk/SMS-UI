import { Badge } from "@/components/ui/badge";
import { AzureCard, KeyValue, QueryBoundary } from "../components/AzureUi";
import { useAzureOverview } from "../hooks";

/** Read-only: how the dashboard reaches Azure, and the access it needs. Nothing here can change Azure. */
export default function AzureSettingsPage() {
  const overview = useAzureOverview();

  return (
    <div className="space-y-6">
      <AzureCard title="Connected subscription">
        <QueryBoundary query={overview} title="Subscription" rows={2}>
          {(d) =>
            d.subscription.available && d.subscription.data ? (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <KeyValue label="Name">{d.subscription.data.name}</KeyValue>
                <KeyValue label="State"><Badge variant={d.subscription.data.state === "Enabled" ? "success" : "warning"} dot>{d.subscription.data.state ?? "Unknown"}</Badge></KeyValue>
                <KeyValue label="Main region">{d.subscription.data.primaryLocation}</KeyValue>
                <KeyValue label="Subscription ID"><code className="text-xs">{d.subscription.data.id}</code></KeyValue>
                <KeyValue label="Tenant ID"><code className="text-xs">{d.subscription.data.tenantId}</code></KeyValue>
                <KeyValue label="Resources">{d.subscription.data.resourceCount} in {d.subscription.data.resourceGroupCount} groups</KeyValue>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                {d.subscription.error ?? "Not connected."} Set <code>AZURE_SUBSCRIPTION_ID</code> on the server and make sure the identity below has access.
              </p>
            )
          }
        </QueryBoundary>
      </AzureCard>

      <AzureCard title="How it connects" description="No Azure secret is stored anywhere in SchoolSphere">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>The AuthService backend signs in to Azure with <strong className="text-foreground">DefaultAzureCredential</strong> - the VM&apos;s system-assigned managed identity in production, <code>az login</code> locally.</li>
          <li>This page only talks to SchoolSphere&apos;s own API. Azure tokens and raw Azure responses never reach the browser.</li>
          <li>Everything is read-only: nothing here can start, stop, resize or delete a resource.</li>
          <li>Reads are cached on the server (cost 30 min, resources 15 min, metrics and health 5 min), so refreshing never hammers Azure.</li>
        </ul>
      </AzureCard>

      <AzureCard title="Required access" description="Assign these to the VM's managed identity, at subscription scope">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KeyValue label="Reader"><span>Resources, VMs, SQL, storage, registry, health and metrics.</span></KeyValue>
          <KeyValue label="Cost Management Reader"><span>Month-to-date cost, forecast and cost by resource.</span></KeyValue>
          <KeyValue label="Container Registry Repository Reader (optional)"><span>Repository and tag lists. Scope it to the registry only.</span></KeyValue>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Owner and Contributor are not needed and should not be granted.</p>
      </AzureCard>
    </div>
  );
}
