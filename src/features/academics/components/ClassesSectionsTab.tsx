import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Merge, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
import { parseSectionNames } from "../sectionNames";
import MergeSectionsDialog from "./MergeSectionsDialog";
import { RowActions } from "@/components/ui/row-actions";
import { useIsTeacher } from "@/lib/roleAccess";

import { useTranslation } from "react-i18next";
export default function ClassesSectionsTab() {
  const { t } = useTranslation("academics");
  const readOnly = useIsTeacher();
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
      toast.success(t("Standard created"));
      setClassFormOpen(false);
    },
  });
  const updateClassMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SchoolClassFormValues }) => updateClass(id, values),
    onSuccess: () => {
      invalidateClasses();
      toast.success(t("Standard updated"));
      setClassFormOpen(false);
      setEditingClass(null);
    },
  });
  const deleteClassMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      invalidateClasses();
      invalidateSections();
      toast.success(t("Standard deleted"));
      setDeleteClassTarget(null);
    },
  });

  const createSectionMutation = useMutation({
    // One section per typed name ("A, B, C"). They are created one after another so a clash on one name does not stop the rest.
    mutationFn: async (values: SectionFormValues) => {
      const created: string[] = [];
      const failed: string[] = [];
      let firstError: unknown;
      for (const name of parseSectionNames(values.name)) {
        try {
          await createSection({ ...values, name });
          created.push(name);
        } catch (error) {
          failed.push(name);
          firstError ??= error;
        }
      }
      if (created.length === 0) throw firstError;
      return { created, failed };
    },
    onSuccess: ({ created, failed }) => {
      invalidateSections();
      toast.success(created.length > 1 ? t("{{count}} divisions created", { count: created.length }) : t("Division created"));
      if (failed.length > 0) toast.error(t("Could not create: {{names}}", { names: failed.join(", ") }));
      setSectionFormOpen(false);
    },
  });
  const updateSectionMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SectionFormValues }) => updateSection(id, values),
    onSuccess: () => {
      invalidateSections();
      toast.success(t("Division updated"));
      setSectionFormOpen(false);
      setEditingSection(null);
    },
  });
  const deleteSectionMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      invalidateSections();
      toast.success(t("Division deleted"));
      setDeleteSectionTarget(null);
    },
  });
  const mergeSectionsMutation = useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) => mergeSections(primaryId, secondaryId),
    onSuccess: (result) => {
      invalidateSections();
      toast.success(t("Merged into {{name}} ({{currentStrength}}/{{capacity}})", { name: result.mergedSection.name, currentStrength: result.mergedSection.currentStrength, capacity: result.mergedSection.capacity }));
      setMergeOpen(false);
    },
    onError: () => toast.error(t("Could not merge those divisions")),
  });

  const departmentName = (id?: string) => (id ? departments.find((d) => d.id === id)?.name ?? "—" : "—");
  const academicYearName = (id: string) => academicYears.find((y) => y.id === id)?.name ?? "—";
  const sectionCount = (classId: string) => sections.filter((s) => s.classId === classId).length;

  const filteredSections = useMemo(
    () => (sectionFilter === "all" ? sections : sections.filter((s) => s.classId === sectionFilter)),
    [sections, sectionFilter],
  );

  const classColumns: ColumnDef<SchoolClass, unknown>[] = [
    { accessorKey: "name", header: t("Standard"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    {
      id: "department",
      header: t("Department / stream"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{departmentName(row.original.departmentId)}</span>,
    },
    {
      id: "academicYear",
      header: t("Academic year"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{academicYearName(row.original.academicYearId)}</span>,
    },
    {
      id: "sections",
      header: t("Divisions"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{sectionCount(row.original.id)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const schoolClass = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setSectionDefaultClassId(schoolClass.id);
                setEditingSection(null);
                setSectionFormOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("Add division")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditingClass(schoolClass);
                setClassFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit standard")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteClassTarget(schoolClass)}
              variant="destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete standard")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  const sectionColumns: ColumnDef<Section, unknown>[] = [
    { accessorKey: "name", header: t("Division"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    {
      id: "class",
      header: t("Standard"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{classes.find((c) => c.id === row.original.classId)?.name ?? "—"}</span>,
    },
    {
      accessorKey: "classTeacherName",
      header: t("Class teacher"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.classTeacherName || "—"}</span>,
    },
    {
      id: "strength",
      header: t("Strength / capacity"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground tabular-nums">
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
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditingSection(section);
                setSectionDefaultClassId(undefined);
                setSectionFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteSectionTarget(section)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <DataTableToolbar>
          <p className="text-sm text-muted-foreground">{t("Standards belong to an academic year and, optionally, a department or stream.")}</p>
          {!readOnly && (
            <Button
            onClick={() => {
              setEditingClass(null);
              setClassFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {t("New standard")}
          </Button>
          )}
        </DataTableToolbar>
        <DataTable searchable columns={readOnly ? classColumns.filter((col) => col.id !== "actions") : classColumns} data={classes} isLoading={classesLoading} emptyMessage={t("No standards yet.")} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{t("Divisions")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("Divisions are nested under a standard and track capacity vs. enrolled strength.")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("Filter by standard")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All standards")}</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!readOnly && (
              <Button variant="outline" onClick={() => setMergeOpen(true)} disabled={classes.length === 0}>
                <Merge className="w-4 h-4" />
                {t("Merge divisions")}
              </Button>
            )}
            {!readOnly && (
              <Button
              onClick={() => {
                setEditingSection(null);
                setSectionDefaultClassId(undefined);
                setSectionFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("New division")}
            </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable searchable columns={readOnly ? sectionColumns.filter((col) => col.id !== "actions") : sectionColumns} data={filteredSections} isLoading={sectionsLoading} emptyMessage={t("No divisions match this filter.")} />
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
        title={t("Delete standard")}
        description={t("This will permanently delete \"{{name}}\" along with its divisions.", { name: deleteClassTarget?.name })}
        confirmLabel={t("Delete")}
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
        title={t("Delete division")}
        description={t("This will permanently delete \"{{name}}\".", { name: deleteSectionTarget?.name })}
        confirmLabel={t("Delete")}
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
