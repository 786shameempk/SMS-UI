import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AdmissionApplication, AdmissionRegistrationFormValues } from "../types";

const registrationSchema = z.object({
  address: z.string().min(1, "Address is required"),
  previousSchool: z.string().optional(),
});

type FormValues = z.infer<typeof registrationSchema>;

export default function AdmissionRegistrationDialog({
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
  onSubmit: (values: AdmissionRegistrationFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(registrationSchema) });

  useEffect(() => {
    if (open && application) reset({ address: application.address ?? "", previousSchool: application.previousSchool ?? "" });
  }, [open, application, reset]);

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register application</DialogTitle>
          <DialogDescription>
            Formalize {application.applicantFirstName} {application.applicantLastName}'s inquiry into a registered application.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, previousSchool: values.previousSchool?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reg-address" required>Address</Label>
            <Input id="reg-address" aria-invalid={errors.address ? true : undefined} {...register("address")} />
            {errors.address && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.address.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-previousSchool" optional>Previous school</Label>
            <Input id="reg-previousSchool" {...register("previousSchool")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Register application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
