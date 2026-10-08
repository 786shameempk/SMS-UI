import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Lock, Pencil, Plus, Trash2, Unlock, UserCheck, UserCog, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type ActiveFilter } from "@/components/tables/DataTable";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from "../api";
import { listRoles } from "@/features/administration/roles/api";
import UserStatusBadge from "../components/UserStatusBadge";
import UserFormDialog from "../components/UserFormDialog";
import UserProfileDialog from "../components/UserProfileDialog";
import type { SystemUser, UserFormValues } from "../types";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";

const STATUS_OPTIONS: { value: SystemUser["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "locked", label: "Locked" },
];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers });
  const { data: roles = [] } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: ({ user, tempPassword }) => {
      invalidate();
      // Also emailed when email delivery is configured; shown here so the admin can hand it over.
      toast.success(`${user.name} created. Temporary password: ${tempPassword}`, { duration: 30000 });
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UserFormValues }) => updateUser(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("User updated");
      setFormOpen(false);
      setEditingUser(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update user"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SystemUser["status"] }) => setUserStatus(id, status),
    onSuccess: (user) => {
      invalidate();
      toast.success(`${user.name} is now ${user.status}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not change status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      invalidate();
      toast.success(`${deleteTarget?.name} removed`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove user"),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => resetUserPassword(id),
    onSuccess: ({ tempPassword }) => {
      toast.success(`Password reset for ${resetTarget?.email}. Temporary password: ${tempPassword}`, { duration: 30000 });
      setResetTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not reset password"),
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.roleId === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Bulk change through the existing per-user endpoint; reports partial failures instead of hiding them.
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ users: targets, status }: { users: SystemUser[]; status: SystemUser["status"] }) => {
      const results = await Promise.allSettled(targets.filter((u) => u.status !== status).map((u) => setUserStatus(u.id, status)));
      return { status, ok: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length };
    },
    onSuccess: ({ status, ok, failed }) => {
      invalidate();
      if (ok) toast.success(`${ok} user${ok === 1 ? "" : "s"} ${status === "active" ? "activated" : "deactivated"}`);
      if (failed) toast.error(`${failed} user${failed === 1 ? "" : "s"} could not be updated`);
      if (!ok && !failed) toast(`Selected users are already ${status}`);
    },
  });

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };
  const activeFilters: ActiveFilter[] = [];
  if (search.trim()) activeFilters.push({ id: "search", label: "Search", value: search.trim(), onRemove: () => setSearch("") });
  if (roleFilter !== "all")
    activeFilters.push({ id: "role", label: "Role", value: roles.find((r) => r.id === roleFilter)?.name ?? roleFilter, onRemove: () => setRoleFilter("all") });
  if (statusFilter !== "all") {
    const label = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    activeFilters.push({ id: "status", label: "Status", value: label, onRemove: () => setStatusFilter("all") });
  }

  const profileUser = users.find((u) => u.id === profileUserId) ?? null;

  const columns: ColumnDef<SystemUser, unknown>[] = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <button type="button" onClick={() => setProfileUserId(u.id)} className="flex items-center gap-3 text-left cursor-pointer group">
            <Avatar className="w-8 h-8">
              {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
              <AvatarFallback className="text-[11px]">{initialsOf(u.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary-text transition-colors">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "roleId",
      header: "Role",
      cell: ({ row }) => <span className="text-sm text-foreground">{roles.find((r) => r.id === row.original.roleId)?.name}</span>,
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.department || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "mfaEnabled",
      header: "2FA",
      cell: ({ row }) => <Badge variant={row.original.mfaEnabled ? "success" : "neutral"}>{row.original.mfaEnabled ? "On" : "Off"}</Badge>,
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last login",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditingUser(u);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit user
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setProfileUserId(u.id)}>
              <UserCog className="w-3.5 h-3.5" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResetTarget(u)}>
              <KeyRound className="w-3.5 h-3.5" />
              Reset password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {u.status === "active" ? (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: u.id, status: "inactive" })}>
                <UserX className="w-3.5 h-3.5" />
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: u.id, status: "active" })}>
                <UserCog className="w-3.5 h-3.5" />
                Activate
              </DropdownMenuItem>
            )}
            {u.status === "locked" ? (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: u.id, status: "active" })}>
                <Unlock className="w-3.5 h-3.5" />
                Unlock account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: u.id, status: "locked" })}>
                <Lock className="w-3.5 h-3.5" />
                Lock account
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteTarget(u)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete user
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="User management"
        description="Create and manage staff and administrator accounts."
        actions={
          <>
            <Button
              onClick={() => {
                setEditingUser(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add user
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        getRowId={(u) => u.id}
        empty={{ icon: UserCog, title: "No users yet", description: "Add staff and administrator accounts so they can sign in." }}
        filters={
          <>
            <SearchInput value={search} onValueChange={setSearch} placeholder="Search by name or email" containerClassName="sm:w-72" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:w-40" aria-label="Filter by role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
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
        columnToggle
        exportFileName="users"
        bulkActions={(selected, clear) => (
          <>
            <Button variant="outline" size="sm" loading={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ users: selected, status: "active" }, { onSuccess: clear })}>
              <UserCheck className="h-3.5 w-3.5" />
              Activate
            </Button>
            <Button variant="destructive-outline" size="sm" loading={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ users: selected, status: "inactive" }, { onSuccess: clear })}>
              <UserX className="h-3.5 w-3.5" />
              Deactivate
            </Button>
          </>
        )}
        pageSize={25}
      />

      <UserFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingUser(null);
        }}
        user={editingUser}
        roles={roles}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingUser) {
            await updateMutation.mutateAsync({ id: editingUser.id, values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />

      <UserProfileDialog
        user={profileUser}
        roles={roles}
        open={Boolean(profileUserId)}
        onOpenChange={(v) => !v && setProfileUserId(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete user"
        description={`This will permanently remove ${deleteTarget?.name}'s account. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(v) => !v && setResetTarget(null)}
        title="Reset password"
        description={`A temporary password will be generated and sent to ${resetTarget?.email}.`}
        confirmLabel="Send reset"
        submitting={resetMutation.isPending}
        onConfirm={() => {
          if (resetTarget) resetMutation.mutate(resetTarget.id);
        }}
      />
    </PageContainer>
  );
}
