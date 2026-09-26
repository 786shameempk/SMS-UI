import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXAM_STATUS_OPTIONS } from "../constants";
import type { AdmissionApplication, AdmissionExamFormValues, ExamResultStatus } from "../types";

const examSchema = z.object({
  examDate: z.string().min(1, "Exam date is required"),
  examStatus: z.enum(["scheduled", "completed", "absent"] as [ExamResultStatus, ...ExamResultStatus[]]),
  examScore: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().min(0).max(100).optional(),
  ),
});

type FormValues = z.infer<typeof examSchema>;

export default function AdmissionExamDialog({
  open,
  onOpenChange,
  application,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AdmissionApplication | null;
  submitting: boolean;
  onSubmit: (values: AdmissionExamFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(examSchema) });

  useEffect(() => {
    if (open && application) {
      reset({
        examDate: application.examDate?.slice(0, 10) ?? "",
        examStatus: application.examStatus ?? "scheduled",
        examScore: application.examScore,
      });
    }
  }, [open, application, reset]);

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Entrance exam</DialogTitle>
          <DialogDescription>
            Schedule the entrance exam for {application.applicantFirstName} {application.applicantLastName}, then reopen this
            to record the result once it's taken.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exam-date">Exam date</Label>
            <Input id="exam-date" type="date" aria-invalid={errors.examDate ? true : undefined} {...register("examDate")} />
            {errors.examDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.examDate.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-status">Status</Label>
              <Controller
                control={control}
                name="examStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="exam-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-score">Score (0-100, optional)</Label>
              <Input id="exam-score" type="number" min="0" max="100" aria-invalid={errors.examScore ? true : undefined} {...register("examScore")} />
              {errors.examScore && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.examScore.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
