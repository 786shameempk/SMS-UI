import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subject } from "@/features/academics/types";
import type { ExamSchedule, ExamScheduleFormValues } from "../types";

const scheduleFormSchema = z
  .object({
    subjectId: z.string().min(1, "Select a subject"),
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    maxMarks: z.coerce.number().int().min(1, "Must be at least 1"),
    passMarks: z.coerce.number().int().min(0, "Cannot be negative"),
    room: z.string().optional(),
  })
  .refine((v) => v.endTime > v.startTime, { message: "End time must be after start time", path: ["endTime"] })
  .refine((v) => v.passMarks <= v.maxMarks, { message: "Pass marks cannot exceed max marks", path: ["passMarks"] });

const emptyValues: ExamScheduleFormValues = { subjectId: "", date: "", startTime: "", endTime: "", maxMarks: 100, passMarks: 35, room: "" };

export default function ExamScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  subjects,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ExamSchedule | null;
  subjects: Subject[];
  onSubmit: (values: ExamScheduleFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(schedule);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ExamScheduleFormValues>({ resolver: zodResolver(scheduleFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        schedule
          ? {
              subjectId: schedule.subjectId,
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              maxMarks: schedule.maxMarks,
              passMarks: schedule.passMarks,
              room: schedule.room ?? "",
            }
          : emptyValues,
      );
    }
  }, [open, schedule, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit subject schedule" : "New subject schedule"}</DialogTitle>
          <DialogDescription>Schedule one subject paper within this exam, with its date, time, and marks.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subjectId">Subject</Label>
            <Controller
              control={control}
              name="subjectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="subjectId">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subjectId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.subjectId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              {errors.date && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" type="time" aria-invalid={errors.startTime ? true : undefined} {...register("startTime")} />
              {errors.startTime && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End time</Label>
              <Input id="endTime" type="time" aria-invalid={errors.endTime ? true : undefined} {...register("endTime")} />
              {errors.endTime && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.endTime.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maxMarks">Max marks</Label>
              <Input id="maxMarks" type="number" min={1} aria-invalid={errors.maxMarks ? true : undefined} {...register("maxMarks")} />
              {errors.maxMarks && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.maxMarks.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="passMarks">Pass marks</Label>
              <Input id="passMarks" type="number" min={0} aria-invalid={errors.passMarks ? true : undefined} {...register("passMarks")} />
              {errors.passMarks && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.passMarks.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room" optional>Room</Label>
              <Input id="room" placeholder="e.g. Room 101" {...register("room")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add subject schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
