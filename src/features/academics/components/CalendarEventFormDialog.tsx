import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CALENDAR_EVENT_TYPES } from "../constants";
import type { AcademicYear, CalendarEvent, CalendarEventFormValues } from "../types";

const NO_YEAR = "none";

const calendarEventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["term_start", "term_end", "exam", "holiday", "other"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  academicYearId: z.string(),
  description: z.string().optional(),
});

type CalendarEventFormInput = z.infer<typeof calendarEventFormSchema>;

const emptyValues: CalendarEventFormInput = {
  title: "",
  type: "other",
  startDate: "",
  endDate: "",
  academicYearId: NO_YEAR,
  description: "",
};

export default function CalendarEventFormDialog({
  open,
  onOpenChange,
  event,
  academicYears,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  academicYears: AcademicYear[];
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(event);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CalendarEventFormInput>({ resolver: zodResolver(calendarEventFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        event
          ? {
              title: event.title,
              type: event.type,
              startDate: event.startDate,
              endDate: event.endDate ?? "",
              academicYearId: event.academicYearId ?? NO_YEAR,
              description: event.description ?? "",
            }
          : emptyValues,
      );
    }
  }, [open, event, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      title: values.title,
      type: values.type,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      academicYearId: values.academicYearId === NO_YEAR ? undefined : values.academicYearId,
      description: values.description || undefined,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit calendar event" : "New calendar event"}</DialogTitle>
          <DialogDescription>Term dates, exam windows, and holidays shown on the academic calendar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Winter break" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALENDAR_EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="academicYearId">Academic year</Label>
              <Controller
                control={control}
                name="academicYearId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="academicYearId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_YEAR}>Unspecified</SelectItem>
                      {academicYears.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-red-600">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
