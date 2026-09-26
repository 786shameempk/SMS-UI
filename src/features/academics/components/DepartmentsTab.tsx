import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from "../api";
import type { Department, DepartmentFormValues } from "../types";
import DepartmentFormDialog from "./DepartmentFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function DepartmentsTab() {
  const queryClient = useQueryClient();
  const { data: departments = [], isLoading, isError, refetch } = useQuery({ queryKey: ["academics", "departments"], queryFn: listDepartments });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academics", "departments"] });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      invalidate();
      toast.success("Department created");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DepartmentFormValues }) => updateDepartment(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Department updated");
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      invalidate();
      toast.success("Department deleted");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<Department, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.description || "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const department = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(department);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(department)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">Departments and streams group classes, e.g. Primary, Secondary, Science, Commerce.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New department
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={departments} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No departments yet." />

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        department={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete department"
        description={`This will permanently delete "${deleteTarget?.name}".`}
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
