import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Merge, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import {
  createClass,
  createSection,
  deleteClass,
  deleteSection,
  listAcademicYears,
  listClasses,
  listDepartments,
  listSections,
  mergeSections,
  updateClass,
  updateSection,
} from "../api";
import type { SchoolClass, SchoolClassFormValues, Section, SectionFormValues } from "../types";
import ClassFormDialog from "./ClassFormDialog";
import SectionFormDialog from "./SectionFormDialog";
import MergeSectionsDialog from "./MergeSectionsDialog";

export default function ClassesSectionsTab() {
  const queryClient = useQueryClient();
  const { data: classes = [], isLoading: classesLoading } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const { data: departments = [] } = useQuery({ queryKey: ["academics", "departments"], queryFn: listDepartments });
  const { data: academicYears = [] } = useQuery({ queryKey: ["academics", "academic-years"], queryFn: listAcademicYears });

  const [classFormOpen, setClassFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [deleteClassTarget, setDeleteClassTarget] = useState<SchoolClass | null>(null);

  const [sectionFilter, setSectionFilter] = useState("all");
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionDefaultClassId, setSectionDefaultClassId] = useState<string | undefined>();
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<Section | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const invalidateClasses = () => queryClient.invalidateQueries({ queryKey: ["academics", "classes"] });
  const invalidateSections = () => queryClient.invalidateQueries({ queryKey: ["academics", "sections"] });

  const createClassMutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      invalidateClasses();
      toast.success("Class created");
      setClassFormOpen(false);
    },
  });
  const updateClassMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SchoolClassFormValues }) => updateClass(id, values),
    onSuccess: () => {
      invalidateClasses();
      toast.success("Class updated");
      setClassFormOpen(false);
      setEditingClass(null);
    },
  });
  const deleteClassMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      invalidateClasses();
      invalidateSections();
      toast.success("Class deleted");
      setDeleteClassTarget(null);
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: createSection,
    onSuccess: () => {
      invalidateSections();
      toast.success("Section created");
      setSectionFormOpen(false);
    },
  });
  const updateSectionMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SectionFormValues }) => updateSection(id, values),
    onSuccess: () => {
      invalidateSections();
      toast.success("Section updated");
      setSectionFormOpen(false);
      setEditingSection(null);
    },
  });
  const deleteSectionMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      invalidateSections();
      toast.success("Section deleted");
      setDeleteSectionTarget(null);
    },
  });
  const mergeSectionsMutation = useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) => mergeSections(primaryId, secondaryId),
    onSuccess: (result) => {
      invalidateSections();
      toast.success(`Merged into ${result.mergedSection.name} (${result.mergedSection.currentStrength}/${result.mergedSection.capacity})`);
      setMergeOpen(false);
    },
    onError: () => toast.error("Could not merge those sections"),
  });

  const departmentName = (id?: string) => (id ? departments.find((d) => d.id === id)?.name ?? "—" : "—");
  const academicYearName = (id: string) => academicYears.find((y) => y.id === id)?.name ?? "—";
  const sectionCount = (classId: string) => sections.filter((s) => s.classId === classId).length;

  const filteredSections = useMemo(
    () => (sectionFilter === "all" ? sections : sections.filter((s) => s.classId === sectionFilter)),
    [sections, sectionFilter],
  );

  const classColumns: ColumnDef<SchoolClass, unknown>[] = [
    { accessorKey: "name", header: "Class", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.name}</span> },
    {
      id: "department",
      header: "Department / stream",
      cell: ({ row }) => <span className="text-sm text-slate-600">{departmentName(row.original.departmentId)}</span>,
    },
    {
      id: "academicYear",
      header: "Academic year",
      cell: ({ row }) => <span className="text-sm text-slate-600">{academicYearName(row.original.academicYearId)}</span>,
    },
    {
      id: "sections",
      header: "Sections",
      cell: ({ row }) => <span className="text-sm text-slate-600">{sectionCount(row.original.id)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const schoolClass = row.original;
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
                  setSectionDefaultClassId(schoolClass.id);
                  setEditingSection(null);
                  setSectionFormOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add section
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingClass(schoolClass);
                  setClassFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit class
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteClassTarget(schoolClass)}
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete class
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const sectionColumns: ColumnDef<Section, unknown>[] = [
    { accessorKey: "name", header: "Section", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.name}</span> },
    {
      id: "class",
      header: "Class",
      cell: ({ row }) => <span className="text-sm text-slate-600">{classes.find((c) => c.id === row.original.classId)?.name ?? "—"}</span>,
    },
    {
      accessorKey: "classTeacherName",
      header: "Class teacher",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.classTeacherName || "—"}</span>,
    },
    {
      id: "strength",
      header: "Strength / capacity",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 tabular-nums">
          {row.original.currentStrength} / {row.original.capacity}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const section = row.original;
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
                  setEditingSection(section);
                  setSectionDefaultClassId(undefined);
                  setSectionFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteSectionTarget(section)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
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
    <div className="space-y-6">
      <div className="space-y-4">
        <DataTableToolbar>
          <p className="text-sm text-slate-500">Classes belong to an academic year and, optionally, a department or stream.</p>
          <Button
            onClick={() => {
              setEditingClass(null);
              setClassFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New class
          </Button>
        </DataTableToolbar>
        <DataTable columns={classColumns} data={classes} isLoading={classesLoading} emptyMessage="No classes yet." />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Sections</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Sections are nested under a class and track capacity vs. enrolled strength.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setMergeOpen(true)} disabled={classes.length === 0}>
              <Merge className="w-4 h-4" />
              Merge sections
            </Button>
            <Button
              onClick={() => {
                setEditingSection(null);
                setSectionDefaultClassId(undefined);
                setSectionFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              New section
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={sectionColumns} data={filteredSections} isLoading={sectionsLoading} emptyMessage="No sections match this filter." />
        </CardContent>
      </Card>

      <ClassFormDialog
        open={classFormOpen}
        onOpenChange={(v) => {
          setClassFormOpen(v);
          if (!v) setEditingClass(null);
        }}
        schoolClass={editingClass}
        departments={departments}
        academicYears={academicYears}
        submitting={createClassMutation.isPending || updateClassMutation.isPending}
        onSubmit={async (values) => {
          if (editingClass) await updateClassMutation.mutateAsync({ id: editingClass.id, values });
          else await createClassMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteClassTarget)}
        onOpenChange={(v) => !v && setDeleteClassTarget(null)}
        title="Delete class"
        description={`This will permanently delete "${deleteClassTarget?.name}" along with its sections.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteClassMutation.isPending}
        onConfirm={() => {
          if (deleteClassTarget) deleteClassMutation.mutate(deleteClassTarget.id);
        }}
      />

      <SectionFormDialog
        open={sectionFormOpen}
        onOpenChange={(v) => {
          setSectionFormOpen(v);
          if (!v) {
            setEditingSection(null);
            setSectionDefaultClassId(undefined);
          }
        }}
        section={editingSection}
        classes={classes}
        defaultClassId={sectionDefaultClassId}
        submitting={createSectionMutation.isPending || updateSectionMutation.isPending}
        onSubmit={async (values) => {
          if (editingSection) await updateSectionMutation.mutateAsync({ id: editingSection.id, values });
          else await createSectionMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteSectionTarget)}
        onOpenChange={(v) => !v && setDeleteSectionTarget(null)}
        title="Delete section"
        description={`This will permanently delete "${deleteSectionTarget?.name}".`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteSectionMutation.isPending}
        onConfirm={() => {
          if (deleteSectionTarget) deleteSectionMutation.mutate(deleteSectionTarget.id);
        }}
      />

      <MergeSectionsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        classes={classes}
        sections={sections}
        submitting={mergeSectionsMutation.isPending}
        onMerge={async (primaryId, secondaryId) => {
          await mergeSectionsMutation.mutateAsync({ primaryId, secondaryId });
        }}
      />
    </div>
  );
}
