import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Term } from "@/features/academics/types";
import { EXAM_STATUSES, EXAM_TYPES, EXAM_TYPE_LABELS } from "../constants";
import type { Exam, ExamFormValues } from "../types";

import { useTranslation } from "react-i18next";
const examFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    examType: z.enum(EXAM_TYPES),
    termId: z.string().min(1, "Select a term"),
    classId: z.string().min(1, "Select a class"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    status: z.enum(EXAM_STATUSES),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be on or after the start date", path: ["endDate"] });

const emptyValues: ExamFormValues = {
  name: "",
  examType: "internal",
  termId: "",
  classId: "",
  startDate: "",
  endDate: "",
  status: "scheduled",
};

export default function ExamFormDialog({
  open,
  onOpenChange,
  exam,
  classes,
  terms,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Exam | null;
  classes: SchoolClass[];
  terms: Term[];
  onSubmit: (values: ExamFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t: tr } = useTranslation("examinations");
  const isEdit = Boolean(exam);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ExamFormValues>({ resolver: zodResolver(examFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        exam
          ? {
              name: exam.name,
              examType: exam.examType,
              termId: exam.termId,
              classId: exam.classId,
              startDate: exam.startDate,
              endDate: exam.endDate,
              status: exam.status,
            }
          : emptyValues,
      );
    }
  }, [open, exam, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? tr("Edit exam") : tr("New exam")}</DialogTitle>
          <DialogDescription>{tr("Exams are scoped to a class and term, with subject schedules added separately.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{tr("Name")}</Label>
            <Input id="name" placeholder={tr("e.g. Mid-term Examination")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="examType">{tr("Exam type")}</Label>
              <Controller
                control={control}
                name="examType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="examType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {EXAM_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">{tr("Status")}</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="classId">{tr("Class")}</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="classId">
                      <SelectValue placeholder={tr("Select a class")} />
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
            <div className="space-y-1.5">
              <Label htmlFor="termId">{tr("Term")}</Label>
              <Controller
                control={control}
                name="termId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="termId">
                      <SelectValue placeholder={tr("Select a term")} />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.termId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.termId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">{tr("Start date")}</Label>
              <Input id="startDate" type="date" aria-invalid={errors.startDate ? true : undefined} {...register("startDate")} />
              {errors.startDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">{tr("End date")}</Label>
              <Input id="endDate" type="date" aria-invalid={errors.endDate ? true : undefined} {...register("endDate")} />
              {errors.endDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.endDate.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tr("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? tr("Save changes") : tr("Create exam")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
