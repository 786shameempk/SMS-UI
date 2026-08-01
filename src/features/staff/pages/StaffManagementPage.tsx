import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, RotateCcw, Search, TrendingUp, UserCog, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DESIGNATIONS } from "../constants";
import { createStaff, listStaff, promoteStaff, reactivateStaff, resignStaff, updateStaff } from "../api";
import StaffStatusBadge from "../components/StaffStatusBadge";
import StaffFormDialog from "../components/StaffFormDialog";
import PromoteStaffDialog from "../components/PromoteStaffDialog";
import ResignStaffDialog from "../components/ResignStaffDialog";
import LeaveRequestsTab from "../components/LeaveRequestsTab";
import type { PromoteStaffFormValues, ResignStaffFormValues, StaffFormValues, StaffMember } from "../types";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function StaffDirectoryTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: staffList = [], isLoading } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

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

  const columns: ColumnDef<StaffMember, unknown>[] = [
    {
      accessorKey: "firstName",
      header: "Staff",
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
              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                {s.firstName} {s.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">{s.employeeId}</p>
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.designation}</span>,
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.department || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StaffStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "joiningDate",
      header: "Joined",
      cell: ({ row }) => <span className="text-sm text-slate-500">{new Date(row.original.joiningDate).toLocaleDateString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original;
        const canEdit = s.status !== "resigned" && s.status !== "terminated";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Record resignation
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input placeholder="Search by name or employee ID" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={designationFilter} onValueChange={setDesignationFilter}>
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-leave">On leave</SelectItem>
              <SelectItem value="resigned">Resigned</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          {(designationFilter !== "all" || statusFilter !== "all" || search) && (
            <Badge variant="neutral" className="whitespace-nowrap">
              {filtered.length} of {staffList.length}
            </Badge>
          )}
          <Button
            onClick={() => {
              setEditingStaff(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New joining
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No staff match your filters." />

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
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Staff management</h1>
        <p className="text-sm text-slate-500 mt-1">Joining, promotions, resignations, and leave across all staff.</p>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
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
    </div>
  );
}
