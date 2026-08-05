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
import type { AcademicYear, Department, SchoolClass, SchoolClassFormValues } from "../types";

const NO_DEPARTMENT = "none";

const classFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  departmentId: z.string(),
  academicYearId: z.string().min(1, "Select an academic year"),
});

type ClassFormInput = z.infer<typeof classFormSchema>;

const emptyValues: ClassFormInput = { name: "", departmentId: NO_DEPARTMENT, academicYearId: "" };

export default function ClassFormDialog({
  open,
  onOpenChange,
  schoolClass,
  departments,
  academicYears,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass?: SchoolClass | null;
  departments: Department[];
  academicYears: AcademicYear[];
  onSubmit: (values: SchoolClassFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(schoolClass);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ClassFormInput>({ resolver: zodResolver(classFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        schoolClass
          ? {
              name: schoolClass.name,
              departmentId: schoolClass.departmentId ?? NO_DEPARTMENT,
              academicYearId: schoolClass.academicYearId,
            }
          : emptyValues,
      );
    }
  }, [open, schoolClass, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      departmentId: values.departmentId === NO_DEPARTMENT ? undefined : values.departmentId,
      academicYearId: values.academicYearId,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit class" : "New class"}</DialogTitle>
          <DialogDescription>Classes belong to an academic year and, optionally, a department or stream.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Grade 8" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="academicYearId">Academic year</Label>
            <Controller
              control={control}
              name="academicYearId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="academicYearId">
                    <SelectValue placeholder="Select an academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.academicYearId && <p className="text-xs text-red-600">{errors.academicYearId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departmentId">Department / stream (optional)</Label>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="departmentId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEPARTMENT}>None</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
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
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
