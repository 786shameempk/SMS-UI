import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { bulkCreateMembers, createMember, deleteMember, listMembers, updateMember } from "../api";
import { MEMBER_STATUS_CONFIG } from "../constants";
import type { LibraryMember, LibraryMemberFormValues } from "../types";
import BulkMembersDialog from "./BulkMembersDialog";
import MemberFormDialog from "./MemberFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function MembersTab() {
  const { t } = useTranslation("library");
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryMember | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: members = [], isLoading, isError, refetch } = useQuery({ queryKey: ["library", "members"], queryFn: listMembers });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s] as const)), [staff]);

  const personName = (member: LibraryMember): string => {
    if (member.personType === "student") {
      const s = studentById.get(member.personId);
      return s ? `${s.firstName} ${s.lastName}` : t("Unknown student");
    }
    const s = staffById.get(member.personId);
    return s ? `${s.firstName} ${s.lastName}` : t("Unknown staff");
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["library"] });

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      invalidate();
      toast.success(t("Member added"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not add member")),
  });

  const bulkMutation = useMutation({
    mutationFn: (people: { personType: "student" | "staff"; personId: string }[]) => bulkCreateMembers(people),
    onSuccess: (result) => {
      invalidate();
      toast.success(
        result.alreadyMembers > 0
          ? result.created === 1
            ? t("Added {{count}} member ({{already}} already members)", { count: result.created, already: result.alreadyMembers })
            : t("Added {{count}} members ({{already}} already members)", { count: result.created, already: result.alreadyMembers })
          : result.created === 1
            ? t("Added {{count}} member", { count: result.created })
            : t("Added {{count}} members", { count: result.created }),
      );
      setBulkOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: LibraryMemberFormValues }) => updateMember(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Member updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update member")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      invalidate();
      toast.success(t("Member removed"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not remove member")),
  });

  const columns: ColumnDef<LibraryMember, unknown>[] = [
    { accessorKey: "membershipId", header: t("Membership ID"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.membershipId}</span> },
    { id: "name", header: t("Name"), cell: ({ row }) => <span className="text-sm text-foreground">{personName(row.original)}</span> },
    {
      id: "personType",
      header: t("Type"),
      cell: ({ row }) => <Badge variant="neutral">{row.original.personType === "student" ? t("Student") : t("Staff")}</Badge>,
    },
    {
      id: "joinedOn",
      header: t("Joined"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.joinedOn).toLocaleDateString()}</span>,
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = MEMBER_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const member = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(member);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(member)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t("Remove")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Borrowers linked to existing student and staff records.")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Users className="w-4 h-4" />
            {t("Add in bulk")}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {t("New member")}
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={members} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No library members yet.")} />

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

      <BulkMembersDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        students={students}
        staff={staff}
        members={members}
        submitting={bulkMutation.isPending}
        onSubmit={async (people) => {
          await bulkMutation.mutateAsync(people).catch(() => undefined);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Remove member")}
        description={t('Remove "{{name}}" from library membership? This cannot be undone.', { name: deleteTarget ? personName(deleteTarget) : "" })}
        confirmLabel={t("Remove")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
