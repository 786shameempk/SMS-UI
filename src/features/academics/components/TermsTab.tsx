import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createTerm, deleteTerm, listAcademicYears, listTerms, updateTerm } from "../api";
import { statusBadgeVariant } from "../constants";
import type { Term, TermFormValues } from "../types";
import TermFormDialog from "./TermFormDialog";
import { RowActions } from "@/components/ui/row-actions";
import { useIsTeacher } from "@/lib/roleAccess";

import { useTranslation } from "react-i18next";
export default function TermsTab() {
  const { t } = useTranslation("academics");
  const readOnly = useIsTeacher();
  const queryClient = useQueryClient();
  const { data: terms = [], isLoading, isError, refetch } = useQuery({ queryKey: ["academics", "terms"], queryFn: listTerms });
  const { data: academicYears = [] } = useQuery({ queryKey: ["academics", "academic-years"], queryFn: listAcademicYears });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academics", "terms"] });

  const createMutation = useMutation({
    mutationFn: createTerm,
    onSuccess: () => {
      invalidate();
      toast.success(t("Term created"));
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TermFormValues }) => updateTerm(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Term updated"));
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTerm,
    onSuccess: () => {
      invalidate();
      toast.success(t("Term deleted"));
      setDeleteTarget(null);
    },
  });

  const yearName = (id: string) => academicYears.find((y) => y.id === id)?.name ?? "—";

  const columns: ColumnDef<Term, unknown>[] = [
    { accessorKey: "name", header: t("Term"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    {
      id: "academicYear",
      header: t("Academic year"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{yearName(row.original.academicYearId)}</span>,
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
        const term = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(term);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(term)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">{t("Terms and semesters break an academic year into grading periods.")}</p>
        {!readOnly && (
          <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("New term")}
        </Button>
        )}
      </DataTableToolbar>

      <DataTable searchable columns={readOnly ? columns.filter((col) => col.id !== "actions") : columns} data={terms} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No terms yet.")} />

      <TermFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        term={editing}
        academicYears={academicYears}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete term")}
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
