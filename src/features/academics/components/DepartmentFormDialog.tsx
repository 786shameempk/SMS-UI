import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Department, DepartmentFormValues } from "../types";

const departmentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const emptyValues: DepartmentFormValues = { name: "", description: "" };

export default function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(department);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormValues>({ resolver: zodResolver(departmentFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(department ? { name: department.name, description: department.description ?? "" } : emptyValues);
  }, [open, department, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "New department / stream"}</DialogTitle>
          <DialogDescription>Departments and streams group classes, e.g. Primary, Secondary, Science, Commerce.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" required>Name</Label>
            <Input id="name" placeholder="e.g. Science" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" optional>Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
