import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createBook, deleteBook, listAuthors, listBooks, listCategories, listPublishers, updateBook } from "../api";
import type { Book, BookFormValues } from "../types";
import BookFormDialog from "./BookFormDialog";
import BookCodesDialog from "./BookCodesDialog";

export default function BooksTab() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [codesTarget, setCodesTarget] = useState<Book | null>(null);

  const { data: books = [], isLoading } = useQuery({ queryKey: ["library", "books"], queryFn: listBooks });
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
      toast.success("Book added to catalog");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add book"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BookFormValues }) => updateBook(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Book updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update book"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      invalidate();
      toast.success("Book deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete book"),
  });

  const columns: ColumnDef<Book, unknown>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.isbn}</p>
        </div>
      ),
    },
    {
      id: "author",
      header: "Author",
      cell: ({ row }) => <span className="text-sm text-slate-600">{authorById.get(row.original.authorId)?.name ?? "—"}</span>,
    },
    {
      id: "publisher",
      header: "Publisher",
      cell: ({ row }) => <span className="text-sm text-slate-600">{publisherById.get(row.original.publisherId)?.name ?? "—"}</span>,
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="info">{categoryById.get(row.original.categoryId)?.name ?? "—"}</Badge>,
    },
    {
      id: "availability",
      header: "Availability",
      cell: ({ row }) => {
        const { availableCopies, totalCopies } = row.original;
        return (
          <Badge variant={availableCopies === 0 ? "danger" : availableCopies < totalCopies ? "warning" : "success"}>
            {availableCopies} / {totalCopies} available
          </Badge>
        );
      },
    },
    {
      id: "shelfLocation",
      header: "Shelf",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.shelfLocation ?? "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const book = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCodesTarget(book)}>
                <QrCode className="w-3.5 h-3.5" />
                View barcode / QR
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(book);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(book)}>
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
        <p className="text-sm text-muted-foreground">Manage the book catalog, copies, and shelf locations.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New book
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={books} isLoading={isLoading} emptyMessage="No books in the catalog yet." pageSize={8} />

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
        title="Delete book"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
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
