import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { Pager } from "../components/kit";
import { ReasonDialog, StatusBadge } from "../components/salesKit";
import { acknowledgeAlert, alertSummary, assignAlert, listAlerts, resolveAlert, scanAlerts } from "../api/ops";
import { listOfficeUsers } from "../api/team";
import { ago, errorText } from "../helpers";
import { useHasOfficePermission, useOfficeStore } from "../store";
import type { Alert } from "../opsTypes";

const KINDS = ["StuckOnboarding", "SubscriptionExpiring", "PaymentOverdue", "PaymentVerificationPending", "AdminInviteFailed", "ProvisioningStalled", "UsageNearLimit", "EntitlementDrift", "ScheduledChangeFailed"];
const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2");

export default function MonitoringPage() {
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("monitoring.manage");
  const me = useOfficeStore((s) => s.user)!;
  const [status, setStatus] = useState("active");
  const [severity, setSeverity] = useState("all");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<Alert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = useQuery({ queryKey: ["office", "alert-summary"], queryFn: alertSummary });
  const list = useQuery({ queryKey: ["office", "alerts", status, severity, kind, page], queryFn: () => listAlerts({ status, severity, kind, page, pageSize: 20 }), placeholderData: (prev) => prev });
  const users = useQuery({ queryKey: ["office", "owner-candidates"], queryFn: () => listOfficeUsers({ status: "active", pageSize: 100 }), enabled: canManage });
  const refresh = () => qc.invalidateQueries({ queryKey: ["office"] });
  const ack = useMutation({ mutationFn: (id: string) => acknowledgeAlert(id), onSuccess: () => void refresh(), onError: (e) => toast.error(errorText(e)) });
  const assign = useMutation({ mutationFn: (v: { id: string; userId: string | null }) => assignAlert(v.id, v.userId), onSuccess: () => void refresh(), onError: (e) => toast.error(errorText(e)) });
  const scan = useMutation({
    mutationFn: () => scanAlerts(),
    onSuccess: (r) => { toast.success(`${r.raised} new, ${r.autoResolved} cleared.`); void refresh(); },
    onError: (e) => toast.error(errorText(e)),
  });
  const resolve = useMutation({
    mutationFn: (note: string) => resolveAlert(resolving!.id, note),
    onSuccess: () => { toast.success("Alert resolved."); setResolving(null); void refresh(); },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <PageContainer>
      <PageHeader
        icon={Bell}
        title="Monitoring & alerts"
        description="Things that need a person: raised from the data, closed when the cause goes away."
        actions={canManage && <Button variant="outline" onClick={() => scan.mutate()} loading={scan.isPending}><RefreshCw className="h-4 w-4" aria-hidden="true" />Scan now</Button>}
      />
      {summary.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Open" value={summary.data.open} icon={Bell} tone="brand" />
          <StatCard label="Critical" value={summary.data.critical} tone={summary.data.critical > 0 ? "danger" : "neutral"} />
          <StatCard label="Warnings" value={summary.data.warning} tone={summary.data.warning > 0 ? "warning" : "neutral"} />
          <StatCard label="Nobody assigned" value={summary.data.unassigned} tone={summary.data.unassigned > 0 ? "warning" : "neutral"} />
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Open and acknowledged</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Filter by severity"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={(v) => { setKind(v); setPage(1); }}>
          <SelectTrigger className="w-56" aria-label="Filter by type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any type</SelectItem>
            {KINDS.map((k) => <SelectItem key={k} value={k}>{spaced(k)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data!.items.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing needs attention" description="No alerts match these filters." />
      ) : (
        <>
          <ul className="space-y-3" aria-label="Alerts">
            {list.data!.items.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.severity} />
                  <StatusBadge status={a.status} />
                  <span className="text-xs text-muted-foreground">{spaced(a.kind)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">first seen {ago(a.firstSeenAt)}</span>
                </div>
                <p className="mt-1 font-medium">{a.title}</p>
                {a.detail && <p className="text-sm text-muted-foreground">{a.detail}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  {a.schoolId && <Link className="text-primary hover:underline" to={`/office/schools/${a.schoolId}`}>{a.schoolName ?? "Open school"}</Link>}
                  {a.status !== "Resolved" && canManage ? (
                    <Select value={a.assignedTo ?? "none"} onValueChange={(v) => assign.mutate({ id: a.id, userId: v === "none" ? null : v })}>
                      <SelectTrigger className="h-8 w-44" aria-label={`Assign ${a.title}`}><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        <SelectItem value={me.id}>Me</SelectItem>
                        {users.data?.items.filter((u) => u.id !== me.id).map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{a.assignedToName ? `Assigned to ${a.assignedToName}` : "Unassigned"}</span>
                  )}
                  {a.status !== "Resolved" && canManage && (
                    <span className="ml-auto flex gap-2">
                      {a.status === "Open" && <Button size="sm" variant="outline" onClick={() => ack.mutate(a.id)}>Acknowledge</Button>}
                      <Button size="sm" onClick={() => setResolving(a)}>Resolve</Button>
                    </span>
                  )}
                </div>
                {a.status === "Resolved" && <p className="mt-2 text-sm text-muted-foreground">{a.autoResolved ? "Cleared on its own" : `Resolved by ${a.resolvedByName}`}: {a.resolutionNote}</p>}
              </li>
            ))}
          </ul>
          <Pager page={list.data!.pageNumber} totalPages={list.data!.totalPages} totalCount={list.data!.totalCount} onPage={setPage} noun="alert" />
        </>
      )}
      <ReasonDialog open={!!resolving} title="Resolve alert" description={resolving?.title} confirmLabel="Resolve" label="What was done?" busy={resolve.isPending} error={error} onClose={() => { setResolving(null); setError(null); }} onConfirm={(n) => { setError(null); resolve.mutate(n); }} />
    </PageContainer>
  );
}
