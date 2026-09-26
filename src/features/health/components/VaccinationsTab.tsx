import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { VACCINATION_STATUS_CONFIG } from "../constants";
import { createVaccination, deleteVaccination, listVaccinations, markVaccinationAdministered } from "../api";
import type { VaccinationRow } from "../types";
import VaccinationFormDialog from "./VaccinationFormDialog";
import MarkVaccinationAdministeredDialog from "./MarkVaccinationAdministeredDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function VaccinationsTab() {
  const queryClient = useQueryClient();
  const { data: vaccinations = [], isLoading, isError, refetch } = useQuery({ queryKey: ["health", "vaccinations"], queryFn: () => listVaccinations() });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [markTarget, setMarkTarget] = useState<VaccinationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaccinationRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["health", "vaccinations"] });
    queryClient.invalidateQueries({ queryKey: ["health", "records"] });
    queryClient.invalidateQueries({ queryKey: ["health", "reports"] });
  };

  const createMutation = useMutation({
    mutationFn: createVaccination,
    onSuccess: () => {
      invalidate();
      toast.success("Vaccination scheduled");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not schedule vaccination"),
  });

  const markMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof markVaccinationAdministered>[1] }) => markVaccinationAdministered(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Marked as administered");
      setMarkTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVaccination,
    onSuccess: () => {
      invalidate();
      toast.success("Vaccination record deleted");
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => (statusFilter === "all" ? vaccinations : vaccinations.filter((v) => v.status === statusFilter)), [vaccinations, statusFilter]);

  const columns: ColumnDef<VaccinationRow, unknown>[] = [
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
      id: "vaccine",
      header: "Vaccine",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.vaccineName} <span className="text-muted-foreground">(dose {row.original.doseNumber})</span>
        </span>
      ),
    },
    {
      id: "dueDate",
      header: "Due date",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatRelativeDay(row.original.dueDate)}</span>,
    },
    {
      id: "administered",
      header: "Administered on",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.dateAdministered ? new Date(row.original.dateAdministered).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={VACCINATION_STATUS_CONFIG[row.original.status].variant}>{VACCINATION_STATUS_CONFIG[row.original.status].label}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const v = row.original;
        return (
          <RowActions>
            {v.status !== "completed" && (
              <DropdownMenuItem onClick={() => setMarkTarget(v)}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark administered
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteTarget(v)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(VACCINATION_STATUS_CONFIG) as Array<keyof typeof VACCINATION_STATUS_CONFIG>).map((status) => (
              <SelectItem key={status} value={status}>
                {VACCINATION_STATUS_CONFIG[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Schedule vaccination
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No vaccination records match your filter." pageSize={10} />

      <VaccinationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <MarkVaccinationAdministeredDialog
        open={Boolean(markTarget)}
        onOpenChange={(v) => !v && setMarkTarget(null)}
        vaccination={markTarget}
        submitting={markMutation.isPending}
        onSubmit={async (values) => {
          if (markTarget) await markMutation.mutateAsync({ id: markTarget.id, values });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete vaccination record"
        description={`Delete "${deleteTarget?.vaccineName}" (dose ${deleteTarget?.doseNumber}) for ${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName}? This cannot be undone.`}
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
