import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AzureCard, HealthBadge, QueryBoundary } from "../components/AzureUi";
import { useAzureCost, useAzureResources } from "../hooks";
import type { AzureResource } from "../types";
import { azureResourcePath, downloadCsv, money } from "../utils";

const PAGE_SIZE = 15;
const ALL = "all";

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const unique = (values: Array<string | null>) => [...new Set(values.filter((v): v is string => !!v))].sort();

export default function AzureResourcesPage() {
  const resources = useAzureResources();
  const cost = useAzureCost();
  const currency = cost.data?.currency ?? "";
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const [group, setGroup] = useState(ALL);
  const [location, setLocation] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (resources.data ?? []).filter(
      (r) =>
        (type === ALL || r.typeLabel === type) &&
        (group === ALL || r.resourceGroup === group) &&
        (location === ALL || r.location === location) &&
        (status === ALL || r.status === status) &&
        (q === "" || r.name.toLowerCase().includes(q) || r.typeLabel.toLowerCase().includes(q) || Object.values(r.tags).some((t) => t.toLowerCase().includes(q))),
    );
  }, [resources.data, search, type, group, location, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0); };

  const exportCsv = (rows: AzureResource[]) =>
    downloadCsv("azure-resources.csv", [
      ["Name", "Type", "Resource group", "Region", "SKU", "Status", `Month cost (${currency})`, "Resource ID"],
      ...rows.map((r) => [r.name, r.typeLabel, r.resourceGroup, r.location, r.sku, r.status, r.monthCost, r.id]),
    ]);

  return (
    <AzureCard
      title="All resources"
      description="Discovered live from Azure Resource Manager - nothing is hardcoded"
      actions={<Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={() => exportCsv(filtered)}><Download className="h-3.5 w-3.5" /> Export CSV</Button>}
    >
      <QueryBoundary query={resources} title="Resources" isEmpty={(d) => d.length === 0} emptyTitle="No resources found" emptyDescription="The subscription has no resources, or the identity can't read them.">
        {(data) => (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <SearchInput value={search} onValueChange={reset(setSearch)} placeholder="Search name, type or tag…" />
              <Filter label="Types" value={type} onChange={reset(setType)} options={unique(data.map((r) => r.typeLabel))} />
              <Filter label="Resource groups" value={group} onChange={reset(setGroup)} options={unique(data.map((r) => r.resourceGroup))} />
              <Filter label="Regions" value={location} onChange={reset(setLocation)} options={unique(data.map((r) => r.location))} />
              <Filter label="Statuses" value={status} onChange={reset(setStatus)} options={["Healthy", "Warning", "Critical", "Unknown"]} />
            </div>

            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No resources match these filters.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Resource group</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Month cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium"><Link to={azureResourcePath(r.id)} className="text-primary-text hover:underline">{r.name}</Link></TableCell>
                        <TableCell>{r.typeLabel}</TableCell>
                        <TableCell className="text-muted-foreground">{r.resourceGroup}</TableCell>
                        <TableCell className="text-muted-foreground">{r.location ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.sku ?? "—"}</TableCell>
                        <TableCell><HealthBadge state={r.status} /></TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.monthCost, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{filtered.length} resource{filtered.length === 1 ? "" : "s"}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button>
                    <span aria-live="polite">Page {current + 1} of {pages}</span>
                    <Button variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </QueryBoundary>
    </AzureCard>
  );
}
