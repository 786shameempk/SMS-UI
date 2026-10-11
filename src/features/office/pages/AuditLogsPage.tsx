import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OutcomeBadge, Pager } from "../components/kit";
import { dateTime, useDebounced } from "../helpers";
import { searchOfficeAudit } from "../api/team";
import type { OfficeAuditEntry } from "../types";

/** The append-only record of what the office team did. It can be read and filtered, never edited. */
export default function AuditLogsPage({ tenantId }: { tenantId?: string } = {}) {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OfficeAuditEntry | null>(null);
  const a = useDebounced(actor);
  const act = useDebounced(action);

  const logs = useQuery({
    queryKey: ["office", "audit", a, act, outcome, from, to, tenantId, page],
    queryFn: () =>
      searchOfficeAudit({
        actor: a,
        action: act,
        outcome: outcome === "all" ? undefined : outcome,
        tenantId,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        page,
        pageSize: 25,
      }),
    placeholderData: (prev) => prev,
  });

  const reset = () => {
    setActor("");
    setAction("");
    setOutcome("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <PageContainer>
      <PageHeader icon={ScrollText} title="Audit logs" description="Every sensitive action in the office portal: who, what, when and the outcome. Secrets are never recorded." />
      <div className="flex flex-wrap items-end gap-3">
        <Input aria-label="Filter by user email" placeholder="User email" className="w-56" value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }} />
        <Input aria-label="Filter by action" placeholder="Action, e.g. plan." className="w-48" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        <Select value={outcome} onValueChange={(v) => { setOutcome(v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Filter by outcome">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any outcome</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
        <Input aria-label="From date" type="date" className="w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <Input aria-label="To date" type="date" className="w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <Button variant="ghost" onClick={reset}>
          Clear filters
        </Button>
      </div>

      {logs.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : logs.isError ? (
        <ErrorState onRetry={() => logs.refetch()} retrying={logs.isRefetching} />
      ) : logs.data!.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No entries match" description="Try widening the dates or clearing the filters." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.data!.items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{dateTime(e.occurredAt)}</TableCell>
                    <TableCell>{e.actorEmail ?? "system"}</TableCell>
                    <TableCell className="font-mono text-xs">{e.action}</TableCell>
                    <TableCell className="text-muted-foreground">{[e.targetType, e.tenantId].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={e.outcome} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(e)}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pager page={logs.data!.pageNumber} totalPages={logs.data!.totalPages} totalCount={logs.data!.totalCount} onPage={setPage} noun="entry" />
        </>
      )}

      {selected && (
        <Dialog open onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{selected.action}</DialogTitle>
              <DialogDescription>
                {dateTime(selected.occurredAt)} · {selected.actorEmail ?? "system"} · {selected.ipAddress ?? "no address"}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Outcome</dt>
              <dd>
                <OutcomeBadge outcome={selected.outcome} />
              </dd>
              <dt className="text-muted-foreground">Target</dt>
              <dd className="break-all">{[selected.targetType, selected.targetId].filter(Boolean).join(" ") || "—"}</dd>
              <dt className="text-muted-foreground">School</dt>
              <dd>{selected.tenantId ?? "—"}</dd>
            </dl>
            <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{selected.details ? JSON.stringify(JSON.parse(selected.details), null, 2) : "No further details."}</pre>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
