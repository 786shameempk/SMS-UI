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
import type { VaccinationFormValues } from "../types";

const vaccinationSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  vaccineName: z.string().min(1, "Vaccine name is required"),
  doseNumber: z.coerce.number().min(1, "Dose number must be at least 1"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof vaccinationSchema>;

const emptyValues: FormValues = { studentId: "", vaccineName: "", doseNumber: 1, dueDate: "", notes: "" };

export default function VaccinationFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: VaccinationFormValues) => Promise<void>;
}) {
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(vaccinationSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a vaccination</DialogTitle>
          <DialogDescription>Adds a due vaccination to the student's record — mark it administered once given.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, notes: values.notes?.trim() || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vax-studentId" required>Student</Label>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="vax-studentId">
                    <SelectValue placeholder="Select a student" />
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
            {errors.studentId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.studentId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vax-name">Vaccine name</Label>
              <Input id="vax-name" placeholder="e.g. Tdap Booster" aria-invalid={errors.vaccineName ? true : undefined} {...register("vaccineName")} />
              {errors.vaccineName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.vaccineName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vax-dose">Dose number</Label>
              <Input id="vax-dose" type="number" min="1" step="1" aria-invalid={errors.doseNumber ? true : undefined} {...register("doseNumber")} />
              {errors.doseNumber && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.doseNumber.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vax-dueDate" required>Due date</Label>
            <Input id="vax-dueDate" type="date" aria-invalid={errors.dueDate ? true : undefined} {...register("dueDate")} />
            {errors.dueDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.dueDate.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vax-notes" optional>Notes</Label>
            <Textarea id="vax-notes" rows={2} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Schedule vaccination
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
