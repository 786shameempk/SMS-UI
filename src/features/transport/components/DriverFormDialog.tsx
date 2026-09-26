import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StaffMember } from "@/features/staff/types";
import type { Driver, DriverFormValues, DriverStatus } from "../types";

const driverSchema = z.object({
  staffId: z.string().min(1, "Select a staff member"),
  licenseNumber: z.string().min(3, "License number is required"),
  licenseExpiryDate: z.string().min(1, "License expiry date is required"),
  experienceYears: z.coerce.number().int().min(0, "Cannot be negative"),
  status: z.enum(["active", "on-leave", "inactive"] as [DriverStatus, ...DriverStatus[]]),
});

type FormValues = z.infer<typeof driverSchema>;

const emptyValues: FormValues = { staffId: "", licenseNumber: "", licenseExpiryDate: "", experienceYears: 0, status: "active" };

export default function DriverFormDialog({
  open,
  onOpenChange,
  driver,
  eligibleStaff,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
  eligibleStaff: StaffMember[];
  submitting: boolean;
  onSubmit: (values: DriverFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(driver);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(driverSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      driver
        ? {
            staffId: driver.staffId,
            licenseNumber: driver.licenseNumber,
            licenseExpiryDate: driver.licenseExpiryDate.slice(0, 10),
            experienceYears: driver.experienceYears,
            status: driver.status,
          }
        : emptyValues,
    );
  }, [open, driver, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit driver profile" : "New driver profile"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "License and experience details for this driver."
              : "Only staff with the \"Driver\" designation who don't already have a profile can be added here."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="drv-staffId" required>Staff member</Label>
            <Controller
              control={control}
              name="staffId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger id="drv-staffId">
                    <SelectValue placeholder={isEdit ? undefined : "Select a driver from staff"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isEdit && driver && (
                      <SelectItem value={driver.staffId}>
                        {driver.staff.firstName} {driver.staff.lastName} ({driver.staff.employeeId})
                      </SelectItem>
                    )}
                    {eligibleStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {!isEdit && eligibleStaff.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No eligible staff. Add a staff member with designation "Driver" in Staff Management first.
              </p>
            )}
            {errors.staffId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.staffId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="drv-licenseNumber" required>License number</Label>
              <Input id="drv-licenseNumber" placeholder="e.g. KA-05-2019-0044211" aria-invalid={errors.licenseNumber ? true : undefined} {...register("licenseNumber")} />
              {errors.licenseNumber && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.licenseNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drv-licenseExpiryDate" required>License expiry</Label>
              <Input id="drv-licenseExpiryDate" type="date" aria-invalid={errors.licenseExpiryDate ? true : undefined} {...register("licenseExpiryDate")} />
              {errors.licenseExpiryDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.licenseExpiryDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="drv-experienceYears" required>Experience (years)</Label>
              <Input id="drv-experienceYears" type="number" min="0" step="1" aria-invalid={errors.experienceYears ? true : undefined} {...register("experienceYears")} />
              {errors.experienceYears && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.experienceYears.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drv-status" required>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="drv-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-leave">On leave</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || (!isEdit && eligibleStaff.length === 0)}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
