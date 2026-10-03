import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, SendToBack, UserCog, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ActiveFilter } from "@/components/tables/DataTable";
import { usePageIndex } from "@/components/tables/usePageIndex";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useClassSectionOptions } from "../hooks";
import { createStudent, listStudentsPage, transferStudent, updateStudent } from "../api";
import { listClasses } from "@/features/academics/api";
import type { Student, StudentFormValues, StudentStatus, TransferFormValues } from "../types";
import StudentStatusBadge from "../components/StudentStatusBadge";
import StudentQuickView from "../components/StudentQuickView";
import { classLabel } from "../classLabel";
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

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transferred", label: "Transferred" },
  { value: "graduated", label: "Graduated" },
];

function StudentsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { classNames } = useClassSectionOptions();
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = usePageIndex(JSON.stringify([search, classFilter, statusFilter, pageSize]));

  // Debounce typing so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchDraft.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  // Filtering and paging happen in AcademicService; only the visible page is downloaded.
  const filters = {
    pageIndex,
    pageSize,
    search,
    classId: classFilter === "all" ? undefined : classes.find((c) => c.name === classFilter)?.id,
    status: statusFilter === "all" ? undefined : (statusFilter as StudentStatus),
  };
  const { data: page, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["students", "page", filters],
    queryFn: () => listStudentsPage(filters),
    placeholderData: keepPreviousData,
  });
  const students = page?.items ?? [];
  const totalCount = page?.totalCount ?? 0;

  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [transferTarget, setTransferTarget] = useState<Student | null>(null);
  const [quickView, setQuickView] = useState<Student | null>(null);

  const openEdit = (s: Student) => {
    setQuickView(null);
    setEditingStudent(s);
    setFormOpen(true);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
  };
  const clearFilters = () => {
    clearSearch();
    setClassFilter("all");
    setStatusFilter("all");
  };
  const activeFilters: ActiveFilter[] = [];
  if (search) activeFilters.push({ id: "search", label: "Search", value: search, onRemove: clearSearch });
  if (classFilter !== "all") activeFilters.push({ id: "class", label: "Class", value: classFilter, onRemove: () => setClassFilter("all") });
  if (statusFilter !== "all") {
    const label = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    activeFilters.push({ id: "status", label: "Status", value: label, onRemove: () => setStatusFilter("all") });
  }

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

  const columns: ColumnDef<Student, unknown>[] = [
    {
      accessorKey: "firstName",
      header: "Student",
      meta: { exportValue: (s) => `${s.firstName} ${s.lastName}` },
      cell: ({ row }) => {
        const s = row.original;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuickView(s);
            }}
            className="flex items-center gap-3 rounded-md text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      meta: { exportValue: classLabel },
      cell: ({ row }) => <span className="text-sm text-foreground whitespace-nowrap">{classLabel(row.original) || "—"}</span>,
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
      meta: { exportValue: (s) => (s.guardians[0] ? `${s.guardians[0].name} (${s.guardians[0].phone})` : "") },
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
          <RowActions label={`Actions for ${s.firstName} ${s.lastName}`}>
            <DropdownMenuItem onClick={() => setQuickView(s)}>
              <Eye className="w-3.5 h-3.5" />
              Quick view
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/students/${s.id}`)}>
              <UserCog className="w-3.5 h-3.5" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(s)}>
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
      <DataTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onRowClick={setQuickView}
        getRowId={(s) => s.id}
        empty={{
          icon: Users,
          title: "No students yet",
          description: "Register your first student to start managing student records.",
        }}
        filters={
          <>
            <SearchInput
              value={searchDraft}
              onValueChange={setSearchDraft}
              placeholder="Search by name or admission no."
              containerClassName="sm:w-72"
            />
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="sm:w-36" aria-label="Filter by class">
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
              <SelectTrigger className="sm:w-36" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        actions={
          <Button
            onClick={() => {
              setEditingStudent(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Register student
          </Button>
        }
        columnToggle
        exportFileName="students"
        onRefresh={() => refetch()}
        isRefreshing={isFetching && !isLoading}
        selectable
        serverPagination={{ pageIndex, pageSize, totalCount, onPageChange: setPageIndex, onPageSizeChange: setPageSize }}
      />

      <StudentQuickView
        student={quickView}
        onOpenChange={(v) => !v && setQuickView(null)}
        onOpenProfile={(s) => navigate(`/students/${s.id}`)}
        onEdit={openEdit}
      />

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
