import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from "../api";
import type { Department, DepartmentFormValues } from "../types";
import DepartmentFormDialog from "./DepartmentFormDialog";
import DepartmentPeopleDialog from "./DepartmentPeopleDialog";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { useIsTeacher } from "@/lib/roleAccess";

import { useTranslation } from "react-i18next";
export default function DepartmentsTab() {
  const { t } = useTranslation("academics");
  const readOnly = useIsTeacher();
  const queryClient = useQueryClient();
  const { data: departments = [], isLoading, isError, refetch } = useQuery({ queryKey: ["academics", "departments"], queryFn: listDepartments });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [peopleOf, setPeopleOf] = useState<Department | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academics", "departments"] });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      invalidate();
      toast.success(t("Department created"));
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DepartmentFormValues }) => updateDepartment(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Department updated"));
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      invalidate();
      toast.success(t("Department deleted"));
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<Department, unknown>[] = [
    { accessorKey: "name", header: t("Name"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    { accessorKey: "code", header: t("Code"), cell: ({ row }) => <span className="text-sm">{row.original.code || "—"}</span> },
    { accessorKey: "headName", header: t("Department head"), cell: ({ row }) => <span className="text-sm">{row.original.headName || "—"}</span> },
    { accessorKey: "employeeCount", header: t("Employees"), cell: ({ row }) => <span className="text-sm">{row.original.employeeCount}</span> },
    {
      accessorKey: "isActive",
      header: t("Status"),
      cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "neutral"}>{row.original.isActive ? t("Active") : t("Inactive")}</Badge>,
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.description || "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const department = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => setPeopleOf(department)}>
              <Users className="w-3.5 h-3.5" />
              {t("Head and employees")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditing(department);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(department)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Departments and streams group classes, e.g. Primary, Secondary, Science, Commerce.")}</p>
        {!readOnly && (
          <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("New department")}
        </Button>
        )}
      </DataTableToolbar>

      <DataTable searchable columns={readOnly ? columns.filter((col) => col.id !== "actions") : columns} data={departments} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No departments yet.")} />

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

      {peopleOf && <DepartmentPeopleDialog department={peopleOf} onClose={() => setPeopleOf(null)} />}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete department")}
        description={t("This will permanently delete \"{{name}}\".", { name: deleteTarget?.name })}
        confirmLabel={t("Delete")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
