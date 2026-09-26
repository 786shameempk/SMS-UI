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
import { listStaff } from "@/features/staff/api";
import type { MarkVaccinationAdministeredFormValues, VaccinationRow } from "../types";

const schema = z.object({
  dateAdministered: z.string().min(1, "Date is required"),
  administeredByStaffId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function MarkVaccinationAdministeredDialog({
  open,
  onOpenChange,
  vaccination,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaccination: VaccinationRow | null;
  submitting: boolean;
  onSubmit: (values: MarkVaccinationAdministeredFormValues) => Promise<void>;
}) {
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    handleSubmit,
    reset,
    control,
    register,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { dateAdministered: new Date().toISOString().slice(0, 10), administeredByStaffId: "" } });

  useEffect(() => {
    if (open) reset({ dateAdministered: new Date().toISOString().slice(0, 10), administeredByStaffId: "" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as administered</DialogTitle>
          <DialogDescription>
            {vaccination ? `${vaccination.vaccineName} (dose ${vaccination.doseNumber}) for ${vaccination.student.firstName} ${vaccination.student.lastName}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, administeredByStaffId: values.administeredByStaffId || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mark-vax-date">Date administered</Label>
            <Input id="mark-vax-date" type="date" aria-invalid={errors.dateAdministered ? true : undefined} {...register("dateAdministered")} />
            {errors.dateAdministered && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.dateAdministered.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mark-vax-staff" optional>Administered by</Label>
            <Controller
              control={control}
              name="administeredByStaffId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="mark-vax-staff">
                    <SelectValue placeholder="Select staff member" />
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
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Mark administered
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
