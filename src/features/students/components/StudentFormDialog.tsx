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
import { CLASS_OPTIONS, GUARDIAN_RELATIONS, SECTION_OPTIONS } from "../constants";
import type { Student, StudentFormValues } from "../types";

const studentFormSchema = z.object({
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
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
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

  useEffect(() => {
    if (open) {
      const primaryGuardian = student?.guardians[0];
      reset(
        student
          ? {
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="text-xs text-red-600">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="className">Class</Label>
              <Controller
                control={control}
                name="className"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="className">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.className && <p className="text-xs text-red-600">{errors.className.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="section">Section</Label>
              <Controller
                control={control}
                name="section"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="section">
                      <SelectValue placeholder="Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.section && <p className="text-xs text-red-600">{errors.section.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="rollNumber">Roll number</Label>
              <Input id="rollNumber" {...register("rollNumber")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" rows={2} {...register("address")} />
            {errors.address && <p className="text-xs text-red-600">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="guardianName">Guardian name</Label>
              <Input id="guardianName" {...register("guardianName")} />
              {errors.guardianName && <p className="text-xs text-red-600">{errors.guardianName.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="guardianRelation">Relation</Label>
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
              <Label htmlFor="guardianPhone">Guardian phone</Label>
              <Input id="guardianPhone" {...register("guardianPhone")} />
              {errors.guardianPhone && <p className="text-xs text-red-600">{errors.guardianPhone.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Register student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
