import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Pagination } from "@/components/tables/Pagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { completeEnrollment, decideEnrollments, listActivities, listEnrollments, withdrawEnrollment } from "../api";
import { ENROLLMENT_STATUS_LABEL } from "../constants";
import { SelectField, formatDate, options, useApiMutation, useExtracurricularAccess } from "../shared";
import type { Enrollment, EnrollmentStatus } from "../types";

const PAGE_SIZE = 25;

export default function EnrollmentsPage() {
  const access = useExtracurricularAccess();
  const [status, setStatus] = useState<EnrollmentStatus | undefined>(access.isFamily ? undefined : "Requested");
  const [activityId, setActivityId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [withdrawing, setWithdrawing] = useState<Enrollment | null>(null);
  const [rejecting, setRejecting] = useState<string[] | null>(null);

  const activities = useQuery({ queryKey: ["extracurricular", "activity-names"], queryFn: () => listActivities({ pageSize: 200 }), enabled: !access.isFamily });
  const filters = { status, activityId, search: search.trim() || undefined, pageNumber: page + 1, pageSize: PAGE_SIZE };
  const enrollments = useQuery({ queryKey: ["extracurricular", "enrollments", filters], queryFn: () => listEnrollments(filters), placeholderData: (previous) => previous });

  const decide = useApiMutation(({ ids, approve }: { ids: string[]; approve: boolean }) => decideEnrollments(ids, approve), {
    success: (rows) => `${rows.length} ${rows.length === 1 ? "request" : "requests"} decided`,
    onSuccess: () => {
      setSelected(new Set());
      setRejecting(null);
    },
  });
  const withdraw = useApiMutation(withdrawEnrollment, { success: "Withdrawn", onSuccess: () => setWithdrawing(null) });
  const complete = useApiMutation(completeEnrollment, { success: "Marked completed" });

  const data = enrollments.data;
  const rows = data?.items ?? [];
  const pending = rows.filter((r) => r.status === "Requested" || r.status === "Waitlisted");
  const allSelected = pending.length > 0 && pending.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {!access.isFamily && (
          <div className="min-w-56 flex-1">
            <SearchInput value={search} onValueChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by student" aria-label="Search by student" />
          </div>
        )}
        <div className="w-44">
          <SelectField value={status} onChange={(v) => { setStatus(v); setPage(0); }} allLabel="Any status" items={options(ENROLLMENT_STATUS_LABEL)} />
        </div>
        {!access.isFamily && (
          <div className="w-56">
            <SelectField value={activityId} onChange={(v) => { setActivityId(v); setPage(0); }} allLabel="All activities" items={(activities.data?.items ?? []).map((a) => ({ value: a.id, label: a.name }))} />
          </div>
        )}
        {access.canApprove && selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            <Button onClick={() => decide.mutate({ ids: [...selected], approve: true })} loading={decide.isPending}>
              <Check className="h-4 w-4" /> Approve {selected.size}
            </Button>
            <Button variant="outline" onClick={() => setRejecting([...selected])}>
              <X className="h-4 w-4" /> Reject {selected.size}
            </Button>
          </div>
        )}
      </div>

      {enrollments.isError && <ErrorState onRetry={() => enrollments.refetch()} retrying={enrollments.isFetching} />}
      {enrollments.isLoading && <Skeleton className="h-48 w-full" />}
      {data && rows.length === 0 && (
        <EmptyState title="No enrollments here" description={access.isFamily ? "When you ask to join an activity it shows up here." : "Nothing matches these filters."} />
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {access.canApprove && (
                  <th className="w-10 px-3 py-2">
                    <Checkbox
                      aria-label="Select all open requests"
                      checked={allSelected}
                      onCheckedChange={(v) => setSelected(v === true ? new Set(pending.map((r) => r.id)) : new Set())}
                      disabled={pending.length === 0}
                    />
                  </th>
                )}
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Activity</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">By</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((e) => {
                const open = e.status === "Requested" || e.status === "Waitlisted";
                return (
                  <tr key={e.id}>
                    {access.canApprove && (
                      <td className="px-3 py-2">
                        <Checkbox aria-label={`Select ${e.studentName}`} checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} disabled={!open} />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <span className="font-medium">{e.studentName}</span>
                      {e.className && <span className="block text-xs text-muted-foreground">{e.className}</span>}
                    </td>
                    <td className="px-3 py-2">{e.activityName}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={e.status} label={ENROLLMENT_STATUS_LABEL[e.status]} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(e.requestedAt.slice(0, 10))}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.source}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {access.canApprove && open && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => decide.mutate({ ids: [e.id], approve: true })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRejecting([e.id])}>
                              Reject
                            </Button>
                          </>
                        )}
                        {access.canManage && e.status === "Approved" && (
                          <Button size="sm" variant="ghost" onClick={() => complete.mutate(e.id)}>
                            Mark completed
                          </Button>
                        )}
                        {(e.status === "Approved" || open) && (
                          <Button size="sm" variant="ghost" onClick={() => setWithdrawing(e)}>
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalCount > PAGE_SIZE && (
        <Pagination
          pageIndex={page}
          pageCount={Math.ceil(data.totalCount / PAGE_SIZE)}
          pageSize={PAGE_SIZE}
          totalCount={data.totalCount}
          from={page * PAGE_SIZE + 1}
          to={Math.min(data.totalCount, (page + 1) * PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={Boolean(withdrawing)}
        onOpenChange={(v) => !v && setWithdrawing(null)}
        title="Withdraw from activity"
        description={`Withdraw ${withdrawing?.studentName} from ${withdrawing?.activityName}? Their place goes to the next student on the waiting list.`}
        confirmLabel="Withdraw"
        confirmVariant="destructive"
        submitting={withdraw.isPending}
        onConfirm={() => {
          if (withdrawing) withdraw.mutate(withdrawing.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(rejecting)}
        onOpenChange={(v) => !v && setRejecting(null)}
        title="Reject requests"
        description={`Reject ${rejecting?.length ?? 0} ${rejecting?.length === 1 ? "request" : "requests"}? They stay on record as rejected.`}
        confirmLabel="Reject"
        confirmVariant="destructive"
        submitting={decide.isPending}
        onConfirm={() => {
          if (rejecting) decide.mutate({ ids: rejecting, approve: false });
        }}
      />
    </div>
  );
}
