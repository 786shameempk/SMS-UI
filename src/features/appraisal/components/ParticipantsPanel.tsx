import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable } from "@/components/tables/DataTable";
import { listDepartments } from "@/features/academics/api";
import { addParticipants, listEligible, listParticipants, removeParticipant } from "../api";
import { NS, PARTICIPANT_STATUS, SelectField, StatusBadge, categoryLabel, useApiMutation, useAppraisalAccess } from "../shared";
import type { CycleDetail, Participant } from "../types";
import CommentDialog from "./CommentDialog";

import { useTranslation } from "react-i18next";

export type PanelMode = "participants" | "monitoring" | "approvals";

/** The people in a cycle, as a list to manage (select/withdraw), to monitor (review progress) or to take through approval. */
export default function ParticipantsPanel({ cycle, mode }: { cycle: CycleDetail; mode: PanelMode }) {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const cycleId = cycle.summary.id;
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Participant | null>(null);
  const query = useQuery({ queryKey: ["appraisal", "participants", cycleId], queryFn: () => listParticipants(cycleId) });
  const remove = useApiMutation((p: Participant & { reason: string }) => removeParticipant(cycleId, p.id, p.reason), {
    success: t("Participant removed"),
    invalidate: [["appraisal", "participants", cycleId], ["appraisal", "cycles"]],
    onSuccess: () => setRemoving(null),
  });

  const rows = useMemo(() => {
    const all = query.data ?? [];
    if (mode === "approvals") return all.filter((p) => ["ReadyForApproval", "UnderApproval", "Returned", "Finalized", "Incomplete"].includes(p.status));
    return all;
  }, [query.data, mode]);

  const columns: ColumnDef<Participant, unknown>[] = [
    { id: "name", header: t("Employee"), accessorFn: (r) => r.name, cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.employeeId} · {t(categoryLabel(row.original.category))}{row.original.department ? ` · ${row.original.department}` : ""}</p></div> },
    { id: "status", header: t("Status"), accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge map={PARTICIPANT_STATUS} value={row.original.status} /> },
    ...(mode !== "participants"
      ? ([
          { id: "progress", header: t("Reviews"), accessorFn: (r) => r.assignmentsSubmitted, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.assignmentsSubmitted}/{row.original.assignmentsTotal}{row.original.assignmentsOverdue > 0 && <Badge variant="danger" className="ms-2">{t("{{n}} overdue", { n: row.original.assignmentsOverdue })}</Badge>}</span> },
        ] as ColumnDef<Participant, unknown>[])
      : []),
    ...(mode !== "participants"
      ? ([
          {
            id: "overall",
            header: t("Overall score"),
            accessorFn: (r) => r.overallScore ?? -1,
            cell: ({ row }) => (row.original.overallScore != null ? <span className="text-sm font-medium tabular-nums">{row.original.overallScore.toFixed(1).replace(/\.0$/, "")}%</span> : <span className="text-xs text-muted-foreground">—</span>),
          },
        ] as ColumnDef<Participant, unknown>[])
      : []),
    ...(mode === "approvals"
      ? ([
          { id: "stage", header: t("Current step"), accessorFn: (r) => r.currentStage ?? "", cell: ({ row }) => <span className="text-sm">{row.original.currentStage ?? "—"}</span> },
          { id: "score", header: t("Score"), accessorFn: (r) => r.scoreComplete, cell: ({ row }) => (row.original.scoreComplete ? <Badge variant="success">{t("Complete")}</Badge> : <span className="text-xs text-warning-strong">{row.original.scoreStatusNote ?? t("Incomplete")}</span>) },
        ] as ColumnDef<Participant, unknown>[])
      : []),
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {mode !== "participants" && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/appraisal/results/${row.original.id}`}>{mode === "approvals" ? t("Review") : t("Open")}</Link>
            </Button>
          )}
          {mode === "participants" && access.canSelectParticipants && row.original.status !== "Withdrawn" && row.original.status !== "Finalized" && (
            <Button size="sm" variant="ghost" aria-label={t("Remove {{name}}", { name: row.original.name })} onClick={() => setRemoving(row.original)}>
              <UserX className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        searchable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        pageSize={10}
        exportFileName={mode === "monitoring" ? "appraisal-review-progress" : undefined}
        empty={{ title: mode === "participants" ? t("Nobody has been selected yet") : t("Nothing here yet") }}
        actions={
          mode === "participants" && access.canSelectParticipants && !["Closed", "Cancelled", "Finalized"].includes(cycle.summary.status) ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" /> {t("Select employees")}
            </Button>
          ) : undefined
        }
      />
      <SelectDialog open={adding} cycle={cycle} onClose={() => setAdding(false)} />
      <CommentDialog
        open={removing !== null}
        title={t("Remove {{name}} from this cycle?", { name: removing?.name ?? "" })}
        description={cycle.frozen ? t("The cycle is published, so they are marked withdrawn and their open review requests are cancelled.") : undefined}
        label={t("Reason")}
        confirmLabel={t("Remove")}
        pending={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={(reason) => removing && remove.mutate({ ...removing, reason })}
      />
    </>
  );
}

function SelectDialog({ open, cycle, onClose }: { open: boolean; cycle: CycleDetail; onClose: () => void }) {
  const { t } = useTranslation(NS);
  const cycleId = cycle.summary.id;
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [picked, setPicked] = useState<string[]>([]);
  const departments = useQuery({ queryKey: ["appraisal", "ref", "departments"], queryFn: listDepartments, enabled: open, staleTime: 300_000 });
  const eligible = useQuery({ queryKey: ["appraisal", "eligible", cycleId, search, departmentId], queryFn: () => listEligible(cycleId, { search, departmentId }), enabled: open });
  const add = useApiMutation((v: { staffIds?: string[]; departmentIds?: string[]; allEligible?: boolean }) => addParticipants(cycleId, v), {
    success: (r) => t("{{n}} added", { n: r.length }),
    invalidate: [["appraisal", "participants", cycleId], ["appraisal", "eligible", cycleId], ["appraisal", "cycles"]],
    onSuccess: () => {
      setPicked([]);
      onClose();
    },
  });

  const people = (eligible.data ?? []).filter((e) => !e.alreadyInCycle);
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Select employees")}</DialogTitle>
          <DialogDescription>{t("Only the people you select are included. An employee is never added just because their category exists.")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search by name or ID")} containerClassName="min-w-48 flex-1 sm:w-auto" />
          <SelectField aria-label={t("Department")} className="w-48" allLabel={t("All departments")} value={departmentId} onChange={setDepartmentId} items={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        </div>
        {eligible.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : people.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("No eligible employees to add.")}</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
            {people.map((e) => (
              <li key={e.staffId}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
                  <Checkbox checked={picked.includes(e.staffId)} onCheckedChange={(c) => toggle(e.staffId, c === true)} aria-label={e.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{e.employeeId} · {t(categoryLabel(e.category))}{e.department ? ` · ${e.department}` : ""}</span>
                  </span>
                  {e.inAnotherCycle && <Badge variant="warning">{t("In another cycle")}</Badge>}
                  {!e.hasLogin && <Badge variant="neutral">{t("No login")}</Badge>}
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" disabled={add.isPending || people.length === 0} onClick={() => add.mutate({ allEligible: true })}>
            {t("Add all eligible")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button loading={add.isPending} disabled={picked.length === 0 || add.isPending} onClick={() => add.mutate({ staffIds: picked })}>
              {t("Add {{n}} selected", { n: picked.length })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
