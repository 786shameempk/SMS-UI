import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, RotateCcw, TrendingUp, UserCog, UserMinus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ActiveFilter } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DESIGNATIONS } from "../constants";
import { createStaff, listStaff, promoteStaff, reactivateStaff, resignStaff, updateStaff } from "../api";
import StaffStatusBadge from "../components/StaffStatusBadge";
import StaffFormDialog from "../components/StaffFormDialog";
import PromoteStaffDialog from "../components/PromoteStaffDialog";
import ResignStaffDialog from "../components/ResignStaffDialog";
import LeaveRequestsTab from "../components/LeaveRequestsTab";
import type { PromoteStaffFormValues, ResignStaffFormValues, StaffFormValues, StaffMember } from "../types";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";

const STATUS_OPTIONS: { value: StaffMember["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on-leave", label: "On leave" },
  { value: "resigned", label: "Resigned" },
  { value: "terminated", label: "Terminated" },
];

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function StaffDirectoryTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: staffList = [], isLoading, isError, refetch } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<StaffMember | null>(null);
  const [resignTarget, setResignTarget] = useState<StaffMember | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      invalidate();
      toast.success("Staff member added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add staff member"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: StaffFormValues }) => updateStaff(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Staff member updated");
      setFormOpen(false);
      setEditingStaff(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update staff member"),
  });

  const promoteMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: PromoteStaffFormValues }) => promoteStaff(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(`${promoteTarget?.firstName} promoted`);
      setPromoteTarget(null);
    },
  });

  const resignMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ResignStaffFormValues }) => resignStaff(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(`${resignTarget?.firstName} marked as resigned`);
      setResignTarget(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateStaff(id),
    onSuccess: (member) => {
      invalidate();
      toast.success(`${member.firstName} reactivated`);
    },
    // e.g. the school's plan has no staff seats left.
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not reactivate staff member"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchesSearch = !q || fullName.includes(q) || s.employeeId.toLowerCase().includes(q);
      const matchesDesignation = designationFilter === "all" || s.designation === designationFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesDesignation && matchesStatus;
    });
  }, [staffList, search, designationFilter, statusFilter]);

  const clearFilters = () => {
    setSearch("");
    setDesignationFilter("all");
    setStatusFilter("all");
  };
  const activeFilters: ActiveFilter[] = [];
  if (search.trim()) activeFilters.push({ id: "search", label: "Search", value: search.trim(), onRemove: () => setSearch("") });
  if (designationFilter !== "all")
    activeFilters.push({ id: "designation", label: "Designation", value: designationFilter, onRemove: () => setDesignationFilter("all") });
  if (statusFilter !== "all") {
    const label = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    activeFilters.push({ id: "status", label: "Status", value: label, onRemove: () => setStatusFilter("all") });
  }

  const columns: ColumnDef<StaffMember, unknown>[] = [
    {
      accessorKey: "firstName",
      header: "Staff",
      meta: { exportValue: (s) => `${s.firstName} ${s.lastName}` },
      cell: ({ row }) => {
        const s = row.original;
        return (
          <button
            type="button"
            onClick={() => navigate(`/staff/${s.id}`)}
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
              <p className="text-xs text-muted-foreground truncate">{s.employeeId}</p>
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.designation}</span>,
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.department || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StaffStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "joiningDate",
      header: "Joined",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.joiningDate).toLocaleDateString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original;
        const canEdit = s.status !== "resigned" && s.status !== "terminated";
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => navigate(`/staff/${s.id}`)}>
              <UserCog className="w-3.5 h-3.5" />
              View profile
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem
                onClick={() => {
                  setEditingStaff(s);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit details
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onClick={() => setPromoteTarget(s)}>
                <TrendingUp className="w-3.5 h-3.5" />
                Promote
              </DropdownMenuItem>
            )}
            {s.status === "resigned" ? (
              <DropdownMenuItem onClick={() => reactivateMutation.mutate(s.id)}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reactivate
              </DropdownMenuItem>
            ) : (
              canEdit && (
                <DropdownMenuItem
                  onClick={() => setResignTarget(s)}
                  variant="destructive"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Record resignation
                </DropdownMenuItem>
              )
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
        data={filtered}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        getRowId={(s) => s.id}
        empty={{ icon: Users, title: "No staff yet", description: "Record a new joining to start building the staff directory." }}
        filters={
          <>
            <SearchInput value={search} onValueChange={setSearch} placeholder="Search by name or employee ID" containerClassName="sm:w-72" />
            <Select value={designationFilter} onValueChange={setDesignationFilter}>
              <SelectTrigger className="sm:w-40" aria-label="Filter by designation">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All designations</SelectItem>
                {DESIGNATIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
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
              setEditingStaff(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New joining
          </Button>
        }
        columnToggle
        exportFileName="staff"
        selectable
        pageSize={25}
      />

      <StaffFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingStaff(null);
        }}
        staff={editingStaff}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingStaff) await updateMutation.mutateAsync({ id: editingStaff.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <PromoteStaffDialog
        open={Boolean(promoteTarget)}
        onOpenChange={(v) => !v && setPromoteTarget(null)}
        staff={promoteTarget}
        submitting={promoteMutation.isPending}
        onSubmit={async (values) => {
          if (promoteTarget) await promoteMutation.mutateAsync({ id: promoteTarget.id, values });
        }}
      />

      <ResignStaffDialog
        open={Boolean(resignTarget)}
        onOpenChange={(v) => !v && setResignTarget(null)}
        staff={resignTarget}
        submitting={resignMutation.isPending}
        onSubmit={async (values) => {
          if (resignTarget) await resignMutation.mutateAsync({ id: resignTarget.id, values });
        }}
      />
    </div>
  );
}

export default function StaffManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Staff management"
        description="Joining, promotions, resignations, and leave across all staff."
      />

      <Tabs defaultValue="staff">
        <TabsList variant="line">
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="staff">
          <StaffDirectoryTab />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveRequestsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
