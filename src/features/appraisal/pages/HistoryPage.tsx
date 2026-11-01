import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAudit, listCycles } from "../api";
import { CYCLE_STATUS, NS, SelectField, StatusBadge, formatDate, formatDateTime, useAppraisalAccess } from "../shared";
import type { AuditEntry, CycleSummary } from "../types";

import { useTranslation } from "react-i18next";

const ENTITY_TYPES = ["Settings", "Criterion", "Question", "Template", "TemplateVersion", "Cycle", "Participant", "Assignment", "Review", "Approval", "Report"];

/** Past cycles, and the audit trail of configuration, publication, assignment, approval and export events. */
export default function HistoryPage() {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const [entityType, setEntityType] = useState<string | undefined>();
  const cycles = useQuery({ queryKey: ["appraisal", "cycles", "history"], queryFn: () => listCycles() });
  const audit = useQuery({ queryKey: ["appraisal", "audit", entityType], queryFn: () => listAudit({ entityType, pageSize: 200 }), enabled: access.canConfigure || access.canViewReports });

  const cycleColumns: ColumnDef<CycleSummary, unknown>[] = [
    { id: "name", header: t("Cycle"), accessorFn: (r) => r.name, cell: ({ row }) => <Link className="text-sm font-medium text-primary hover:underline" to={`/appraisal/cycles/${row.original.id}`}>{row.original.name}</Link> },
    { id: "period", header: t("Evaluation period"), accessorFn: (r) => r.startDate, cell: ({ row }) => <span className="text-sm">{formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}</span> },
    { id: "status", header: t("Status"), accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge map={CYCLE_STATUS} value={row.original.status} /> },
  ];
  const auditColumns: ColumnDef<AuditEntry, unknown>[] = [
    { id: "at", header: t("When"), accessorFn: (r) => r.at, cell: ({ row }) => <span className="whitespace-nowrap text-sm">{formatDateTime(row.original.at)}</span> },
    { id: "type", header: t("Area"), accessorFn: (r) => r.entityType, cell: ({ row }) => <span className="text-sm">{row.original.entityType}</span> },
    { id: "action", header: t("Action"), accessorFn: (r) => r.action, cell: ({ row }) => <span className="text-sm font-medium">{row.original.action}</span> },
    { id: "details", header: t("Details"), accessorFn: (r) => r.details ?? "", cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.details ?? "—"}</span> },
  ];

  const past = (cycles.data ?? []).filter((c) => ["Finalized", "Closed", "Cancelled"].includes(c.status));
  return (
    <Tabs defaultValue="cycles">
      <TabsList variant="line">
        <TabsTrigger value="cycles">{t("Past cycles")}</TabsTrigger>
        {(access.canConfigure || access.canViewReports) && <TabsTrigger value="audit">{t("Audit trail")}</TabsTrigger>}
      </TabsList>
      <TabsContent value="cycles">
        <DataTable searchable columns={cycleColumns} data={past} isLoading={cycles.isLoading} isError={cycles.isError} onRetry={() => cycles.refetch()} pageSize={10} empty={{ title: t("No finished cycles yet") }} />
      </TabsContent>
      <TabsContent value="audit">
        <DataTable
          columns={auditColumns}
          data={audit.data ?? []}
          isLoading={audit.isLoading}
          isError={audit.isError}
          onRetry={() => audit.refetch()}
          pageSize={15}
          exportFileName={access.canExport ? "appraisal-audit" : undefined}
          empty={{ title: t("No audit entries"), description: t("Scores, comments and reviewer names are never written to the audit trail.") }}
          filters={<SelectField aria-label={t("Area")} className="w-48" allLabel={t("All areas")} value={entityType} onChange={setEntityType} items={ENTITY_TYPES.map((x) => ({ value: x, label: x }))} />}
        />
      </TabsContent>
    </Tabs>
  );
}
