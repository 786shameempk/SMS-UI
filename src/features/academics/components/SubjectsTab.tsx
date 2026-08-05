import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createSubject, deleteSubject, listClasses, listSubjects, updateSubject } from "../api";
import type { Subject, SubjectFormValues } from "../types";
import SubjectFormDialog from "./SubjectFormDialog";

export default function SubjectsTab() {
  const queryClient = useQueryClient();
  const { data: subjects = [], isLoading } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academics", "subjects"] });

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      invalidate();
      toast.success("Subject created");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubjectFormValues }) => updateSubject(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Subject updated");
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      invalidate();
      toast.success("Subject deleted");
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
      header: "Subject",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.name}</p>
          <p className="text-xs text-slate-500">{row.original.code}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "core" ? "info" : "neutral"} className="capitalize">
          {row.original.type}
        </Badge>
      ),
    },
    {
      id: "classes",
      header: "Classes",
      cell: ({ row }) => <span className="text-sm text-slate-600 block max-w-md truncate">{classNames(row.original.classIds)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const subject = row.original;
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
                  setEditing(subject);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(subject)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
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
        <p className="text-sm text-slate-500">Subjects are core or elective and can be linked to one or more classes.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New subject
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={subjects} isLoading={isLoading} emptyMessage="No subjects yet." />

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
        title="Delete subject"
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
