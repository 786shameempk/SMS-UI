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
import { BMI_CATEGORY_CONFIG } from "../constants";
import { createHealthCheckup, deleteHealthCheckup, listHealthCheckups } from "../api";
import type { HealthCheckupRow } from "../types";
import CheckupFormDialog from "./CheckupFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function CheckupsTab() {
  const queryClient = useQueryClient();
  const { data: checkups = [], isLoading, isError, refetch } = useQuery({ queryKey: ["health", "checkups"], queryFn: () => listHealthCheckups() });
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HealthCheckupRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["health", "checkups"] });
    queryClient.invalidateQueries({ queryKey: ["health", "records"] });
    queryClient.invalidateQueries({ queryKey: ["health", "reports"] });
  };

  const createMutation = useMutation({
    mutationFn: createHealthCheckup,
    onSuccess: () => {
      invalidate();
      toast.success("Checkup recorded");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record checkup"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHealthCheckup,
    onSuccess: () => {
      invalidate();
      toast.success("Checkup record deleted");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<HealthCheckupRow, unknown>[] = [
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
      accessorKey: "checkupDate",
      header: "Date",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.checkupDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>,
    },
    {
      id: "vitals",
      header: "Height / Weight",
      cell: ({ row }) => (
        <span className="text-sm text-foreground tabular-nums">
          {row.original.heightCm} cm / {row.original.weightKg} kg
        </span>
      ),
    },
    {
      id: "bmi",
      header: "BMI",
      cell: ({ row }) => (
        <Badge variant={BMI_CATEGORY_CONFIG[row.original.bmiCategory].variant}>
          {row.original.bmi} &middot; {BMI_CATEGORY_CONFIG[row.original.bmiCategory].label}
        </Badge>
      ),
    },
    {
      id: "vision",
      header: "Vision (L/R)",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.visionLeft} / {row.original.visionRight}
        </span>
      ),
    },
    {
      id: "examinedBy",
      header: "Examined by",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.examinedBy ? `${row.original.examinedBy.firstName} ${row.original.examinedBy.lastName}` : "—"}</span>,
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
        <p className="text-sm text-muted-foreground">Periodic checkup records — height, weight, vision, and dental notes.</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Record checkup
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={checkups} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No checkups recorded yet." pageSize={10} />

      <CheckupFormDialog
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
        title="Delete checkup record"
        description={`Delete this checkup for ${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName}? This cannot be undone.`}
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
