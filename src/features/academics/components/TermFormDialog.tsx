import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TERM_STATUSES } from "../constants";
import type { AcademicYear, Term, TermFormValues } from "../types";

const termFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  academicYearId: z.string().min(1, "Select an academic year"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(TERM_STATUSES),
});

const emptyValues: TermFormValues = { name: "", academicYearId: "", startDate: "", endDate: "", status: "upcoming" };

export default function TermFormDialog({
  open,
  onOpenChange,
  term,
  academicYears,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term?: Term | null;
  academicYears: AcademicYear[];
  onSubmit: (values: TermFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(term);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TermFormValues>({ resolver: zodResolver(termFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        term
          ? { name: term.name, academicYearId: term.academicYearId, startDate: term.startDate, endDate: term.endDate, status: term.status }
          : emptyValues,
      );
    }
  }, [open, term, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit term" : "New term"}</DialogTitle>
          <DialogDescription>Terms/semesters divide an academic year for grading and scheduling.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" required>Name</Label>
            <Input id="name" placeholder="e.g. Term 1" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="academicYearId" required>Academic year</Label>
            <Controller
              control={control}
              name="academicYearId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="academicYearId">
                    <SelectValue placeholder="Select an academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.academicYearId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.academicYearId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" required>Start date</Label>
              <Input id="startDate" type="date" aria-invalid={errors.startDate ? true : undefined} {...register("startDate")} />
              {errors.startDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" required>End date</Label>
              <Input id="endDate" type="date" aria-invalid={errors.endDate ? true : undefined} {...register("endDate")} />
              {errors.endDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status" required>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERM_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
