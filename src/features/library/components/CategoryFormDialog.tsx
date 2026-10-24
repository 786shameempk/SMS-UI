import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BookCategory, BookCategoryFormValues } from "../types";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof categorySchema>;

const emptyValues: FormValues = { name: "" };

export default function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: BookCategory | null;
  submitting: boolean;
  onSubmit: (values: BookCategoryFormValues) => Promise<void>;
}) {
  const { t } = useTranslation("library");
  const isEdit = Boolean(category);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(categorySchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(category ? { name: category.name } : emptyValues);
  }, [open, category, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit category") : t("New category")}</DialogTitle>
          <DialogDescription>{t("Categories group books for browsing and reporting.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" required>{t("Name")}</Label>
            <Input id="cat-name" placeholder={t("e.g. Fiction")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.name.message ?? "")}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Create category")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
