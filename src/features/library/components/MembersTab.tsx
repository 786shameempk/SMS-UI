import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { createMember, deleteMember, listMembers, updateMember } from "../api";
import { MEMBER_STATUS_CONFIG } from "../constants";
import type { LibraryMember, LibraryMemberFormValues } from "../types";
import MemberFormDialog from "./MemberFormDialog";

export default function MembersTab() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryMember | null>(null);

  const { data: members = [], isLoading } = useQuery({ queryKey: ["library", "members"], queryFn: listMembers });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s] as const)), [staff]);

  const personName = (member: LibraryMember): string => {
    if (member.personType === "student") {
      const s = studentById.get(member.personId);
      return s ? `${s.firstName} ${s.lastName}` : "Unknown student";
    }
    const s = staffById.get(member.personId);
    return s ? `${s.firstName} ${s.lastName}` : "Unknown staff";
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["library"] });

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      invalidate();
      toast.success("Member added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add member"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: LibraryMemberFormValues }) => updateMember(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Member updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update member"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      invalidate();
      toast.success("Member removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove member"),
  });

  const columns: ColumnDef<LibraryMember, unknown>[] = [
    { accessorKey: "membershipId", header: "Membership ID", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.membershipId}</span> },
    { id: "name", header: "Name", cell: ({ row }) => <span className="text-sm text-slate-700">{personName(row.original)}</span> },
    {
      id: "personType",
      header: "Type",
      cell: ({ row }) => <Badge variant="neutral">{row.original.personType === "student" ? "Student" : "Staff"}</Badge>,
    },
    {
      id: "joinedOn",
      header: "Joined",
      cell: ({ row }) => <span className="text-sm text-slate-600">{new Date(row.original.joinedOn).toLocaleDateString()}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = MEMBER_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const member = row.original;
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
                  setEditing(member);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(member)}>
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Borrowers linked to existing student and staff records.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New member
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={members} isLoading={isLoading} emptyMessage="No library members yet." />

      <MemberFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        member={editing}
        students={students}
        staff={staff}
        existingMembers={members}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove member"
        description={`Remove "${deleteTarget ? personName(deleteTarget) : ""}" from library membership? This cannot be undone.`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
