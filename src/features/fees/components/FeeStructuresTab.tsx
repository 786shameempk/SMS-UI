import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("fees");
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

  const translateLabel = (label: string | undefined) => (label ? t(label) : label);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fees"] });

  const createMutation = useMutation({
    mutationFn: createFeeStructure,
    onSuccess: () => {
      invalidate();
      toast.success(t("Fee structure created"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not create fee structure")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FeeStructureFormValues }) => updateFeeStructure(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Fee structure updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update fee structure")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeeStructure,
    onSuccess: () => {
      invalidate();
      toast.success(t("Fee structure deleted"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete fee structure")),
  });

  const generateMutation = useMutation({
    mutationFn: (params: GenerateInvoicesParams) => generateInvoicesForStructure(params),
    onSuccess: (result) => {
      invalidate();
      const created = result.createdCount;
      const skipped = result.skippedCount;
      toast.success(
        created > 0
          ? skipped
            ? created === 1
              ? t("1 invoice generated ({{skipped}} already existed)", { skipped })
              : t("{{count}} invoices generated ({{skipped}} already existed)", { count: created, skipped })
            : created === 1
              ? t("1 invoice generated")
              : t("{{count}} invoices generated", { count: created })
          : t("No new invoices generated — they already exist for this term"),
      );
      setGenerateOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not generate invoices")),
  });

  const columns: ColumnDef<FeeStructure, unknown>[] = [
    { accessorKey: "name", header: t("Name"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    {
      id: "class",
      header: t("Class"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">{row.original.classId ? classById.get(row.original.classId)?.name ?? "—" : t("All classes")}</span>
      ),
    },
    {
      id: "academicYear",
      header: t("Academic year"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{yearById.get(row.original.academicYearId)?.name ?? "—"}</span>,
    },
    {
      accessorKey: "feeType",
      header: t("Fee type"),
      cell: ({ row }) => <Badge variant="info">{translateLabel(FEE_TYPE_OPTIONS.find((o) => o.value === row.original.feeType)?.label)}</Badge>,
    },
    {
      accessorKey: "amount",
      header: t("Amount"),
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">₹{row.original.amount.toLocaleString("en-IN")}</span>,
    },
    {
      accessorKey: "frequency",
      header: t("Frequency"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{translateLabel(FREQUENCY_OPTIONS.find((o) => o.value === row.original.frequency)?.label)}</span>,
    },
    {
      id: "fine",
      header: t("Late fine"),
      cell: ({ row }) => {
        const { lateFineFlat, lateFinePerDay } = row.original;
        if (!lateFineFlat && !lateFinePerDay) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <span className="text-sm text-secondary-foreground">
            {lateFineFlat ? t("₹{{amount}} flat", { amount: lateFineFlat }) : ""}
            {lateFineFlat && lateFinePerDay ? " + " : ""}
            {lateFinePerDay ? t("₹{{amount}}/day", { amount: lateFinePerDay }) : ""}
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
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(structure)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Define what each class/fee-type combination should charge.")}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGenerateOpen(true)}>
            <Zap className="w-4 h-4" />
            {t("Generate invoices")}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {t("New fee structure")}
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={structures} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No fee structures defined yet.")} />

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
        title={t("Delete fee structure")}
        description={t('Delete "{{name}}"? Existing invoices generated from it are not removed.', { name: String(deleteTarget?.name) })}
        confirmLabel={t("Delete")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
