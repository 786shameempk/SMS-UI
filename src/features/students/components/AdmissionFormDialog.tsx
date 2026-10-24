import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentBranchId } from "@/utils/tenant";
import { listBranches } from "@/features/administration/branches/api";
import { useClassSectionOptions } from "../hooks";
import { listSeatAvailability } from "../api";
import type { AdmissionFormValues } from "../types";
import { FormSection } from "@/components/ui/form-field";

const admissionFormSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  applicantFirstName: z.string().min(1, "First name is required"),
  applicantLastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianPhone: z.string().min(1, "Guardian phone is required"),
  guardianEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  appliedClass: z.string().min(1, "Select a class"),
  notes: z.string().optional(),
});

export default function AdmissionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdmissionFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("students");
  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      branchId: getCurrentBranchId(),
      applicantFirstName: "",
      applicantLastName: "",
      dateOfBirth: "",
      gender: "male",
      guardianName: "",
      guardianPhone: "",
      guardianEmail: "",
      appliedClass: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        branchId: getCurrentBranchId(),
        applicantFirstName: "",
        applicantLastName: "",
        dateOfBirth: "",
        gender: "male",
        guardianName: "",
        guardianPhone: "",
        guardianEmail: "",
        appliedClass: "",
        notes: "",
      });
    }
  }, [open, reset]);

  const branchId = watch("branchId");
  const { classNames, isLoading: classesLoading } = useClassSectionOptions(branchId);
  const { data: seatAvailability = [] } = useQuery({
    queryKey: ["students", "seat-availability", branchId],
    queryFn: () => listSeatAvailability(branchId),
    enabled: open,
  });
  const appliedClass = watch("appliedClass");
  const seats = seatAvailability.find((s) => s.className === appliedClass);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("New admission application")}</DialogTitle>
          <DialogDescription>{t("Submit a prospective student for review before enrollment.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, guardianEmail: values.guardianEmail?.trim() || undefined }))} className="space-y-6">
          <FormSection title={t("School")}>
            <div className="space-y-1.5">
              <Label htmlFor="branchId" required>{t("Branch")}</Label>
              <Controller
                control={control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="branchId">
                      <SelectValue placeholder={t("Select branch")} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.branchId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.branchId.message ?? "")}</p>}
            </div>
          </FormSection>

          <FormSection title={t("Applicant")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="applicantFirstName" required>{t("First name")}</Label>
                <Input id="applicantFirstName" aria-invalid={errors.applicantFirstName ? true : undefined} {...register("applicantFirstName")} />
                {errors.applicantFirstName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.applicantFirstName.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="applicantLastName" required>{t("Last name")}</Label>
                <Input id="applicantLastName" aria-invalid={errors.applicantLastName ? true : undefined} {...register("applicantLastName")} />
                {errors.applicantLastName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.applicantLastName.message ?? "")}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" required>{t("Date of birth")}</Label>
                <Input id="dateOfBirth" type="date" aria-invalid={errors.dateOfBirth ? true : undefined} {...register("dateOfBirth")} />
                {errors.dateOfBirth && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.dateOfBirth.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender" required>{t("Gender")}</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t("Male")}</SelectItem>
                        <SelectItem value="female">{t("Female")}</SelectItem>
                        <SelectItem value="other">{t("Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appliedClass" required>{t("Applying for class")}</Label>
              <Controller
                control={control}
                name="appliedClass"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="appliedClass">
                      <SelectValue placeholder={classesLoading ? t("Loading…") : classNames.length ? t("Select a class") : t("No classes in this branch")} />
                    </SelectTrigger>
                    <SelectContent>
                      {classNames.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.appliedClass && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.appliedClass.message ?? "")}</p>}
              {seats && (
                <p className={`text-xs ${seats.availableSeats > 0 ? "text-muted-foreground" : "text-warning-strong"}`}>
                  {seats.availableSeats > 0
                    ? t("{{available}} of {{capacity}} seats currently available in {{className}}.", { available: seats.availableSeats, capacity: seats.capacity, className: seats.className })
                    : t("{{className}} has no seats currently available — the applicant may need to be waitlisted.", { className: seats.className })}
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title={t("Guardian")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="guardianName" required>{t("Guardian name")}</Label>
                <Input id="guardianName" aria-invalid={errors.guardianName ? true : undefined} {...register("guardianName")} />
                {errors.guardianName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.guardianName.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guardianPhone" required>{t("Guardian phone")}</Label>
                <Input id="guardianPhone" aria-invalid={errors.guardianPhone ? true : undefined} {...register("guardianPhone")} />
                {errors.guardianPhone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.guardianPhone.message ?? "")}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guardianEmail" optional>{t("Guardian email")}</Label>
              <Input id="guardianEmail" type="email" aria-invalid={errors.guardianEmail ? true : undefined} {...register("guardianEmail")} />
              {errors.guardianEmail && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.guardianEmail.message ?? "")}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" optional>{t("Notes")}</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {t("Submit application")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
