import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatCurrency, formatRelativeDay } from "@/utils/format";
import { JOURNAL_STATUS_CONFIG } from "../constants";
import { createJournalEntry, deleteJournalEntry, listAccounts, listJournalEntries, postJournalEntry } from "../api";
import type { JournalEntry, JournalEntryFormValues } from "../types";
import JournalEntryFormDialog from "./JournalEntryFormDialog";
import JournalEntryDetailDialog from "./JournalEntryDetailDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function JournalTab() {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading, isError, refetch } = useQuery({ queryKey: ["accounting", "entries"], queryFn: listJournalEntries });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounting", "accounts"], queryFn: listAccounts });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["accounting", "entries"] });
    queryClient.invalidateQueries({ queryKey: ["accounting", "trial-balance"] });
    queryClient.invalidateQueries({ queryKey: ["accounting", "pnl"] });
    queryClient.invalidateQueries({ queryKey: ["accounting", "gst"] });
  };

  const createMutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      invalidate();
      toast.success("Journal entry saved as draft");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create entry"),
  });

  const postMutation = useMutation({
    mutationFn: postJournalEntry,
    onSuccess: (entry) => {
      invalidate();
      toast.success(`${entry.entryNumber} posted to the ledger`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not post entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJournalEntry(id),
    onSuccess: () => {
      invalidate();
      toast.success(`${deleteTarget?.entryNumber} removed`);
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(
    () => (statusFilter === "all" ? entries : entries.filter((e) => e.status === statusFilter)),
    [entries, statusFilter],
  );

  const columns: ColumnDef<JournalEntry, unknown>[] = [
    {
      accessorKey: "entryNumber",
      header: "Entry",
      cell: ({ row }) => (
        <button type="button" onClick={() => setDetailEntry(row.original)} className="text-left cursor-pointer group">
          <p className="text-sm font-medium text-foreground group-hover:text-primary-text transition-colors">{row.original.entryNumber}</p>
          <p className="text-xs text-muted-foreground">{formatRelativeDay(row.original.date)}</p>
        </button>
      ),
    },
    {
      accessorKey: "narration",
      header: "Narration",
      cell: ({ row }) => (
        <div className="min-w-0 max-w-xs">
          <p className="text-sm text-foreground truncate">{row.original.narration}</p>
          {row.original.reference && <p className="text-xs text-muted-foreground truncate">Ref: {row.original.reference}</p>}
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="text-sm text-foreground tabular-nums">
          {formatCurrency(row.original.lines.reduce((sum, l) => sum + l.debit, 0))}
        </span>
      ),
    },
    {
      id: "gst",
      header: "GST",
      cell: ({ row }) => (row.original.gstApplicable ? <Badge variant="info">Yes</Badge> : <span className="text-sm text-muted-foreground">—</span>),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = JOURNAL_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => setDetailEntry(entry)}>
              <Eye className="w-3.5 h-3.5" />
              View
            </DropdownMenuItem>
            {entry.status === "draft" && (
              <DropdownMenuItem onClick={() => postMutation.mutate(entry.id)}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Post to ledger
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteTarget(entry)} variant="destructive">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entries</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New entry
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No journal entries yet." pageSize={10} />

      <JournalEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        accounts={accounts}
        submitting={createMutation.isPending}
        onSubmit={async (values: JournalEntryFormValues) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <JournalEntryDetailDialog open={Boolean(detailEntry)} onOpenChange={(v) => !v && setDetailEntry(null)} entry={detailEntry} accounts={accounts} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete journal entry"
        description={
          deleteTarget?.status === "posted"
            ? `"${deleteTarget?.entryNumber}" has already been posted to the ledger — deleting it will affect the trial balance and reports. This cannot be undone.`
            : `Delete draft entry "${deleteTarget?.entryNumber}"? This cannot be undone.`
        }
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
