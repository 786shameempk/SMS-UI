import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { AzureCard, KeyValue, QueryBoundary, UsageBar } from "../components/AzureUi";
import { useAzureCost, useAzureVirtualMachines } from "../hooks";
import { azureResourcePath, bytes, gb, money, powerVariant } from "../utils";

export default function AzureComputePage() {
  const vms = useAzureVirtualMachines();
  const currency = useAzureCost().data?.currency ?? "";

  return (
    <QueryBoundary query={vms} title="Virtual machine data" isEmpty={(d) => d.length === 0} emptyTitle="No virtual machines" emptyDescription="Nothing in this subscription runs on a VM." rows={4}>
      {(data) => (
        <div className="space-y-6">
          {data.map((vm) => (
            <AzureCard
              key={vm.id}
              title={<Link to={azureResourcePath(vm.id)} className="hover:underline">{vm.name}</Link>}
              description={`${vm.size ?? "Unknown size"} · ${vm.location ?? "unknown region"} · ${vm.resourceGroup}`}
              actions={<Badge variant={powerVariant(vm.powerState)} dot>{vm.powerState ?? "Unknown"}</Badge>}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <UsageBar value={vm.cpuPercent} label="CPU (latest)" />
                  <dl className="grid grid-cols-2 gap-4">
                    <KeyValue label="vCPUs">{vm.cpuCount ?? "—"}</KeyValue>
                    <KeyValue label="Memory">{gb(vm.memoryGb)}</KeyValue>
                    <KeyValue label="Free memory">{gb(vm.availableMemoryGb)}</KeyValue>
                    <KeyValue label="OS">{vm.osType}</KeyValue>
                  </dl>
                </div>
                <dl className="grid grid-cols-2 gap-4">
                  <KeyValue label="Network in (1 h)">{bytes(vm.networkInBytes)}</KeyValue>
                  <KeyValue label="Network out (1 h)">{bytes(vm.networkOutBytes)}</KeyValue>
                  <KeyValue label="Disk read (1 h)">{bytes(vm.diskReadBytes)}</KeyValue>
                  <KeyValue label="Disk written (1 h)">{bytes(vm.diskWriteBytes)}</KeyValue>
                  <KeyValue label="Cost this month">{money(vm.monthCost, currency)}</KeyValue>
                </dl>
              </div>
            </AzureCard>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}
