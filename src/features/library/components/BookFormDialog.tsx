import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Author, Book, BookCategory, BookFormValues, Publisher } from "../types";

const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  isbn: z.string().min(6, "ISBN must be at least 6 characters"),
  authorId: z.string().min(1, "Select an author"),
  publisherId: z.string().min(1, "Select a publisher"),
  categoryId: z.string().min(1, "Select a category"),
  totalCopies: z.coerce.number().int().positive("Must have at least one copy"),
  shelfLocation: z.string().optional(),
  coverNote: z.string().optional(),
});

type FormValues = z.infer<typeof bookSchema>;

const emptyValues: FormValues = {
  title: "",
  isbn: "",
  authorId: "",
  publisherId: "",
  categoryId: "",
  totalCopies: 1,
  shelfLocation: "",
  coverNote: "",
};

export default function BookFormDialog({
  open,
  onOpenChange,
  book,
  authors,
  publishers,
  categories,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book | null;
  authors: Author[];
  publishers: Publisher[];
  categories: BookCategory[];
  submitting: boolean;
  onSubmit: (values: BookFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(book);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(bookSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      book
        ? {
            title: book.title,
            isbn: book.isbn,
            authorId: book.authorId,
            publisherId: book.publisherId,
            categoryId: book.categoryId,
            totalCopies: book.totalCopies,
            shelfLocation: book.shelfLocation ?? "",
            coverNote: book.coverNote ?? "",
          }
        : emptyValues,
    );
  }, [open, book, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit book" : "New book"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changing the total copies adjusts availability while preserving copies currently on loan."
              : "New books start with every copy available to issue."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              shelfLocation: values.shelfLocation?.trim() || undefined,
              coverNote: values.coverNote?.trim() || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="bk-title" required>Title</Label>
            <Input id="bk-title" placeholder="e.g. Malgudi Days" aria-invalid={errors.title ? true : undefined} {...register("title")} />
            {errors.title && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bk-isbn" required>ISBN</Label>
              <Input id="bk-isbn" placeholder="e.g. 9780143039655" aria-invalid={errors.isbn ? true : undefined} {...register("isbn")} />
              {errors.isbn && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.isbn.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-totalCopies" required>Total copies</Label>
              <Input id="bk-totalCopies" type="number" min="1" step="1" aria-invalid={errors.totalCopies ? true : undefined} {...register("totalCopies")} />
              {errors.totalCopies && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.totalCopies.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-authorId" required>Author</Label>
            <Controller
              control={control}
              name="authorId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="bk-authorId">
                    <SelectValue placeholder="Select author" />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.authorId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.authorId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bk-publisherId" required>Publisher</Label>
              <Controller
                control={control}
                name="publisherId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="bk-publisherId">
                      <SelectValue placeholder="Select publisher" />
                    </SelectTrigger>
                    <SelectContent>
                      {publishers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.publisherId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.publisherId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-categoryId" required>Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="bk-categoryId">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.categoryId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-shelfLocation" optional>Shelf location</Label>
            <Input id="bk-shelfLocation" placeholder="e.g. F-12" {...register("shelfLocation")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-coverNote" optional>Note</Label>
            <Textarea id="bk-coverNote" rows={2} {...register("coverNote")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
