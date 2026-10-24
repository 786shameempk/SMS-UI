import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "../api";
import { ACCOUNT_TYPE_CONFIG, ACCOUNT_TYPE_OPTIONS } from "../constants";
import type { Account, AccountFormValues } from "../types";
import AccountFormDialog from "./AccountFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function ChartOfAccountsTab() {
  const { t } = useTranslation("accounting");
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading, isError, refetch } = useQuery({ queryKey: ["accounting", "accounts"], queryFn: listAccounts });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["accounting", "accounts"] });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      invalidate();
      toast.success(t("Account created"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not create account")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AccountFormValues }) => updateAccount(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Account updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update account")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      invalidate();
      toast.success(t("{{name}} removed", { name: deleteTarget?.name }));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete account")),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [accounts, search, typeFilter]);

  const columns: ColumnDef<Account, unknown>[] = [
    {
      accessorKey: "code",
      header: t("Code"),
      cell: ({ row }) => <span className="text-sm font-medium text-foreground tabular-nums">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: t("Name"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.name}</p>
          {row.original.description && <p className="text-xs text-muted-foreground">{row.original.description}</p>}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("Type"),
      cell: ({ row }) => {
        const config = ACCOUNT_TYPE_CONFIG[row.original.type];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const account = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(account);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(account)} variant="destructive">
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
        <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search by code or name")} containerClassName="sm:w-72" />
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All types")}</SelectItem>
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.label)}
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
            {t("Add account")}
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No accounts match your filters.")} />

      <AccountFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        account={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) {
            await updateMutation.mutateAsync({ id: editing.id, values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete account")}
        description={t("Delete \"{{name}}\"? This cannot be undone.", { name: deleteTarget?.name })}
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
