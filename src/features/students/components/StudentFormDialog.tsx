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
import { GUARDIAN_RELATIONS } from "../constants";
import { useClassSectionOptions } from "../hooks";
import type { Student, StudentFormValues } from "../types";
import { FormSection } from "@/components/ui/form-field";

const studentFormSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  className: z.string().min(1, "Select a class"),
  section: z.string().min(1, "Select a section"),
  rollNumber: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianRelation: z.enum(["father", "mother", "guardian"]),
  guardianPhone: z.string().min(1, "Guardian phone is required"),
  studentEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]).optional(),
  parentEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]).optional(),
});

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  submitting: boolean;
}

export default function StudentFormDialog({ open, onOpenChange, student, onSubmit, submitting }: StudentFormDialogProps) {
  const { t } = useTranslation("students");
  const isEdit = Boolean(student);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      branchId: getCurrentBranchId(),
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "male",
      className: "",
      section: "",
      rollNumber: "",
      address: "",
      guardianName: "",
      guardianRelation: "father",
      guardianPhone: "",
      studentEmail: "",
      parentEmail: "",
    },
  });

  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });
  const { classNames, sectionsFor, isLoading: classesLoading } = useClassSectionOptions(watch("branchId"));
  const sectionNames = sectionsFor(watch("className"));

  useEffect(() => {
    if (open) {
      const primaryGuardian = student?.guardians[0];
      reset(
        student
          ? {
              branchId: student.branchId,
              firstName: student.firstName,
              lastName: student.lastName,
              dateOfBirth: student.dateOfBirth.slice(0, 10),
              gender: student.gender,
              className: student.className,
              section: student.section,
              rollNumber: student.rollNumber ?? "",
              address: student.address,
              guardianName: primaryGuardian?.name ?? "",
              guardianRelation: primaryGuardian?.relation ?? "father",
              guardianPhone: primaryGuardian?.phone ?? "",
              studentEmail: "",
              parentEmail: "",
            }
          : {
              branchId: getCurrentBranchId(),
              firstName: "",
              lastName: "",
              dateOfBirth: "",
              gender: "male",
              className: "",
              section: "",
              rollNumber: "",
              address: "",
              guardianName: "",
              guardianRelation: "father",
              guardianPhone: "",
              studentEmail: "",
              parentEmail: "",
            },
      );
    }
  }, [open, student, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit student") : t("Register student")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("Update this student's core details.") : t("Directly enroll a student without going through the admissions pipeline.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          <FormSection title={t("Student details")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" required>{t("First name")}</Label>
                <Input id="firstName" aria-invalid={errors.firstName ? true : undefined} {...register("firstName")} />
                {errors.firstName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.firstName.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" required>{t("Last name")}</Label>
                <Input id="lastName" aria-invalid={errors.lastName ? true : undefined} {...register("lastName")} />
                {errors.lastName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.lastName.message ?? "")}</p>}
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
          </FormSection>
<FormSection title={t("Class placement")}>

            {!classesLoading && classNames.length === 0 && (
              <p className="text-xs text-warning-strong">{t("No classes exist in this branch yet — create them in Academic Setup first.")}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="className" required>{t("Class")}</Label>
                <Controller
                  control={control}
                  name="className"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (!sectionsFor(value).includes(watch("section"))) setValue("section", "");
                      }}
                    >
                      <SelectTrigger id="className">
                        <SelectValue placeholder={classesLoading ? t("Loading…") : classNames.length ? t("Class") : t("No classes")} />
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
                {errors.className && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.className.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="section" required>{t("Section")}</Label>
                <Controller
                  control={control}
                  name="section"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!watch("className")}>
                      <SelectTrigger id="section">
                        <SelectValue placeholder={watch("className") && sectionNames.length === 0 ? t("No sections") : t("Section")} />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionNames.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.section && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.section.message ?? "")}</p>}
                {watch("className") && sectionNames.length === 0 && (
                  <p className="text-xs text-warning-strong">{t("Add a section to this class in Academic Setup first.")}</p>
                )}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="rollNumber">{t("Roll number")}</Label>
                <Input id="rollNumber" {...register("rollNumber")} />
              </div>
            </div>
</FormSection>

          <FormSection title={t("Address & guardian")}>
            <div className="space-y-1.5">
              <Label htmlFor="address" required>{t("Address")}</Label>
              <Textarea id="address" rows={2} aria-invalid={errors.address ? true : undefined} {...register("address")} />
              {errors.address && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.address.message ?? "")}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="guardianName" required>{t("Guardian name")}</Label>
                <Input id="guardianName" aria-invalid={errors.guardianName ? true : undefined} {...register("guardianName")} />
                {errors.guardianName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.guardianName.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="guardianRelation" required>{t("Relation")}</Label>
                <Controller
                  control={control}
                  name="guardianRelation"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="guardianRelation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GUARDIAN_RELATIONS.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {t(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="guardianPhone" required>{t("Guardian phone")}</Label>
                <Input id="guardianPhone" aria-invalid={errors.guardianPhone ? true : undefined} {...register("guardianPhone")} />
                {errors.guardianPhone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.guardianPhone.message ?? "")}</p>}
              </div>
            </div>

            {!isEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="studentEmail">{t("Student email")}</Label>
                  <Input id="studentEmail" type="email" autoComplete="off" placeholder={t("Optional")} aria-invalid={errors.studentEmail ? true : undefined} {...register("studentEmail")} />
                  {errors.studentEmail && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.studentEmail.message ?? "")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentEmail">{t("Parent email")}</Label>
                  <Input id="parentEmail" type="email" autoComplete="off" placeholder={t("Optional")} aria-invalid={errors.parentEmail ? true : undefined} {...register("parentEmail")} />
                  {errors.parentEmail && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.parentEmail.message ?? "")}</p>}
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {t("Each email you enter gets a login created automatically (student / parent), linked to this student, with a temporary password emailed to it.")}
                </p>
              </div>
            )}
          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Register student")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
