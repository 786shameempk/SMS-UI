import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listSections, listSubjects } from "@/features/academics/api";
import { listTeachers } from "@/features/teachers/api";
import { createSubstitution, deleteSubstitution, listSlots, listSubstitutions } from "../api";
import { DAY_DEFINITIONS } from "../constants";
import type { TimetableSubstitution } from "../types";
import SubstitutionFormDialog from "./SubstitutionFormDialog";

export default function SubstitutionsTab() {
  const queryClient = useQueryClient();
  const { data: substitutions = [], isLoading } = useQuery({ queryKey: ["timetable", "substitutions"], queryFn: listSubstitutions });
  const { data: sections = [] } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers", "directory"], queryFn: listTeachers });
  const { data: slots = [] } = useQuery({ queryKey: ["timetable", "slots"], queryFn: () => listSlots() });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableSubstitution | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["timetable", "substitutions"] });

  const createMutation = useMutation({
    mutationFn: createSubstitution,
    onSuccess: () => {
      invalidate();
      toast.success("Substitute assigned");
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubstitution,
    onSuccess: () => {
      invalidate();
      toast.success("Substitution removed");
      setDeleteTarget(null);
    },
  });

  const teacherName = (id?: string) => {
    const t = teachers.find((teacher) => teacher.id === id);
    return t ? `${t.firstName} ${t.lastName}` : "Unassigned";
  };
  const sectionLabel = (id: string) => sections.find((s) => s.id === id)?.name ?? id;

  const columns: ColumnDef<TimetableSubstitution, unknown>[] = [
    { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.date}</span> },
    {
      id: "day-period",
      header: "Day / period",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {DAY_DEFINITIONS.find((d) => d.value === row.original.dayOfWeek)?.label} &middot; Period {row.original.periodNumber}
        </span>
      ),
    },
    { id: "section", header: "Section", cell: ({ row }) => <span className="text-sm text-slate-700">{sectionLabel(row.original.sectionId)}</span> },
    {
      id: "teachers",
      header: "Covering",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {teacherName(row.original.originalStaffId)} &rarr; {teacherName(row.original.substituteStaffId)}
        </span>
      ),
    },
    { accessorKey: "reason", header: "Reason", cell: ({ row }) => <span className="text-sm text-slate-500">{row.original.reason ?? "—"}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDeleteTarget(row.original)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const sorted = [...substitutions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <div />
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Assign substitute
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={sorted} isLoading={isLoading} emptyMessage="No substitutions recorded yet." />

      <SubstitutionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sections={sections}
        teachers={teachers}
        subjects={subjects}
        slots={slots}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove substitution"
        description="This removes the one-off substitute assignment. The recurring timetable is unaffected."
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
