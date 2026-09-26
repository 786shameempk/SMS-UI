import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import {
  createAuthor,
  createCategory,
  createPublisher,
  deleteAuthor,
  deleteCategory,
  deletePublisher,
  listAuthors,
  listCategories,
  listPublishers,
  updateAuthor,
  updateCategory,
  updatePublisher,
} from "../api";
import type { Author, AuthorFormValues, BookCategory, BookCategoryFormValues, Publisher, PublisherFormValues } from "../types";
import AuthorFormDialog from "./AuthorFormDialog";
import PublisherFormDialog from "./PublisherFormDialog";
import CategoryFormDialog from "./CategoryFormDialog";

function EntityList<T extends { id: string; name: string }>({
  title,
  description,
  items,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  items: T[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  return (
    <Card className="flex-1 min-w-[260px]">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {isLoading && <p className="text-sm text-muted-foreground py-2">Loading…</p>}
        {!isLoading && items.length === 0 && <p className="text-sm text-muted-foreground py-2">No entries yet.</p>}
        {!isLoading &&
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground truncate">{item.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(item)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

export default function AuthorsPublishersCategoriesTab() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["library"] });

  const { data: authors = [], isLoading: authorsLoading } = useQuery({ queryKey: ["library", "authors"], queryFn: listAuthors });
  const { data: publishers = [], isLoading: publishersLoading } = useQuery({ queryKey: ["library", "publishers"], queryFn: listPublishers });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({ queryKey: ["library", "categories"], queryFn: listCategories });

  const [authorForm, setAuthorForm] = useState<{ open: boolean; editing: Author | null }>({ open: false, editing: null });
  const [publisherForm, setPublisherForm] = useState<{ open: boolean; editing: Publisher | null }>({ open: false, editing: null });
  const [categoryForm, setCategoryForm] = useState<{ open: boolean; editing: BookCategory | null }>({ open: false, editing: null });

  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "author" | "publisher" | "category"; item: Author | Publisher | BookCategory } | null
  >(null);

  const authorCreate = useMutation({
    mutationFn: createAuthor,
    onSuccess: () => {
      invalidate();
      toast.success("Author added");
      setAuthorForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add author"),
  });
  const authorUpdate = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AuthorFormValues }) => updateAuthor(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Author updated");
      setAuthorForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update author"),
  });

  const publisherCreate = useMutation({
    mutationFn: createPublisher,
    onSuccess: () => {
      invalidate();
      toast.success("Publisher added");
      setPublisherForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add publisher"),
  });
  const publisherUpdate = useMutation({
    mutationFn: ({ id, values }: { id: string; values: PublisherFormValues }) => updatePublisher(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Publisher updated");
      setPublisherForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update publisher"),
  });

  const categoryCreate = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      invalidate();
      toast.success("Category added");
      setCategoryForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add category"),
  });
  const categoryUpdate = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BookCategoryFormValues }) => updateCategory(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Category updated");
      setCategoryForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: NonNullable<typeof deleteTarget>) => {
      if (target.kind === "author") return deleteAuthor(target.item.id);
      if (target.kind === "publisher") return deletePublisher(target.item.id);
      return deleteCategory(target.item.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete"),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap lg:flex-nowrap">
        <EntityList
          title="Authors"
          description="Book authors referenced by the catalog."
          items={authors}
          isLoading={authorsLoading}
          onAdd={() => setAuthorForm({ open: true, editing: null })}
          onEdit={(item) => setAuthorForm({ open: true, editing: item })}
          onDelete={(item) => setDeleteTarget({ kind: "author", item })}
        />
        <EntityList
          title="Publishers"
          description="Publishing houses referenced by the catalog."
          items={publishers}
          isLoading={publishersLoading}
          onAdd={() => setPublisherForm({ open: true, editing: null })}
          onEdit={(item) => setPublisherForm({ open: true, editing: item })}
          onDelete={(item) => setDeleteTarget({ kind: "publisher", item })}
        />
        <EntityList
          title="Categories"
          description="Genres and subjects used to organize books."
          items={categories}
          isLoading={categoriesLoading}
          onAdd={() => setCategoryForm({ open: true, editing: null })}
          onEdit={(item) => setCategoryForm({ open: true, editing: item })}
          onDelete={(item) => setDeleteTarget({ kind: "category", item })}
        />
      </div>

      <AuthorFormDialog
        open={authorForm.open}
        onOpenChange={(open) => setAuthorForm((s) => ({ open, editing: open ? s.editing : null }))}
        author={authorForm.editing}
        submitting={authorCreate.isPending || authorUpdate.isPending}
        onSubmit={async (values) => {
          if (authorForm.editing) await authorUpdate.mutateAsync({ id: authorForm.editing.id, values });
          else await authorCreate.mutateAsync(values);
        }}
      />
      <PublisherFormDialog
        open={publisherForm.open}
        onOpenChange={(open) => setPublisherForm((s) => ({ open, editing: open ? s.editing : null }))}
        publisher={publisherForm.editing}
        submitting={publisherCreate.isPending || publisherUpdate.isPending}
        onSubmit={async (values) => {
          if (publisherForm.editing) await publisherUpdate.mutateAsync({ id: publisherForm.editing.id, values });
          else await publisherCreate.mutateAsync(values);
        }}
      />
      <CategoryFormDialog
        open={categoryForm.open}
        onOpenChange={(open) => setCategoryForm((s) => ({ open, editing: open ? s.editing : null }))}
        category={categoryForm.editing}
        submitting={categoryCreate.isPending || categoryUpdate.isPending}
        onSubmit={async (values) => {
          if (categoryForm.editing) await categoryUpdate.mutateAsync({ id: categoryForm.editing.id, values });
          else await categoryCreate.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.kind ?? ""}`}
        description={`Delete "${deleteTarget?.item.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}
