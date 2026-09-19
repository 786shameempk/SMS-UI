import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, MoreHorizontal, Pencil, Plus, Search, UserCog, Users2 } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { listClasses, listSubjects } from "@/features/academics/api";
import { createStaff, updateStaff } from "@/features/staff/api";
import StaffFormDialog from "@/features/staff/components/StaffFormDialog";
import StaffStatusBadge from "@/features/staff/components/StaffStatusBadge";
import type { StaffFormValues, StaffMember } from "@/features/staff/types";
import AssignClassTeacherDialog from "../components/AssignClassTeacherDialog";
import AssignSubjectDialog from "../components/AssignSubjectDialog";
import { assignSubject, listSubjectAssignments, listTeachers } from "../api";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function TeachersManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<StaffMember | null>(null);
  const [assignSubjectTarget, setAssignSubjectTarget] = useState<StaffMember | null>(null);
  const [classTeacherDialogOpen, setClassTeacherDialogOpen] = useState(false);

  const { data: teachers = [], isLoading } = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const { data: assignments = [] } = useQuery({ queryKey: ["teachers", "subject-assignments"], queryFn: () => listSubjectAssignments() });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });

  const invalidateTeachers = () => queryClient.invalidateQueries({ queryKey: ["teachers"] });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      invalidateTeachers();
      toast.success("Teacher added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add teacher"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: StaffFormValues }) => updateStaff(id, values),
    onSuccess: () => {
      invalidateTeachers();
      toast.success("Teacher updated");
      setFormOpen(false);
      setEditingTeacher(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update teacher"),
  });

  const assignSubjectMutation = useMutation({
    mutationFn: (values: { subjectId: string; classId: string }) =>
      assignSubject({ staffId: assignSubjectTarget!.id, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers", "subject-assignments"] });
      toast.success("Subject assigned");
      setAssignSubjectTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not assign subject"),
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
    return teachers.filter((t) => {
      const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
      return fullName.includes(q) || t.employeeId.toLowerCase().includes(q) || t.department.toLowerCase().includes(q);
    });
  }, [teachers, search]);

  const columns: ColumnDef<StaffMember, unknown>[] = [
    {
      accessorKey: "firstName",
      header: "Teacher",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <button
            type="button"
            onClick={() => navigate(`/teachers/${t.id}`)}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <Avatar className="w-8 h-8">
              {t.photoUrl && <AvatarImage src={t.photoUrl} alt={t.firstName} />}
              <AvatarFallback className="text-[11px]">{initialsOf(t.firstName, t.lastName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                {t.firstName} {t.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">{t.employeeId}</p>
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.department || "—"}</span>,
    },
    {
      id: "subjects",
      header: "Subjects",
      cell: ({ row }) => <Badge variant="neutral">{assignmentsByStaff.get(row.original.id)?.subjectIds.size ?? 0}</Badge>,
    },
    {
      id: "classes",
      header: "Classes",
      cell: ({ row }) => <Badge variant="neutral">{assignmentsByStaff.get(row.original.id)?.classIds.size ?? 0}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StaffStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/teachers/${t.id}`)}>
                <UserCog className="w-3.5 h-3.5" />
                View profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingTeacher(t);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssignSubjectTarget(t)}>
                <BookOpen className="w-3.5 h-3.5" />
                Assign subject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Teacher management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Subject &amp; class assignments, lesson plans, and student performance for teaching staff.
        </p>
      </div>

      <DataTableToolbar>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input placeholder="Search by name, ID, or department" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setClassTeacherDialogOpen(true)}>
            <Users2 className="w-4 h-4" />
            Assign class teachers
          </Button>
          <Button
            onClick={() => {
              setEditingTeacher(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New teacher
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No teachers match your search." />

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
    </div>
  );
}
