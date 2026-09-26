import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ItemCategory, ItemCategoryFormValues } from "../types";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof categorySchema>;

const emptyValues: FormValues = { name: "", description: "" };

export default function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ItemCategory | null;
  submitting: boolean;
  onSubmit: (values: ItemCategoryFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(category);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(categorySchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(category ? { name: category.name, description: category.description ?? "" } : emptyValues);
  }, [open, category, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Categories group items for filtering and valuation reports.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, description: values.description?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" required>Name</Label>
            <Input id="cat-name" placeholder="e.g. Stationery" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-description" optional>Description</Label>
            <Input id="cat-description" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
