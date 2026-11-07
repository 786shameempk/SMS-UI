import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Section, SectionFormValues } from "../types";
import { MAX_SECTIONS_AT_ONCE, parseSectionNames } from "../sectionNames";

import { useTranslation } from "react-i18next";
const sectionFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .refine((v) => parseSectionNames(v).length > 0, "Name is required")
    .refine((v) => parseSectionNames(v).length <= MAX_SECTIONS_AT_ONCE, `At most ${MAX_SECTIONS_AT_ONCE} divisions at once`),
  classId: z.string().min(1, "Select a standard"),
  classTeacherName: z.string().optional(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  currentStrength: z.coerce.number().int().min(0, "Cannot be negative"),
});

const emptyValues: SectionFormValues = { name: "", classId: "", classTeacherName: "", capacity: 40, currentStrength: 0 };

export default function SectionFormDialog({
  open,
  onOpenChange,
  section,
  classes,
  defaultClassId,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: Section | null;
  classes: SchoolClass[];
  defaultClassId?: string;
  onSubmit: (values: SectionFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("academics");
  const isEdit = Boolean(section);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<SectionFormValues>({ resolver: zodResolver(sectionFormSchema), defaultValues: emptyValues });

  const typedNames = isEdit ? [] : parseSectionNames(watch("name") ?? "");
  const selectedClassName = classes.find((c) => c.id === watch("classId"))?.name;

  useEffect(() => {
    if (open) {
      reset(
        section
          ? {
              name: section.name,
              classId: section.classId,
              classTeacherName: section.classTeacherName ?? "",
              capacity: section.capacity,
              currentStrength: section.currentStrength,
            }
          : { ...emptyValues, classId: defaultClassId ?? "" },
      );
    }
  }, [open, section, defaultClassId, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit division") : t("New division")}</DialogTitle>
          <DialogDescription>{t("Divisions are nested under a standard and track capacity and enrolled strength.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" required>{isEdit ? t("Name") : t("Division names")}</Label>
              <Input id="name" placeholder={isEdit ? t("e.g. Division A") : t("e.g. A, B, C")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
              {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
              {!isEdit && (
                <p className="text-xs text-muted-foreground">{t("Separate names with commas to add several divisions at once.")}</p>
              )}
              {!isEdit && (
                <p className="text-xs text-muted-foreground">{t("Separate names with commas to add several divisions at once.")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="classId" required>{t("Standard")}</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="classId">
                      <SelectValue placeholder={t("Select a standard")} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.classId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.classId.message}</p>}
            </div>
          </div>

          {typedNames.length > 1 && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-1.5" aria-live="polite">
              <p className="text-xs font-medium">{t("Will create {{count}} divisions", { count: typedNames.length })}</p>
              <div className="flex flex-wrap gap-1.5">
                {typedNames.map((n) => (
                  <span key={n} className="rounded-full border bg-background px-2 py-0.5 text-xs">
                    {selectedClassName ? `${selectedClassName} ${n}` : n}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="classTeacherName" optional>{t("Class teacher")}</Label>
            <Input id="classTeacherName" placeholder={t("Teacher name")} {...register("classTeacherName")} />
            <p className="text-xs text-muted-foreground">{t("Free-text for now until the teacher module is wired up.")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity" required>{t("Capacity")}</Label>
              <Input id="capacity" type="number" min={1} aria-invalid={errors.capacity ? true : undefined} {...register("capacity")} />
              {errors.capacity && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.capacity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentStrength" required>{t("Current strength")}</Label>
              <Input id="currentStrength" type="number" min={0} aria-invalid={errors.currentStrength ? true : undefined} {...register("currentStrength")} />
              {errors.currentStrength && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.currentStrength.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : typedNames.length > 1 ? t("Create {{count}} divisions", { count: typedNames.length }) : t("Create division")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
