import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import type { HealthCheckupFormValues } from "../types";

const checkupSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  checkupDate: z.string().min(1, "Checkup date is required"),
  heightCm: z.coerce.number().min(30, "Enter a valid height").max(250, "Enter a valid height"),
  weightKg: z.coerce.number().min(5, "Enter a valid weight").max(200, "Enter a valid weight"),
  visionLeft: z.string().min(1, "Left eye vision is required"),
  visionRight: z.string().min(1, "Right eye vision is required"),
  dentalRemarks: z.string().optional(),
  generalRemarks: z.string().optional(),
  examinedByStaffId: z.string().optional(),
});

type FormValues = z.infer<typeof checkupSchema>;

const emptyValues: FormValues = {
  studentId: "",
  checkupDate: new Date().toISOString().slice(0, 10),
  heightCm: 0,
  weightKg: 0,
  visionLeft: "6/6",
  visionRight: "6/6",
  dentalRemarks: "",
  generalRemarks: "",
  examinedByStaffId: "",
};

export default function CheckupFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: HealthCheckupFormValues) => Promise<void>;
}) {
  const { t } = useTranslation("health");
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(checkupSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Record a health checkup")}</DialogTitle>
          <DialogDescription>{t("Height, weight, vision, and dental notes from a routine or drive checkup.")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              dentalRemarks: values.dentalRemarks?.trim() || undefined,
              generalRemarks: values.generalRemarks?.trim() || undefined,
              examinedByStaffId: values.examinedByStaffId || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkup-studentId" required>{t("Student")}</Label>
              <Controller
                control={control}
                name="studentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="checkup-studentId">
                      <SelectValue placeholder={t("Select a student")} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} · {s.className} - {s.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.studentId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.studentId.message ?? "")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkup-date">{t("Checkup date")}</Label>
              <Input id="checkup-date" type="date" aria-invalid={errors.checkupDate ? true : undefined} {...register("checkupDate")} />
              {errors.checkupDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.checkupDate.message ?? "")}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkup-height">{t("Height (cm)")}</Label>
              <Input id="checkup-height" type="number" min="30" max="250" step="0.1" aria-invalid={errors.heightCm ? true : undefined} {...register("heightCm")} />
              {errors.heightCm && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.heightCm.message ?? "")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkup-weight">{t("Weight (kg)")}</Label>
              <Input id="checkup-weight" type="number" min="5" max="200" step="0.1" aria-invalid={errors.weightKg ? true : undefined} {...register("weightKg")} />
              {errors.weightKg && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.weightKg.message ?? "")}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkup-visionLeft" required>{t("Vision (left eye)")}</Label>
              <Input id="checkup-visionLeft" placeholder="e.g. 6/6" aria-invalid={errors.visionLeft ? true : undefined} {...register("visionLeft")} />
              {errors.visionLeft && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.visionLeft.message ?? "")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkup-visionRight" required>{t("Vision (right eye)")}</Label>
              <Input id="checkup-visionRight" placeholder="e.g. 6/6" aria-invalid={errors.visionRight ? true : undefined} {...register("visionRight")} />
              {errors.visionRight && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.visionRight.message ?? "")}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkup-dental" optional>{t("Dental remarks")}</Label>
            <Textarea id="checkup-dental" rows={2} {...register("dentalRemarks")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkup-general" optional>{t("General remarks")}</Label>
            <Textarea id="checkup-general" rows={2} {...register("generalRemarks")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkup-examinedBy" optional>{t("Examined by")}</Label>
            <Controller
              control={control}
              name="examinedByStaffId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="checkup-examinedBy">
                    <SelectValue placeholder={t("Select staff member")} />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} · {s.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {t("Save checkup")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
