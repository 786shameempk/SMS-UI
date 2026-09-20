import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { nowLocalDateTimeValue, VISIT_OUTCOME_OPTIONS } from "../constants";
import type { InfirmaryVisitFormValues, VisitOutcome } from "../types";

const visitSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  visitedAt: z.string().min(1, "Visit date/time is required"),
  symptoms: z.string().min(1, "Describe the symptoms"),
  temperatureC: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.coerce.number().min(30, "Enter a valid temperature").max(45, "Enter a valid temperature").optional()),
  treatmentGiven: z.string().min(1, "Describe the treatment given"),
  medicineGiven: z.string().optional(),
  outcome: z.enum(VISIT_OUTCOME_OPTIONS.map((o) => o.value) as [VisitOutcome, ...VisitOutcome[]]),
  parentNotified: z.boolean(),
  attendedByStaffId: z.string().optional(),
});

type FormValues = z.infer<typeof visitSchema>;

function emptyValues(): FormValues {
  return {
    studentId: "",
    visitedAt: nowLocalDateTimeValue(),
    symptoms: "",
    temperatureC: undefined,
    treatmentGiven: "",
    medicineGiven: "",
    outcome: "returned_to_class",
    parentNotified: false,
    attendedByStaffId: "",
  };
}

export default function InfirmaryVisitFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: InfirmaryVisitFormValues) => Promise<void>;
}) {
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(visitSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Log an infirmary visit</DialogTitle>
          <DialogDescription>Sick-bay visit — symptoms, treatment given, and outcome.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              medicineGiven: values.medicineGiven?.trim() || undefined,
              attendedByStaffId: values.attendedByStaffId || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visit-studentId">Student</Label>
              <Controller
                control={control}
                name="studentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="visit-studentId">
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
              {errors.studentId && <p className="text-xs text-red-600">{errors.studentId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-visitedAt">Visit date/time</Label>
              <Input id="visit-visitedAt" type="datetime-local" {...register("visitedAt")} />
              {errors.visitedAt && <p className="text-xs text-red-600">{errors.visitedAt.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visit-symptoms">Symptoms</Label>
              <Input id="visit-symptoms" placeholder="e.g. Headache, mild fever" {...register("symptoms")} />
              {errors.symptoms && <p className="text-xs text-red-600">{errors.symptoms.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-temperature">Temperature °C (optional)</Label>
              <Input id="visit-temperature" type="number" min="30" max="45" step="0.1" {...register("temperatureC")} />
              {errors.temperatureC && <p className="text-xs text-red-600">{errors.temperatureC.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-treatment">Treatment given</Label>
            <Textarea id="visit-treatment" rows={2} {...register("treatmentGiven")} />
            {errors.treatmentGiven && <p className="text-xs text-red-600">{errors.treatmentGiven.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-medicine">Medicine given (optional)</Label>
            <Input id="visit-medicine" {...register("medicineGiven")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visit-outcome">Outcome</Label>
              <Controller
                control={control}
                name="outcome"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="visit-outcome">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIT_OUTCOME_OPTIONS.map((o) => (
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
              <Label htmlFor="visit-attendedBy">Attended by (optional)</Label>
              <Controller
                control={control}
                name="attendedByStaffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="visit-attendedBy">
                      <SelectValue placeholder="Select staff" />
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
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={watch("parentNotified")} onCheckedChange={(v) => setValue("parentNotified", v === true)} />
            <span className="text-sm text-slate-600">Parent/guardian notified</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Log visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
