import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Search, SendToBack, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useClassSectionOptions } from "../hooks";
import { createStudent, listStudents, transferStudent, updateStudent } from "../api";
import type { Student, StudentFormValues, TransferFormValues } from "../types";
import StudentStatusBadge from "../components/StudentStatusBadge";
import StudentFormDialog from "../components/StudentFormDialog";
import TransferStudentDialog from "../components/TransferStudentDialog";
import AdmissionsTab from "../components/AdmissionsTab";
import PromotionPanel from "../components/PromotionPanel";
import GraduationPanel from "../components/GraduationPanel";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function StudentsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: students = [], isLoading, isError, refetch } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { classNames } = useClassSectionOptions();

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [transferTarget, setTransferTarget] = useState<Student | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["students"] });

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      invalidate();
      toast.success("Student registered");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not register student"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: StudentFormValues }) => updateStudent(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Student updated");
      setFormOpen(false);
      setEditingStudent(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update student"),
  });

  const transferMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TransferFormValues }) => transferStudent(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(`${transferTarget?.firstName} marked as transferred`);
      setTransferTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not transfer student"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchesSearch = !q || fullName.includes(q) || s.admissionNumber.toLowerCase().includes(q);
      const matchesClass = classFilter === "all" || s.className === classFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, search, classFilter, statusFilter]);

  const columns: ColumnDef<Student, unknown>[] = [
    {
      accessorKey: "firstName",
      header: "Student",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <button
            type="button"
            onClick={() => navigate(`/students/${s.id}`)}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <Avatar className="w-8 h-8">
              {s.photoUrl && <AvatarImage src={s.photoUrl} alt={s.firstName} />}
              <AvatarFallback className="text-[11px]">{initialsOf(s.firstName, s.lastName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary-text transition-colors">
                {s.firstName} {s.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{s.admissionNumber}</p>
            </div>
          </button>
        );
      },
    },
    {
      id: "class",
      header: "Class",
      cell: ({ row }) => {
        const { className, section } = row.original;
        // Some schools name sections "Grade 1 - A" rather than "A"; don't repeat the class name.
        const label = section.startsWith(className) ? section : [className, section].filter(Boolean).join(" - ");
        return <span className="text-sm text-foreground whitespace-nowrap">{label || "—"}</span>;
      },
    },
    {
      accessorKey: "rollNumber",
      header: "Roll no.",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.rollNumber || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StudentStatusBadge status={row.original.status} />,
    },
    {
      id: "guardian",
      header: "Guardian",
      cell: ({ row }) => {
        const g = row.original.guardians[0];
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap block max-w-[220px] truncate">
            {g ? `${g.name} · ${g.phone}` : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => navigate(`/students/${s.id}`)}>
              <UserCog className="w-3.5 h-3.5" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditingStudent(s);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit details
            </DropdownMenuItem>
            {s.status === "active" && (
              <DropdownMenuItem onClick={() => setTransferTarget(s)} className="text-warning-strong focus:bg-warning-soft focus:text-warning-strong">
                <SendToBack className="w-3.5 h-3.5" />
                Transfer student
              </DropdownMenuItem>
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by name or admission no." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classNames.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
            </SelectContent>
          </Select>
          {(classFilter !== "all" || statusFilter !== "all" || search) && (
            <Badge variant="neutral" className="whitespace-nowrap">
              {filtered.length} of {students.length}
            </Badge>
          )}
          <Button
            onClick={() => {
              setEditingStudent(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Register student
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No students match your filters." />

      <StudentFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingStudent(null);
        }}
        student={editingStudent}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingStudent) await updateMutation.mutateAsync({ id: editingStudent.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <TransferStudentDialog
        open={Boolean(transferTarget)}
        onOpenChange={(v) => !v && setTransferTarget(null)}
        student={transferTarget}
        submitting={transferMutation.isPending}
        onSubmit={async (values) => {
          if (transferTarget) await transferMutation.mutateAsync({ id: transferTarget.id, values });
        }}
      />
    </div>
  );
}

export default function StudentManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Student management"
        description="Registration, admissions, and the student directory."
      />

      <Tabs defaultValue="students">
        <TabsList variant="line">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="promotion">Promotion &amp; Graduation</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <StudentsTab />
        </TabsContent>
        <TabsContent value="admissions">
          <AdmissionsTab />
        </TabsContent>
        <TabsContent value="promotion" className="space-y-4">
          <PromotionPanel />
          <GraduationPanel />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
