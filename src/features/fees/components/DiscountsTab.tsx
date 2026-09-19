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
import { createDiscount, deleteDiscount, listDiscounts, updateDiscount } from "../api";
import type { FeeDiscount, FeeDiscountFormValues } from "../types";
import DiscountFormDialog from "./DiscountFormDialog";

export default function DiscountsTab() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeeDiscount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeDiscount | null>(null);

  const { data: discounts = [], isLoading } = useQuery({ queryKey: ["fees", "discounts"], queryFn: listDiscounts });
  const { data: students = [] } = useQuery({ queryKey: ["students", "all"], queryFn: listStudents });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fees"] });

  const createMutation = useMutation({
    mutationFn: createDiscount,
    onSuccess: () => {
      invalidate();
      toast.success("Discount created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create discount"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FeeDiscountFormValues }) => updateDiscount(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Discount updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update discount"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiscount,
    onSuccess: () => {
      invalidate();
      toast.success("Discount deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete discount"),
  });

  const columns: ColumnDef<FeeDiscount, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.name}</span> },
    {
      id: "value",
      header: "Value",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700 tabular-nums">
          {row.original.type === "percentage" ? `${row.original.value}%` : `₹${row.original.value.toLocaleString("en-IN")}`}
        </span>
      ),
    },
    {
      id: "appliesTo",
      header: "Applies to",
      cell: ({ row }) => (
        <Badge variant={row.original.appliesTo === "all" ? "info" : "default"}>
          {row.original.appliesTo === "all" ? "All students" : `${row.original.studentIds.length} student(s)`}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-slate-500">{row.original.description ?? "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const discount = row.original;
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
                  setEditing(discount);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(discount)}>
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
        <p className="text-sm text-muted-foreground">Manage discounts and scholarships that reduce invoice amounts.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New discount
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={discounts} isLoading={isLoading} emptyMessage="No discounts configured yet." />

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
        title="Delete discount"
        description={`Delete "${deleteTarget?.name}"? Invoices that already applied it keep their discounted amount.`}
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
