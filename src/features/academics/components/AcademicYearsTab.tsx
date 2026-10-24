import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createAcademicYear, deleteAcademicYear, listAcademicYears, updateAcademicYear } from "../api";
import { statusBadgeVariant } from "../constants";
import type { AcademicYear, AcademicYearFormValues } from "../types";
import AcademicYearFormDialog from "./AcademicYearFormDialog";
import { RowActions } from "@/components/ui/row-actions";
import { useIsTeacher } from "@/lib/roleAccess";

import { useTranslation } from "react-i18next";
export default function AcademicYearsTab() {
  const { t } = useTranslation("academics");
  const readOnly = useIsTeacher();
  const queryClient = useQueryClient();
  const { data: academicYears = [], isLoading, isError, refetch } = useQuery({ queryKey: ["academics", "academic-years"], queryFn: listAcademicYears });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academics", "academic-years"] });

  const createMutation = useMutation({
    mutationFn: createAcademicYear,
    onSuccess: () => {
      invalidate();
      toast.success(t("Academic year created"));
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AcademicYearFormValues }) => updateAcademicYear(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Academic year updated"));
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAcademicYear,
    onSuccess: () => {
      invalidate();
      toast.success(t("Academic year deleted"));
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<AcademicYear, unknown>[] = [
    {
      accessorKey: "name",
      header: t("Academic year"),
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {row.original.name}
          {row.original.isCurrent && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
        </span>
      ),
    },
    {
      id: "duration",
      header: t("Duration"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">{t("{{startDate}} → {{endDate}}", { startDate: row.original.startDate, endDate: row.original.endDate })}</span>
      ),
    },
    {
      accessorKey: "status",
      header: t("Status"),
      cell: ({ row }) => <Badge variant={statusBadgeVariant(row.original.status)} className="capitalize">{row.original.status}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const year = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(year);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(year)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">{t("Define academic years to anchor terms, classes, and the calendar.")}</p>
        {!readOnly && (
          <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("New academic year")}
        </Button>
        )}
      </DataTableToolbar>

      <DataTable searchable columns={readOnly ? columns.filter((col) => col.id !== "actions") : columns} data={academicYears} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No academic years yet.")} />

      <AcademicYearFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        academicYear={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete academic year")}
        description={t("This will permanently delete \"{{name}}\". Classes and terms linked to it will remain but point to a missing year.", { name: deleteTarget?.name })}
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
