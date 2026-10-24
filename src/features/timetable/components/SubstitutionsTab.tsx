import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listSections, listSubjects } from "@/features/academics/api";
import { listTeachers } from "@/features/teachers/api";
import { createSubstitution, deleteSubstitution, listSlots, listSubstitutions } from "../api";
import { DAY_DEFINITIONS } from "../constants";
import type { TimetableSubstitution } from "../types";
import SubstitutionFormDialog from "./SubstitutionFormDialog";
import { RowActions } from "@/components/ui/row-actions";

import { useTranslation } from "react-i18next";
export default function SubstitutionsTab() {
  const { t: tr } = useTranslation("timetable");
  const queryClient = useQueryClient();
  const { data: substitutions = [], isLoading, isError, refetch } = useQuery({ queryKey: ["timetable", "substitutions"], queryFn: listSubstitutions });
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
      toast.success(tr("Substitute assigned"));
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubstitution,
    onSuccess: () => {
      invalidate();
      toast.success(tr("Substitution removed"));
      setDeleteTarget(null);
    },
  });

  const teacherName = (id?: string) => {
    const t = teachers.find((teacher) => teacher.id === id);
    return t ? `${t.firstName} ${t.lastName}` : "Unassigned";
  };
  const sectionLabel = (id: string) => sections.find((s) => s.id === id)?.name ?? id;

  const columns: ColumnDef<TimetableSubstitution, unknown>[] = [
    { accessorKey: "date", header: tr("Date"), cell: ({ row }) => <span className="text-sm text-foreground">{row.original.date}</span> },
    {
      id: "day-period",
      header: tr("Day / period"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {tr(DAY_DEFINITIONS.find((d) => d.value === row.original.dayOfWeek)?.label ?? "")} {tr("· Period")} {row.original.periodNumber}
        </span>
      ),
    },
    { id: "section", header: tr("Section"), cell: ({ row }) => <span className="text-sm text-foreground">{sectionLabel(row.original.sectionId)}</span> },
    {
      id: "teachers",
      header: tr("Covering"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">{tr("{{v1}} → {{v2}}", { v1: teacherName(row.original.originalStaffId), v2: teacherName(row.original.substituteStaffId) })}</span>
      ),
    },
    { accessorKey: "reason", header: tr("Reason"), cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reason ?? "—"}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions>
          <DropdownMenuItem onClick={() => setDeleteTarget(row.original)} variant="destructive">
            <Trash2 className="w-3.5 h-3.5" />
            {tr("Remove")}
          </DropdownMenuItem>
        </RowActions>
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
          {tr("Assign substitute")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={sorted} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={tr("No substitutions recorded yet.")} />

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
        title={tr("Remove substitution")}
        description={tr("This removes the one-off substitute assignment. The recurring timetable is unaffected.")}
        confirmLabel={tr("Remove")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
