import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACADEMIC_YEAR_STATUSES } from "../constants";
import type { AcademicYear, AcademicYearFormValues } from "../types";

import { useTranslation } from "react-i18next";
const academicYearFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isCurrent: z.boolean(),
  status: z.enum(ACADEMIC_YEAR_STATUSES),
});

const emptyValues: AcademicYearFormValues = { name: "", startDate: "", endDate: "", isCurrent: false, status: "upcoming" };

export default function AcademicYearFormDialog({
  open,
  onOpenChange,
  academicYear,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYear?: AcademicYear | null;
  onSubmit: (values: AcademicYearFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("academics");
  const isEdit = Boolean(academicYear);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AcademicYearFormValues>({ resolver: zodResolver(academicYearFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        academicYear
          ? {
              name: academicYear.name,
              startDate: academicYear.startDate,
              endDate: academicYear.endDate,
              isCurrent: academicYear.isCurrent,
              status: academicYear.status,
            }
          : emptyValues,
      );
    }
  }, [open, academicYear, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit academic year") : t("New academic year")}</DialogTitle>
          <DialogDescription>{t("Academic years anchor terms, classes, and the school calendar.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" required>{t("Name")}</Label>
            <Input id="name" placeholder={t("e.g. 2025-2026")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" required>{t("Start date")}</Label>
              <Input id="startDate" type="date" aria-invalid={errors.startDate ? true : undefined} {...register("startDate")} />
              {errors.startDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" required>{t("End date")}</Label>
              <Input id="endDate" type="date" aria-invalid={errors.endDate ? true : undefined} {...register("endDate")} />
              {errors.endDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="status" required>{t("Status")}</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_YEAR_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-center gap-2 h-10">
              <Controller
                control={control}
                name="isCurrent"
                render={({ field }) => <Switch id="isCurrent" checked={field.value} onCheckedChange={field.onChange} />}
              />
              <Label htmlFor="isCurrent">{t("Set as current year")}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Create academic year")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
