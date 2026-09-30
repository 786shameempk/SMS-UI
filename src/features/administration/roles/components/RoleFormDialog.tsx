import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Role, RoleFormValues } from "../types";

const roleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  grantsAllBranchAccess: z.boolean(),
});

const EMPTY: RoleFormValues = { name: "", description: "", grantsAllBranchAccess: false };

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
  onSubmit: (values: RoleFormValues) => Promise<void>;
  submitting: boolean;
}

export default function RoleFormDialog({ open, onOpenChange, role, onSubmit, submitting }: RoleFormDialogProps) {
  const isEdit = Boolean(role);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoleFormValues>({ resolver: zodResolver(roleFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) reset(role ? { name: role.name, description: role.description, grantsAllBranchAccess: role.grantsAllBranchAccess } : EMPTY);
  }, [open, role, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit role" : "Add role"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this role's name and description." : "Create a custom role to assign fine-grained permissions."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" required>Role name</Label>
            <Input id="name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" required>Description</Label>
            <Textarea id="description" rows={3} aria-invalid={errors.description ? true : undefined} {...register("description")} />
            {errors.description && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.description.message}</p>}
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer select-none">
            <Checkbox
              className="mt-0.5"
              checked={watch("grantsAllBranchAccess")}
              onCheckedChange={(v) => setValue("grantsAllBranchAccess", v === true, { shouldDirty: true })}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">All branches</span>
              <span className="block text-xs text-muted-foreground">
                Users with this role work across every branch and switch branch in the header. Leave off to lock each user to the
                branch they're assigned.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
