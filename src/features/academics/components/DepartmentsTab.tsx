import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from "../api";
import type { Department, DepartmentFormValues } from "../types";
import DepartmentFormDialog from "./DepartmentFormDialog";

export default function DepartmentsTab() {
  const queryClient = useQueryClient();
  const { data: departments = [], isLoading } = useQuery({ queryKey: ["academics", "departments"], queryFn: listDepartments });

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
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.name}</span> },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.description || "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const department = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditing(department);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(department)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-slate-500">Departments and streams group classes, e.g. Primary, Secondary, Science, Commerce.</p>
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

      <DataTable columns={columns} data={departments} isLoading={isLoading} emptyMessage="No departments yet." />

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
