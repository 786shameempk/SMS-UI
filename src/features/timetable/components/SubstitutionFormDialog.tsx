import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Section, Subject } from "@/features/academics/types";
import type { StaffMember } from "@/features/staff/types";
import { dateToDayOfWeek } from "../constants";
import type { SubstitutionFormValues, TimetableSlot } from "../types";

const substitutionFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  sectionId: z.string().min(1, "Section is required"),
  periodNumber: z.coerce.number().int().min(1, "Select a scheduled period"),
  substituteStaffId: z.string().min(1, "Substitute teacher is required"),
  reason: z.string().optional(),
});

type SubstitutionFormInput = z.infer<typeof substitutionFormSchema>;

const emptyValues: SubstitutionFormInput = { date: "", sectionId: "", periodNumber: 0, substituteStaffId: "", reason: "" };

function nameOf(teacher: StaffMember | undefined): string {
  return teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unassigned";
}

export default function SubstitutionFormDialog({
  open,
  onOpenChange,
  sections,
  teachers,
  subjects,
  slots,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  teachers: StaffMember[];
  subjects: Subject[];
  slots: TimetableSlot[];
  onSubmit: (values: SubstitutionFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubstitutionFormInput>({ resolver: zodResolver(substitutionFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const dateVal = watch("date");
  const sectionVal = watch("sectionId");
  const periodVal = watch("periodNumber");

  const dayOfWeek = dateVal ? dateToDayOfWeek(dateVal) : null;

  const availableSlots = useMemo(() => {
    if (!sectionVal || dayOfWeek === null) return [];
    return slots.filter((s) => s.sectionId === sectionVal && s.dayOfWeek === dayOfWeek && s.staffId);
  }, [slots, sectionVal, dayOfWeek]);

  useEffect(() => {
    setValue("periodNumber", 0);
  }, [sectionVal, dateVal, setValue]);

  const selectedSlot = availableSlots.find((s) => s.periodNumber === periodVal);
  const originalTeacher = teachers.find((t) => t.id === selectedSlot?.staffId);
  const substituteOptions = teachers.filter((t) => t.id !== selectedSlot?.staffId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign substitute teacher</DialogTitle>
          <DialogDescription>
            Covers a single date only — the recurring weekly timetable is left untouched.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" required>Date</Label>
              <Input id="date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              {errors.date && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.date.message}</p>}
              {dateVal && dayOfWeek === null && <p className="text-xs text-warning-strong">No periods run on Sundays.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="section">Section</Label>
              <Controller
                control={control}
                name="sectionId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="section">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.sectionId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.sectionId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period">Scheduled period</Label>
            <Controller
              control={control}
              name="periodNumber"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={availableSlots.length === 0}
                >
                  <SelectTrigger id="period">
                    <SelectValue placeholder={availableSlots.length === 0 ? "No scheduled periods" : "Select period"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((s) => {
                      const subject = subjects.find((sub) => sub.id === s.subjectId);
                      const teacher = teachers.find((t) => t.id === s.staffId);
                      return (
                        <SelectItem key={s.periodNumber} value={String(s.periodNumber)}>
                          Period {s.periodNumber} - {subject?.name ?? "Subject"} ({nameOf(teacher)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.periodNumber && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.periodNumber.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="substitute">Substitute teacher</Label>
            <Controller
              control={control}
              name="substituteStaffId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!selectedSlot}>
                  <SelectTrigger id="substitute">
                    <SelectValue placeholder={originalTeacher ? `Covering for ${nameOf(originalTeacher)}` : "Select a period first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {substituteOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.substituteStaffId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.substituteStaffId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" optional>Reason</Label>
            <Textarea id="reason" placeholder="e.g. Sick leave" {...register("reason")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Assign substitute
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
