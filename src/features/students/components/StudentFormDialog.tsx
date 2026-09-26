import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
});

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  submitting: boolean;
}

export default function StudentFormDialog({ open, onOpenChange, student, onSubmit, submitting }: StudentFormDialogProps) {
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
            },
      );
    }
  }, [open, student, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit student" : "Register student"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this student's core details." : "Directly enroll a student without going through the admissions pipeline."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="School">
            <div className="space-y-1.5">
              <Label htmlFor="branchId" required>Branch</Label>
              <Controller
                control={control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="branchId">
                      <SelectValue placeholder="Select branch" />
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
              {errors.branchId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.branchId.message}</p>}
            </div>
          </FormSection>

          <FormSection title="Student details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" required>First name</Label>
                <Input id="firstName" aria-invalid={errors.firstName ? true : undefined} {...register("firstName")} />
                {errors.firstName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" required>Last name</Label>
                <Input id="lastName" aria-invalid={errors.lastName ? true : undefined} {...register("lastName")} />
                {errors.lastName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" required>Date of birth</Label>
                <Input id="dateOfBirth" type="date" aria-invalid={errors.dateOfBirth ? true : undefined} {...register("dateOfBirth")} />
                {errors.dateOfBirth && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.dateOfBirth.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender" required>Gender</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </FormSection>
<FormSection title="Class placement">

            {!classesLoading && classNames.length === 0 && (
              <p className="text-xs text-warning-strong">No classes exist in this branch yet — create them in Academic Setup first.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="className" required>Class</Label>
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
                        <SelectValue placeholder={classesLoading ? "Loading…" : classNames.length ? "Class" : "No classes"} />
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
                {errors.className && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.className.message}</p>}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="section" required>Section</Label>
                <Controller
                  control={control}
                  name="section"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!watch("className")}>
                      <SelectTrigger id="section">
                        <SelectValue placeholder={watch("className") && sectionNames.length === 0 ? "No sections" : "Section"} />
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
                {errors.section && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.section.message}</p>}
                {watch("className") && sectionNames.length === 0 && (
                  <p className="text-xs text-warning-strong">Add a section to this class in Academic Setup first.</p>
                )}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="rollNumber">Roll number</Label>
                <Input id="rollNumber" {...register("rollNumber")} />
              </div>
            </div>
</FormSection>

          <FormSection title="Address & guardian">
            <div className="space-y-1.5">
              <Label htmlFor="address" required>Address</Label>
              <Textarea id="address" rows={2} aria-invalid={errors.address ? true : undefined} {...register("address")} />
              {errors.address && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="guardianName" required>Guardian name</Label>
                <Input id="guardianName" aria-invalid={errors.guardianName ? true : undefined} {...register("guardianName")} />
                {errors.guardianName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.guardianName.message}</p>}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="guardianRelation" required>Relation</Label>
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
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="guardianPhone" required>Guardian phone</Label>
                <Input id="guardianPhone" aria-invalid={errors.guardianPhone ? true : undefined} {...register("guardianPhone")} />
                {errors.guardianPhone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.guardianPhone.message}</p>}
              </div>
            </div>
          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Register student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
