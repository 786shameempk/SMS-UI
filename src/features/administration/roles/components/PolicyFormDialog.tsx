import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERMISSION_MODULES } from "../mock";
import type { Policy, PolicyFormValues, Role } from "../types";

const policyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  module: z.string().min(1, "Select a module"),
  condition: z.string().min(1, "Condition expression is required"),
  roleIds: z.array(z.string()).min(1, "Select at least one role"),
});

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: Policy | null;
  roles: Role[];
  onSubmit: (values: PolicyFormValues) => Promise<void>;
  submitting: boolean;
}

export default function PolicyFormDialog({ open, onOpenChange, policy, roles, onSubmit, submitting }: PolicyFormDialogProps) {
  const isEdit = Boolean(policy);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: { name: "", description: "", module: "", condition: "", roleIds: [] },
  });

  useEffect(() => {
    if (open) {
      reset(
        policy
          ? { name: policy.name, description: policy.description, module: policy.module, condition: policy.condition, roleIds: policy.roleIds }
          : { name: "", description: "", module: "", condition: "", roleIds: [] },
      );
    }
  }, [open, policy, reset]);

  const selectedRoleIds = watch("roleIds");

  const toggleRole = (roleId: string, checked: boolean) => {
    const next = checked ? [...selectedRoleIds, roleId] : selectedRoleIds.filter((id) => id !== roleId);
    setValue("roleIds", next, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit policy" : "Add policy"}</DialogTitle>
          <DialogDescription>Define an attribute-based rule that layers on top of role permissions.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Policy name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="module">Module</Label>
            <Controller
              control={control}
              name="module"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="module">
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_MODULES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.module && <p className="text-xs text-red-600">{errors.module.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="condition">Condition expression</Label>
            <Input id="condition" placeholder="e.g. resource.ownerId == user.id" className="font-mono text-xs" {...register("condition")} />
            {errors.condition && <p className="text-xs text-red-600">{errors.condition.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Applies to roles</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={(v) => toggleRole(role.id, v === true)}
                  />
                  <span className="text-sm text-slate-700">{role.name}</span>
                </label>
              ))}
            </div>
            {errors.roleIds && <p className="text-xs text-red-600">{errors.roleIds.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
