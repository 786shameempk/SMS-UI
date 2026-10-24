import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Author, AuthorFormValues } from "../types";

const authorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
});

type FormValues = z.infer<typeof authorSchema>;

const emptyValues: FormValues = { name: "", bio: "" };

export default function AuthorFormDialog({
  open,
  onOpenChange,
  author,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author?: Author | null;
  submitting: boolean;
  onSubmit: (values: AuthorFormValues) => Promise<void>;
}) {
  const { t } = useTranslation("library");
  const isEdit = Boolean(author);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(authorSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(author ? { name: author.name, bio: author.bio ?? "" } : emptyValues);
  }, [open, author, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit author") : t("New author")}</DialogTitle>
          <DialogDescription>{t("Authors are referenced by books in the catalog.")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, bio: values.bio?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="auth-name" required>{t("Name")}</Label>
            <Input id="auth-name" placeholder={t("e.g. R.K. Narayan")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.name.message ?? "")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-bio" optional>{t("Bio")}</Label>
            <Textarea id="auth-bio" rows={3} {...register("bio")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Create author")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
