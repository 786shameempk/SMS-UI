import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Plus, Trash2, Users, Wallet, WalletCards } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatCurrency } from "@/utils/format";
import { PAYROLL_RUN_STATUS_CONFIG, monthLabel } from "../constants";
import { deletePayrollRun, finalizePayrollRun, generatePayrollRun, listPayrollRuns } from "../api";
import type { PayrollRunSummary } from "../types";
import GeneratePayrollDialog from "./GeneratePayrollDialog";
import { StatCard } from "@/components/ui/stat-card";
import { RowActions } from "@/components/ui/row-actions";

function StatBlock({ label, value, icon }: { label: string; value: string; icon: typeof Wallet }) {
  return <StatCard label={label} value={value} icon={icon} />;
}

export default function PayrollRunsTab() {
  const queryClient = useQueryClient();
  const { data: runs = [], isLoading, isError, refetch } = useQuery({ queryKey: ["payroll", "runs"], queryFn: listPayrollRuns });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PayrollRunSummary | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["payroll"] });
  };

  const generateMutation = useMutation({
    mutationFn: generatePayrollRun,
    onSuccess: ({ createdCount, skippedCount }) => {
      invalidate();
      toast.success(`Generated ${createdCount} payslip${createdCount === 1 ? "" : "s"}${skippedCount ? ` (${skippedCount} already paid, skipped)` : ""}`);
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not generate payroll"),
  });

  const finalizeMutation = useMutation({
    mutationFn: finalizePayrollRun,
    onSuccess: (run) => {
      invalidate();
      toast.success(`${monthLabel(run.month)} payroll finalized`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not finalize run"),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayrollRun,
    onSuccess: () => {
      invalidate();
      toast.success("Draft run removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete run"),
  });

  const latest = runs[0];
  const pendingAcrossAll = useMemo(() => runs.reduce((sum, r) => sum + (r.staffCount - r.paidCount), 0), [runs]);

  const columns: ColumnDef<PayrollRunSummary, unknown>[] = [
    {
      accessorKey: "month",
      header: "Month",
      cell: ({ row }) => <span className="text-sm font-medium text-foreground">{monthLabel(row.original.month)}</span>,
    },
    {
      accessorKey: "staffCount",
      header: "Staff",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.staffCount}</span>,
    },
    {
      accessorKey: "totalNetPay",
      header: "Total net pay",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{formatCurrency(row.original.totalNetPay)}</span>,
    },
    {
      id: "paid",
      header: "Paid",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground tabular-nums">
          {row.original.paidCount}/{row.original.staffCount}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = PAYROLL_RUN_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const run = row.original;
        if (run.status !== "draft") return null;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => finalizeMutation.mutate(run.id)}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Finalize
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(run)} variant="destructive">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBlock label={latest ? `Payroll for ${monthLabel(latest.month)}` : "Latest payroll"} value={latest ? formatCurrency(latest.totalNetPay) : "—"} icon={Wallet} />
        <StatBlock label="Staff on latest run" value={latest ? String(latest.staffCount) : "—"} icon={Users} />
        <StatBlock label="Pending payslips (all runs)" value={String(pendingAcrossAll)} icon={WalletCards} />
      </div>

      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">One run per month, generated from each staff member's current salary structure.</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Generate payroll
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={runs} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No payroll runs yet." />

      <GeneratePayrollDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={generateMutation.isPending}
        onSubmit={async (month) => {
          await generateMutation.mutateAsync(month);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete draft payroll run"
        description={`Delete the draft payroll run for ${deleteTarget ? monthLabel(deleteTarget.month) : ""}? Its ${deleteTarget?.staffCount ?? 0} payslip(s) will be removed. This cannot be undone.`}
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
