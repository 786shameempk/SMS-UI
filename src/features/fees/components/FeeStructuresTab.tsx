import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listAcademicYears, listClasses, listTerms } from "@/features/academics/api";
import {
  createFeeStructure,
  deleteFeeStructure,
  generateInvoicesForStructure,
  listFeeStructures,
  updateFeeStructure,
} from "../api";
import { FEE_TYPE_OPTIONS, FREQUENCY_OPTIONS } from "../constants";
import type { FeeStructure, FeeStructureFormValues, GenerateInvoicesParams } from "../types";
import FeeStructureFormDialog from "./FeeStructureFormDialog";
import GenerateInvoicesDialog from "./GenerateInvoicesDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function FeeStructuresTab() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const { data: structures = [], isLoading, isError, refetch } = useQuery({ queryKey: ["fees", "structures"], queryFn: listFeeStructures });
  const { data: academicYears = [] } = useQuery({ queryKey: ["academics", "academic-years"], queryFn: listAcademicYears });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: terms = [] } = useQuery({ queryKey: ["academics", "terms"], queryFn: listTerms });

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c] as const)), [classes]);
  const yearById = useMemo(() => new Map(academicYears.map((y) => [y.id, y] as const)), [academicYears]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fees"] });

  const createMutation = useMutation({
    mutationFn: createFeeStructure,
    onSuccess: () => {
      invalidate();
      toast.success("Fee structure created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create fee structure"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FeeStructureFormValues }) => updateFeeStructure(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Fee structure updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update fee structure"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeeStructure,
    onSuccess: () => {
      invalidate();
      toast.success("Fee structure deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete fee structure"),
  });

  const generateMutation = useMutation({
    mutationFn: (params: GenerateInvoicesParams) => generateInvoicesForStructure(params),
    onSuccess: (result) => {
      invalidate();
      toast.success(
        result.createdCount > 0
          ? `${result.createdCount} invoice${result.createdCount === 1 ? "" : "s"} generated${result.skippedCount ? ` (${result.skippedCount} already existed)` : ""}`
          : "No new invoices generated — they already exist for this term",
      );
      setGenerateOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not generate invoices"),
  });

  const columns: ColumnDef<FeeStructure, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    {
      id: "class",
      header: "Class",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">{row.original.classId ? classById.get(row.original.classId)?.name ?? "—" : "All classes"}</span>
      ),
    },
    {
      id: "academicYear",
      header: "Academic year",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{yearById.get(row.original.academicYearId)?.name ?? "—"}</span>,
    },
    {
      accessorKey: "feeType",
      header: "Fee type",
      cell: ({ row }) => <Badge variant="info">{FEE_TYPE_OPTIONS.find((o) => o.value === row.original.feeType)?.label}</Badge>,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">₹{row.original.amount.toLocaleString("en-IN")}</span>,
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{FREQUENCY_OPTIONS.find((o) => o.value === row.original.frequency)?.label}</span>,
    },
    {
      id: "fine",
      header: "Late fine",
      cell: ({ row }) => {
        const { lateFineFlat, lateFinePerDay } = row.original;
        if (!lateFineFlat && !lateFinePerDay) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <span className="text-sm text-secondary-foreground">
            {lateFineFlat ? `₹${lateFineFlat} flat` : ""}
            {lateFineFlat && lateFinePerDay ? " + " : ""}
            {lateFinePerDay ? `₹${lateFinePerDay}/day` : ""}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const structure = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(structure);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(structure)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">Define what each class/fee-type combination should charge.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGenerateOpen(true)}>
            <Zap className="w-4 h-4" />
            Generate invoices
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New fee structure
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={structures} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No fee structures defined yet." />

      <FeeStructureFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        structure={editing}
        academicYears={academicYears}
        classes={classes}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <GenerateInvoicesDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        academicYears={academicYears}
        terms={terms}
        structures={structures}
        submitting={generateMutation.isPending}
        onSubmit={async (values) => {
          await generateMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete fee structure"
        description={`Delete "${deleteTarget?.name}"? Existing invoices generated from it are not removed.`}
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
