import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { CHANNELS } from "../constants";
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from "../api";
import type { MessageTemplate, MessageTemplateFormValues } from "../types";
import TemplateFormDialog from "./TemplateFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function TemplatesTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplate | null>(null);

  const { data: templates = [], isLoading, isError, refetch } = useQuery({ queryKey: ["communication", "templates"], queryFn: listTemplates });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["communication", "templates"] });

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      invalidate();
      toast.success("Template created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create template"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: MessageTemplateFormValues }) => updateTemplate(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Template updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      invalidate();
      toast.success("Template deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete template"),
  });

  const columns: ColumnDef<MessageTemplate, unknown>[] = [
    {
      accessorKey: "name",
      header: "Template",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{row.original.subject ?? row.original.body}</p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => (row.original.category ? <Badge variant="info">{row.original.category}</Badge> : <span className="text-sm text-muted-foreground">—</span>),
    },
    {
      id: "channels",
      header: "Default channels",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.channels.map((c) => (
            <Badge key={c} variant="neutral">
              {CHANNELS.find((ch) => ch.value === c)?.label ?? c}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const template = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(template);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(template)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Reusable message content for composing broadcasts quickly.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New template
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={templates} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No templates yet." pageSize={8} />

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        template={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete template"
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
