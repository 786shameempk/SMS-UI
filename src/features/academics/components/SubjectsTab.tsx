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
import { createSubject, deleteSubject, listClasses, listSubjects, updateSubject } from "../api";
import type { Subject, SubjectFormValues } from "../types";
import SubjectFormDialog from "./SubjectFormDialog";
import { RowActions } from "@/components/ui/row-actions";
import { useIsTeacher } from "@/lib/roleAccess";

import { useTranslation } from "react-i18next";
export default function SubjectsTab() {
  const { t } = useTranslation("academics");
  const readOnly = useIsTeacher();
  const queryClient = useQueryClient();
  const { data: subjects = [], isLoading, isError, refetch } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academics", "subjects"] });

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      invalidate();
      toast.success(t("Subject created"));
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubjectFormValues }) => updateSubject(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Subject updated"));
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      invalidate();
      toast.success(t("Subject deleted"));
      setDeleteTarget(null);
    },
  });

  const classNames = (ids: string[]) =>
    ids
      .map((id) => classes.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "—";

  const columns: ColumnDef<Subject, unknown>[] = [
    {
      id: "subject",
      header: t("Subject"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.code}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("Type"),
      cell: ({ row }) => (
        <Badge variant={row.original.type === "core" ? "info" : "neutral"} className="capitalize">
          {row.original.type}
        </Badge>
      ),
    },
    {
      id: "classes",
      header: t("Classes"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground block max-w-md truncate">{classNames(row.original.classIds)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(subject);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(subject)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">{t("Subjects are core or elective and can be linked to one or more classes.")}</p>
        {!readOnly && (
          <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("New subject")}
        </Button>
        )}
      </DataTableToolbar>

      <DataTable searchable columns={readOnly ? columns.filter((col) => col.id !== "actions") : columns} data={subjects} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No subjects yet.")} />

      <SubjectFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        subject={editing}
        classes={classes}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete subject")}
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
