import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatDateTime } from "@/utils/format";
import { VISIT_OUTCOME_CONFIG } from "../constants";
import { createInfirmaryVisit, deleteInfirmaryVisit, listInfirmaryVisits } from "../api";
import type { InfirmaryVisitRow } from "../types";
import InfirmaryVisitFormDialog from "./InfirmaryVisitFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function InfirmaryVisitsTab() {
  const queryClient = useQueryClient();
  const { data: visits = [], isLoading, isError, refetch } = useQuery({ queryKey: ["health", "visits"], queryFn: () => listInfirmaryVisits() });
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InfirmaryVisitRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["health", "visits"] });
    queryClient.invalidateQueries({ queryKey: ["health", "records"] });
    queryClient.invalidateQueries({ queryKey: ["health", "reports"] });
  };

  const createMutation = useMutation({
    mutationFn: createInfirmaryVisit,
    onSuccess: () => {
      invalidate();
      toast.success("Infirmary visit logged");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not log visit"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInfirmaryVisit,
    onSuccess: () => {
      invalidate();
      toast.success("Visit record deleted");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<InfirmaryVisitRow, unknown>[] = [
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.original.student.firstName} {row.original.student.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.student.className} - {row.original.student.section}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "visitedAt",
      header: "Visited",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatDateTime(row.original.visitedAt)}</span>,
    },
    {
      id: "symptoms",
      header: "Symptoms",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.symptoms}</p>
          {row.original.temperatureC !== undefined && <p className="text-xs text-muted-foreground">{row.original.temperatureC}°C</p>}
        </div>
      ),
    },
    {
      id: "treatment",
      header: "Treatment",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.treatmentGiven}</p>
          {row.original.medicineGiven && <p className="text-xs text-muted-foreground">{row.original.medicineGiven}</p>}
        </div>
      ),
    },
    {
      id: "outcome",
      header: "Outcome",
      cell: ({ row }) => <Badge variant={VISIT_OUTCOME_CONFIG[row.original.outcome].variant}>{VISIT_OUTCOME_CONFIG[row.original.outcome].label}</Badge>,
    },
    {
      id: "parentNotified",
      header: "Parent notified",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.parentNotified ? "Yes" : "No"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions>
          <DropdownMenuItem onClick={() => setDeleteTarget(row.original)} variant="destructive">
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </DropdownMenuItem>
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Sick-bay / infirmary visit log.</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Log visit
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={visits} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No infirmary visits logged yet." pageSize={10} />

      <InfirmaryVisitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete visit record"
        description={`Delete this infirmary visit for ${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
