import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AzureCard, QueryBoundary } from "../components/AzureUi";
import { useAzureAlerts } from "../hooks";

export default function AzureAlertsPage() {
  const alerts = useAzureAlerts();

  return (
    <AzureCard title="Alerts" description="Generated from live Azure readings: CPU and storage above 70% / 90%, stopped VMs, unhealthy resources and the monitoring budget">
      <QueryBoundary query={alerts} title="Alerts" isEmpty={(d) => d.length === 0} emptyTitle="All clear" emptyDescription="No resource is over its warning thresholds.">
        {(data) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={`${a.resource}-${a.category}-${a.message}`}>
                  <TableCell><Badge variant={a.severity === "Critical" ? "danger" : "warning"} dot>{a.severity}</Badge></TableCell>
                  <TableCell className="font-medium">{a.resource}</TableCell>
                  <TableCell className="text-muted-foreground">{a.category}</TableCell>
                  <TableCell>{a.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryBoundary>
    </AzureCard>
  );
}
