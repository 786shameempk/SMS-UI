import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardCheck, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listClasses, listSections, listSubjects } from "@/features/academics/api";
import { listTeachers } from "@/features/teachers/api";
import { createHomework, deleteHomework, listHomework, updateHomework } from "../api";
import { HOMEWORK_STATUSES } from "../constants";
import type { Homework, HomeworkFormValues } from "../types";
import HomeworkFormDialog from "./HomeworkFormDialog";
import SubmissionsPanel from "./SubmissionsPanel";

export default function HomeworkListTab() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Homework | null>(null);
  const [gradingTarget, setGradingTarget] = useState<Homework | null>(null);

  const { data: homework = [], isLoading } = useQuery({ queryKey: ["homework", "list"], queryFn: listHomework });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: sections = [] } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c] as const)), [classes]);
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s] as const)), [subjects]);
  const teacherById = useMemo(() => new Map(teachers.map((t) => [t.id, t] as const)), [teachers]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["homework"] });

  const createMutation = useMutation({
    mutationFn: createHomework,
    onSuccess: () => {
      invalidate();
      toast.success("Homework created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create homework"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: HomeworkFormValues }) => updateHomework(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Homework updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update homework"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHomework,
    onSuccess: () => {
      invalidate();
      toast.success("Homework deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete homework"),
  });

  if (gradingTarget) {
    return <SubmissionsPanel homework={gradingTarget} onBack={() => setGradingTarget(null)} />;
  }

  const columns: ColumnDef<Homework, unknown>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <button type="button" onClick={() => setGradingTarget(row.original)} className="text-left cursor-pointer group">
          <p className="text-sm font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{row.original.title}</p>
          <p className="text-xs text-slate-500 truncate max-w-xs">{row.original.description}</p>
        </button>
      ),
    },
    {
      id: "class",
      header: "Class",
      cell: ({ row }) => {
        const cls = classById.get(row.original.classId);
        const section = sections.find((s) => s.id === row.original.sectionId);
        return <span className="text-sm text-slate-600">{cls?.name ?? "—"}{section ? ` · ${section.name}` : ""}</span>;
      },
    },
    {
      id: "subject",
      header: "Subject",
      cell: ({ row }) => <span className="text-sm text-slate-600">{subjectById.get(row.original.subjectId)?.name ?? "—"}</span>,
    },
    {
      id: "teacher",
      header: "Assigned by",
      cell: ({ row }) => {
        const t = teacherById.get(row.original.staffId);
        return <span className="text-sm text-slate-600">{t ? `${t.firstName} ${t.lastName}` : "—"}</span>;
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => <span className="text-sm text-slate-600">{new Date(row.original.dueDate).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "published" ? "success" : "neutral"}>
          {HOMEWORK_STATUSES.find((s) => s.value === row.original.status)?.label ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const hw = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGradingTarget(hw)}>
                <ClipboardCheck className="w-3.5 h-3.5" />
                View / grade submissions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(hw);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(hw)}>
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
        <p className="text-sm text-muted-foreground">Click a title to view or grade its submissions.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New homework
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={homework} isLoading={isLoading} emptyMessage="No homework assigned yet." />

      <HomeworkFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        homework={editing}
        classes={classes}
        subjects={subjects}
        sections={sections}
        teachers={teachers}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete homework"
        description={`Delete "${deleteTarget?.title}"? This also removes all of its student submissions.`}
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
