import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { createDiscount, deleteDiscount, listDiscounts, updateDiscount } from "../api";
import type { FeeDiscount, FeeDiscountFormValues } from "../types";
import DiscountFormDialog from "./DiscountFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function DiscountsTab() {
  const { t } = useTranslation("fees");
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeeDiscount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeDiscount | null>(null);

  const { data: discounts = [], isLoading, isError, refetch } = useQuery({ queryKey: ["fees", "discounts"], queryFn: listDiscounts });
  const { data: students = [] } = useQuery({ queryKey: ["students", "all"], queryFn: listStudents });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fees"] });

  const createMutation = useMutation({
    mutationFn: createDiscount,
    onSuccess: () => {
      invalidate();
      toast.success(t("Discount created"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not create discount")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FeeDiscountFormValues }) => updateDiscount(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Discount updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update discount")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiscount,
    onSuccess: () => {
      invalidate();
      toast.success(t("Discount deleted"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete discount")),
  });

  const columns: ColumnDef<FeeDiscount, unknown>[] = [
    { accessorKey: "name", header: t("Name"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    {
      id: "value",
      header: t("Value"),
      cell: ({ row }) => (
        <span className="text-sm text-foreground tabular-nums">
          {row.original.type === "percentage" ? `${row.original.value}%` : `₹${row.original.value.toLocaleString("en-IN")}`}
        </span>
      ),
    },
    {
      id: "appliesTo",
      header: t("Applies to"),
      cell: ({ row }) => (
        <Badge variant={row.original.appliesTo === "all" ? "info" : "default"}>
          {row.original.appliesTo === "all" ? t("All students") : t("{{count}} student(s)", { count: row.original.studentIds.length })}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description ?? "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const discount = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(discount);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(discount)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">{t("Manage discounts and scholarships that reduce invoice amounts.")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("New discount")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={discounts} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No discounts configured yet.")} />

      <DiscountFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        discount={editing}
        students={students}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete discount")}
        description={t('Delete "{{name}}"? Invoices that already applied it keep their discounted amount.', { name: String(deleteTarget?.name) })}
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
