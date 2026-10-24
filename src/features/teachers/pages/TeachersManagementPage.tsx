import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, Pencil, Plus, UserCog, Users2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/tables/DataTable";
import { listClasses, listSubjects } from "@/features/academics/api";
import { createStaff, getMyStaffId, updateStaff } from "@/features/staff/api";
import StaffFormDialog from "@/features/staff/components/StaffFormDialog";
import StaffStatusBadge from "@/features/staff/components/StaffStatusBadge";
import type { StaffFormValues, StaffMember } from "@/features/staff/types";
import AssignClassTeacherDialog from "../components/AssignClassTeacherDialog";
import AssignSubjectDialog from "../components/AssignSubjectDialog";
import { assignSubject, listSubjectAssignments, listTeachers } from "../api";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";
import { EmptyState, PageSkeleton } from "@/components/ui/states";
import { useIsTeacher } from "@/lib/roleAccess";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function TeachersDirectory() {
  const { t } = useTranslation("teachers");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<StaffMember | null>(null);
  const [assignSubjectTarget, setAssignSubjectTarget] = useState<StaffMember | null>(null);
  const [classTeacherDialogOpen, setClassTeacherDialogOpen] = useState(false);

  const { data: teachers = [], isLoading, isError, refetch } = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const { data: assignments = [] } = useQuery({ queryKey: ["teachers", "subject-assignments"], queryFn: () => listSubjectAssignments() });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });

  const invalidateTeachers = () => queryClient.invalidateQueries({ queryKey: ["teachers"] });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      invalidateTeachers();
      toast.success(t("Teacher added"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not add teacher")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: StaffFormValues }) => updateStaff(id, values),
    onSuccess: () => {
      invalidateTeachers();
      toast.success(t("Teacher updated"));
      setFormOpen(false);
      setEditingTeacher(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update teacher")),
  });

  const assignSubjectMutation = useMutation({
    mutationFn: (values: { subjectId: string; classId: string }) =>
      assignSubject({ staffId: assignSubjectTarget!.id, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers", "subject-assignments"] });
      toast.success(t("Subject assigned"));
      setAssignSubjectTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not assign subject")),
  });

  const assignmentsByStaff = useMemo(() => {
    const map = new Map<string, { subjectIds: Set<string>; classIds: Set<string> }>();
    for (const a of assignments) {
      const entry = map.get(a.staffId) ?? { subjectIds: new Set<string>(), classIds: new Set<string>() };
      entry.subjectIds.add(a.subjectId);
      entry.classIds.add(a.classId);
      map.set(a.staffId, entry);
    }
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((teacher) => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
      return fullName.includes(q) || teacher.employeeId.toLowerCase().includes(q) || teacher.department.toLowerCase().includes(q);
    });
  }, [teachers, search]);

  const columns: ColumnDef<StaffMember, unknown>[] = [
    {
      accessorKey: "firstName",
      header: t("Teacher"),
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <button
            type="button"
            onClick={() => navigate(`/teachers/${teacher.id}`)}
            className="flex items-center gap-3 text-start cursor-pointer group"
          >
            <Avatar className="w-8 h-8">
              {teacher.photoUrl && <AvatarImage src={teacher.photoUrl} alt={teacher.firstName} />}
              <AvatarFallback className="text-[11px]">{initialsOf(teacher.firstName, teacher.lastName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary-text transition-colors">
                {teacher.firstName} {teacher.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{teacher.employeeId}</p>
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "department",
      header: t("Department"),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.department || "—"}</span>,
    },
    {
      id: "subjects",
      header: t("Subjects"),
      cell: ({ row }) => <Badge variant="neutral">{assignmentsByStaff.get(row.original.id)?.subjectIds.size ?? 0}</Badge>,
    },
    {
      id: "classes",
      header: t("Classes"),
      cell: ({ row }) => <Badge variant="neutral">{assignmentsByStaff.get(row.original.id)?.classIds.size ?? 0}</Badge>,
    },
    {
      accessorKey: "status",
      header: t("Status"),
      cell: ({ row }) => <StaffStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => navigate(`/teachers/${teacher.id}`)}>
              <UserCog className="w-3.5 h-3.5" />
              {t("View profile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditingTeacher(teacher);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit details")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAssignSubjectTarget(teacher)}>
              <BookOpen className="w-3.5 h-3.5" />
              {t("Assign subject")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("Teacher management")}
        description={t("Subject & class assignments, lesson plans, and student performance for teaching staff.")}
      />

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        getRowId={(teacher) => teacher.id}
        empty={{ icon: Users2, title: t("No teachers yet"), description: t("Add your first teacher to start assigning subjects and classes.") }}
        filters={
          <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search by name, ID, or department")} containerClassName="sm:w-72" />
        }
        activeFilters={search.trim() ? [{ id: "search", label: t("Search"), value: search.trim(), onRemove: () => setSearch("") }] : []}
        onClearFilters={() => setSearch("")}
        actions={
          <>
            <Button variant="outline" onClick={() => setClassTeacherDialogOpen(true)}>
              <Users2 className="w-4 h-4" />
              {t("Assign class teachers")}
            </Button>
            <Button
              onClick={() => {
                setEditingTeacher(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("New teacher")}
            </Button>
          </>
        }
        columnToggle
        exportFileName="teachers"
        pageSize={25}
      />

      <StaffFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingTeacher(null);
        }}
        staff={editingTeacher}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingTeacher) await updateMutation.mutateAsync({ id: editingTeacher.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <AssignSubjectDialog
        open={Boolean(assignSubjectTarget)}
        onOpenChange={(v) => !v && setAssignSubjectTarget(null)}
        classes={classes}
        subjects={subjects}
        submitting={assignSubjectMutation.isPending}
        onSubmit={async (values) => {
          await assignSubjectMutation.mutateAsync(values);
        }}
      />

      <AssignClassTeacherDialog open={classTeacherDialogOpen} onOpenChange={setClassTeacherDialogOpen} teachers={teachers} />
    </PageContainer>
  );
}

/** A teacher has no directory: this screen is their own profile (no list, Add teacher or Assign class teacher). */
function MyTeacherProfileRedirect() {
  const { t } = useTranslation("teachers");
  const { data: myStaffId, isLoading } = useQuery({ queryKey: ["staff", "me"], queryFn: getMyStaffId });
  if (isLoading) return <PageSkeleton />;
  if (!myStaffId) {
    return (
      <PageContainer>
        <EmptyState
          icon={Users2}
          title={t("No teacher profile")}
          description={t("Your login isn't linked to a staff record yet. Ask the school administrator to link it.")}
        />
      </PageContainer>
    );
  }
  return <Navigate to={`/teachers/${myStaffId}`} replace />;
}

export default function TeachersManagementPage() {
  return useIsTeacher() ? <MyTeacherProfileRedirect /> : <TeachersDirectory />;
}
