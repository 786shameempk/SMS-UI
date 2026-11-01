import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { listCycles } from "../api";
import CycleFormDialog from "../components/CycleFormDialog";
import { CYCLE_STATUS, NS, SelectField, StatusBadge, formatDate, options, useAppraisalAccess } from "../shared";
import type { CycleStatus, CycleSummary } from "../types";

import { useTranslation } from "react-i18next";

export default function CyclesPage() {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const navigate = useNavigate();
  // Opens on the cycles that are running; "All statuses" in the filter shows the rest.
  const [status, setStatus] = useState<CycleStatus | undefined>("InProgress");
  const [creating, setCreating] = useState(false);
  const query = useQuery({ queryKey: ["appraisal", "cycles", status ?? "all"], queryFn: () => listCycles({ status }) });

  const columns: ColumnDef<CycleSummary, unknown>[] = [
    { id: "name", header: t("Cycle"), accessorFn: (r) => r.name, cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{[row.original.appraisalType, row.original.evaluationPeriod].filter(Boolean).join(" · ")}</p></div> },
    { id: "period", header: t("Evaluation period"), accessorFn: (r) => r.startDate, cell: ({ row }) => <span className="text-sm">{formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}</span> },
    { id: "deadline", header: t("Submission deadline"), accessorFn: (r) => r.submissionDeadline ?? "", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.submissionDeadline)}</span> },
    { id: "people", header: t("Participants"), accessorFn: (r) => r.participantCount ?? 0, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.participantCount ?? 0}</span> },
    { id: "mode", header: t("Scoring"), accessorFn: (r) => r.scoringMode ?? "", cell: ({ row }) => <span className="text-sm">{row.original.scoringMode === "qualitative" ? t("Qualitative") : row.original.scoringMode === "numeric" ? t("Weighted score") : "—"}</span> },
    { id: "status", header: t("Status"), accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge map={CYCLE_STATUS} value={row.original.status} /> },
  ];

  return (
    <>
      <DataTable
        searchable
        columns={columns}
        data={query.data ?? []}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        pageSize={10}
        onRowClick={(r) => navigate(`/appraisal/cycles/${r.id}`)}
        empty={{ title: t("No appraisal cycles yet"), description: access.canManageCycles ? t("Create a cycle to start collecting feedback.") : t("Cycles you can see will be listed here.") }}
        filters={<SelectField aria-label={t("Status")} className="w-48" allLabel={t("All statuses")} value={status} onChange={setStatus} items={options(Object.fromEntries(Object.entries(CYCLE_STATUS).map(([k, v]) => [k, t(v.label)])) as Record<CycleStatus, string>)} />}
        actions={
          access.canManageCycles ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("New cycle")}
            </Button>
          ) : undefined
        }
      />
      <CycleFormDialog open={creating} onClose={() => setCreating(false)} onSaved={(c) => navigate(`/appraisal/cycles/${c.summary.id}`)} />
    </>
  );
}
