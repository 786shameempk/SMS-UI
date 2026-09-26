import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Branch, BranchFormValues } from "../types";

const branchFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

const EMPTY_VALUES: BranchFormValues = { name: "", code: "", address: "", phone: "", status: "active" };

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch | null;
  onSubmit: (values: BranchFormValues) => Promise<void>;
  submitting: boolean;
}

export default function BranchFormDialog({ open, onOpenChange, branch, onSubmit, submitting }: BranchFormDialogProps) {
  const isEdit = Boolean(branch);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<BranchFormValues>({ resolver: zodResolver(branchFormSchema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (open) {
      reset(branch ? { name: branch.name, code: branch.code, address: branch.address, phone: branch.phone, status: branch.status } : EMPTY_VALUES);
    }
  }, [open, branch, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit branch" : "Add branch"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this campus's details." : "Add a new campus for this school."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" required>Branch name</Label>
            <Input id="name" placeholder="North Campus" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code" required>Short code</Label>
            <Input id="code" placeholder="NORTH" aria-invalid={errors.code ? true : undefined} {...register("code")} />
            {errors.code && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.code.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" optional>Address</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" optional>Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
