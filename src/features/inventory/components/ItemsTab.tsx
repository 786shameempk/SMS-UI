import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatCurrency } from "@/utils/format";
import { ITEM_UNIT_OPTIONS } from "../constants";
import { createItem, deleteItem, listCategories, listItems, updateItem } from "../api";
import type { InventoryItem, InventoryItemFormValues } from "../types";
import ItemFormDialog from "./ItemFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function ItemsTab() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, isError, refetch } = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems });
  const { data: categories = [] } = useQuery({ queryKey: ["inventory", "categories"], queryFn: listCategories });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c] as const)), [categories]);
  const unitLabel = useMemo(() => new Map(ITEM_UNIT_OPTIONS.map((o) => [o.value, o.label] as const)), []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory"] });

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      invalidate();
      toast.success("Item created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create item"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: InventoryItemFormValues }) => updateItem(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Item updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update item"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      invalidate();
      toast.success(`${deleteTarget?.name} removed`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete item"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchesSearch = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || i.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const columns: ColumnDef<InventoryItem, unknown>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="text-sm font-medium text-foreground tabular-nums">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.location ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="info">{categoryById.get(row.original.categoryId)?.name ?? "—"}</Badge>,
    },
    {
      id: "stock",
      header: "Stock on hand",
      cell: ({ row }) => {
        const item = row.original;
        const low = item.quantityInStock <= item.reorderLevel;
        return (
          <Badge variant={item.quantityInStock === 0 ? "danger" : low ? "warning" : "success"}>
            {item.quantityInStock} {unitLabel.get(item.unit)}
            {item.quantityInStock === 1 ? "" : "s"}
          </Badge>
        );
      },
    },
    {
      id: "reorderLevel",
      header: "Reorder level",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.reorderLevel}</span>,
    },
    {
      id: "unitCost",
      header: "Unit cost",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{formatCurrency(row.original.unitCost)}</span>,
    },
    {
      id: "value",
      header: "Stock value",
      cell: ({ row }) => (
        <span className="text-sm text-foreground tabular-nums">{formatCurrency(row.original.quantityInStock * row.original.unitCost)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(item);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(item)} variant="destructive">
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
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by code or name" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add item
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No items match your filters." pageSize={10} />

      <ItemFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        item={editing}
        categories={categories}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete item"
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
