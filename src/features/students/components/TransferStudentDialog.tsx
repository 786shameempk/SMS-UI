import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Student, TransferFormValues } from "../types";

const transferFormSchema = z.object({
  toSchool: z.string().min(1, "Destination school is required"),
  reason: z.string().min(1, "Reason is required"),
  transferCertificateNumber: z.string().min(1, "TC number is required"),
});

export default function TransferStudentDialog({
  open,
  onOpenChange,
  student,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSubmit: (values: TransferFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: { toSchool: "", reason: "", transferCertificateNumber: "" },
  });

  useEffect(() => {
    if (open) reset({ toSchool: "", reason: "", transferCertificateNumber: "" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer student</DialogTitle>
          <DialogDescription>
            {student ? `Mark ${student.firstName} ${student.lastName} as transferred out of the school.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="toSchool" required>Destination school</Label>
            <Input id="toSchool" aria-invalid={errors.toSchool ? true : undefined} {...register("toSchool")} />
            {errors.toSchool && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.toSchool.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transferCertificateNumber" required>Transfer certificate number</Label>
            <Input id="transferCertificateNumber" aria-invalid={errors.transferCertificateNumber ? true : undefined} {...register("transferCertificateNumber")} />
            {errors.transferCertificateNumber && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.transferCertificateNumber.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason" required>Reason</Label>
            <Textarea id="reason" rows={3} aria-invalid={errors.reason ? true : undefined} {...register("reason")} />
            {errors.reason && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={submitting}>
              Confirm transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
