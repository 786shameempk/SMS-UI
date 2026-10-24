import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, QrCode, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createBook, deleteBook, listAuthors, listBooks, listCategories, listPublishers, updateBook } from "../api";
import type { Book, BookFormValues } from "../types";
import BulkBooksImportDialog from "./BulkBooksImportDialog";
import BookFormDialog from "./BookFormDialog";
import BookCodesDialog from "./BookCodesDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function BooksTab() {
  const { t } = useTranslation("library");
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [codesTarget, setCodesTarget] = useState<Book | null>(null);

  const { data: books = [], isLoading, isError, refetch } = useQuery({ queryKey: ["library", "books"], queryFn: listBooks });
  const { data: authors = [] } = useQuery({ queryKey: ["library", "authors"], queryFn: listAuthors });
  const { data: publishers = [] } = useQuery({ queryKey: ["library", "publishers"], queryFn: listPublishers });
  const { data: categories = [] } = useQuery({ queryKey: ["library", "categories"], queryFn: listCategories });

  const authorById = useMemo(() => new Map(authors.map((a) => [a.id, a] as const)), [authors]);
  const publisherById = useMemo(() => new Map(publishers.map((p) => [p.id, p] as const)), [publishers]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c] as const)), [categories]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["library"] });

  const createMutation = useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      invalidate();
      toast.success(t("Book added to catalog"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not add book")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BookFormValues }) => updateBook(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Book updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update book")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      invalidate();
      toast.success(t("Book deleted"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete book")),
  });

  const columns: ColumnDef<Book, unknown>[] = [
    {
      accessorKey: "title",
      header: t("Title"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.isbn}</p>
        </div>
      ),
    },
    {
      id: "author",
      header: t("Author"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{authorById.get(row.original.authorId)?.name ?? "—"}</span>,
    },
    {
      id: "publisher",
      header: t("Publisher"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{publisherById.get(row.original.publisherId)?.name ?? "—"}</span>,
    },
    {
      id: "category",
      header: t("Category"),
      cell: ({ row }) => <Badge variant="info">{categoryById.get(row.original.categoryId)?.name ?? "—"}</Badge>,
    },
    {
      id: "availability",
      header: t("Availability"),
      cell: ({ row }) => {
        const { availableCopies, totalCopies } = row.original;
        return (
          <Badge variant={availableCopies === 0 ? "danger" : availableCopies < totalCopies ? "warning" : "success"}>
            {t("{{available}} / {{total}} available", { available: availableCopies, total: totalCopies })}
          </Badge>
        );
      },
    },
    {
      id: "shelfLocation",
      header: t("Shelf"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.shelfLocation ?? "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const book = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => setCodesTarget(book)}>
              <QrCode className="w-3.5 h-3.5" />
              {t("View barcode / QR")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditing(book);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(book)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">{t("Manage the book catalog, copies, and shelf locations.")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" />
            {t("Import")}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {t("New book")}
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={books} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No books in the catalog yet.")} pageSize={8} />

      <BulkBooksImportDialog open={importOpen} onOpenChange={setImportOpen} onFinished={() => queryClient.invalidateQueries({ queryKey: ["library"] })} />

      <BookFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        book={editing}
        authors={authors}
        publishers={publishers}
        categories={categories}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <BookCodesDialog open={Boolean(codesTarget)} onOpenChange={(v) => !v && setCodesTarget(null)} book={codesTarget} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete book")}
        description={t('Delete "{{name}}"? This cannot be undone.', { name: deleteTarget?.title })}
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
