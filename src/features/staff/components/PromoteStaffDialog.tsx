import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DESIGNATIONS } from "../constants";
import type { PromoteStaffFormValues, StaffDesignation, StaffMember } from "../types";

const promoteFormSchema = z.object({
  toDesignation: z.enum(DESIGNATIONS as unknown as [StaffDesignation, ...StaffDesignation[]]),
  effectiveDate: z.string().min(1, "Effective date is required"),
  remarks: z.string().optional(),
});

export default function PromoteStaffDialog({
  open,
  onOpenChange,
  staff,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSubmit: (values: PromoteStaffFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PromoteStaffFormValues>({
    resolver: zodResolver(promoteFormSchema),
    defaultValues: { toDesignation: "Teacher", effectiveDate: "", remarks: "" },
  });

  useEffect(() => {
    if (open) reset({ toDesignation: staff?.designation ?? "Teacher", effectiveDate: "", remarks: "" });
  }, [open, staff, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote staff member</DialogTitle>
          <DialogDescription>
            {staff ? `Change ${staff.firstName} ${staff.lastName}'s designation.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="toDesignation" required>New designation</Label>
            <Controller
              control={control}
              name="toDesignation"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="toDesignation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="effectiveDate" required>Effective date</Label>
            <Input id="effectiveDate" type="date" aria-invalid={errors.effectiveDate ? true : undefined} {...register("effectiveDate")} />
            {errors.effectiveDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.effectiveDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="remarks" optional>Remarks</Label>
            <Textarea id="remarks" rows={2} {...register("remarks")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Promote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
