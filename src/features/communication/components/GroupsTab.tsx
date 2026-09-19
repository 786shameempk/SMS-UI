import { useState } from "react";
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
import { AUDIENCE_TYPE_OPTIONS } from "../constants";
import { createGroup, deleteGroup, listGroups, updateGroup } from "../api";
import type { ContactGroup, ContactGroupFormValues } from "../types";
import GroupFormDialog from "./GroupFormDialog";

export default function GroupsTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactGroup | null>(null);

  const { data: groups = [], isLoading } = useQuery({ queryKey: ["communication", "groups"], queryFn: listGroups });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["communication"] });

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      invalidate();
      toast.success("Group created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create group"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ContactGroupFormValues }) => updateGroup(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Group updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update group"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      invalidate();
      toast.success("Group deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete group"),
  });

  const columns: ColumnDef<ContactGroup, unknown>[] = [
    {
      accessorKey: "name",
      header: "Group",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.name}</p>
          {row.original.description && <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>}
        </div>
      ),
    },
    {
      id: "audience",
      header: "Audience",
      cell: ({ row }) => <Badge variant="info">{AUDIENCE_TYPE_OPTIONS.find((o) => o.value === row.original.audienceType)?.label}</Badge>,
    },
    {
      id: "members",
      header: "Members",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.memberIds.length}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const group = row.original;
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
                  setEditing(group);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(group)}>
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
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Named recipient lists you can target quickly when composing.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New group
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={groups} isLoading={isLoading} emptyMessage="No groups yet." pageSize={8} />

      <GroupFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        group={editing}
        students={students}
        staff={staff}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete group"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
