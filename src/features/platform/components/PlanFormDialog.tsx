import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_MODULE_LABELS, PLAN_TIER_OPTIONS } from "../constants";
import type { Plan, PlanFormValues, PlanTier } from "../types";

const planSchema = z.object({
  tier: z.enum(PLAN_TIER_OPTIONS.map((o) => o.value) as [PlanTier, ...PlanTier[]]),
  name: z.string().min(1, "Name is required"),
  monthlyPriceInr: z.coerce.number().min(0, "Price can't be negative"),
  maxStudents: z.coerce.number().min(1, "Must allow at least 1 student"),
  maxStaff: z.coerce.number().min(1, "Must allow at least 1 staff member"),
  storageGb: z.coerce.number().min(1, "Must allow at least 1 GB"),
  includedModules: z.array(z.string()).min(1, "Select at least one module"),
});

type FormValues = z.infer<typeof planSchema>;

const emptyValues: FormValues = { tier: "starter", name: "", monthlyPriceInr: 0, maxStudents: 0, maxStaff: 0, storageGb: 0, includedModules: [] };

export default function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
  submitting: boolean;
  onSubmit: (values: PlanFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(plan);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(planSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      plan
        ? {
            tier: plan.tier,
            name: plan.name,
            monthlyPriceInr: plan.monthlyPriceInr,
            maxStudents: plan.maxStudents,
            maxStaff: plan.maxStaff,
            storageGb: plan.storageGb,
            includedModules: plan.includedModules,
          }
        : emptyValues,
    );
  }, [open, plan, reset]);

  const includedModules = watch("includedModules");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>Defines the limits and modules tenants on this plan get.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input id="plan-name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-tier">Tier</Label>
              <Controller
                control={control}
                name="tier"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="plan-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_TIER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-price">Monthly price (₹)</Label>
            <Input id="plan-price" type="number" min="0" step="500" {...register("monthlyPriceInr")} />
            {errors.monthlyPriceInr && <p className="text-xs text-red-600">{errors.monthlyPriceInr.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-maxStudents">Max students</Label>
              <Input id="plan-maxStudents" type="number" min="1" step="1" {...register("maxStudents")} />
              {errors.maxStudents && <p className="text-xs text-red-600">{errors.maxStudents.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-maxStaff">Max staff</Label>
              <Input id="plan-maxStaff" type="number" min="1" step="1" {...register("maxStaff")} />
              {errors.maxStaff && <p className="text-xs text-red-600">{errors.maxStaff.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-storage">Storage (GB)</Label>
              <Input id="plan-storage" type="number" min="1" step="1" {...register("storageGb")} />
              {errors.storageGb && <p className="text-xs text-red-600">{errors.storageGb.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Included modules</Label>
              <span className="text-xs text-muted-foreground">{includedModules.length} selected</span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {AVAILABLE_MODULE_LABELS.map((label) => (
                <label key={label} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/40">
                  <Checkbox
                    checked={includedModules.includes(label)}
                    onCheckedChange={(v) =>
                      setValue("includedModules", v ? [...includedModules, label] : includedModules.filter((m) => m !== label))
                    }
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            {errors.includedModules && <p className="text-xs text-red-600">{errors.includedModules.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
