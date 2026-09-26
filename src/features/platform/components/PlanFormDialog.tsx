import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALWAYS_INCLUDED_PLAN_MODULES, AVAILABLE_MODULE_LABELS, PLAN_TIER_OPTIONS } from "../constants";
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

const emptyValues: FormValues = { tier: "starter", name: "", monthlyPriceInr: 0, maxStudents: 0, maxStaff: 0, storageGb: 0, includedModules: ALWAYS_INCLUDED_PLAN_MODULES };

/** Keeps only catalog modules (in catalog order) and always adds the locked ones. */
function normalizeModules(modules: string[]): string[] {
  const wanted = new Set([...ALWAYS_INCLUDED_PLAN_MODULES, ...modules]);
  return AVAILABLE_MODULE_LABELS.filter((m) => wanted.has(m));
}

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
            includedModules: normalizeModules(plan.includedModules),
          }
        : emptyValues,
    );
  }, [open, plan, reset]);

  const includedModules = watch("includedModules");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>Defines the limits and modules tenants on this plan get.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name" required>Plan name</Label>
              <Input id="plan-name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
              {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-tier" required>Tier</Label>
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
            <Input id="plan-price" type="number" min="0" step="500" aria-invalid={errors.monthlyPriceInr ? true : undefined} {...register("monthlyPriceInr")} />
            {errors.monthlyPriceInr && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.monthlyPriceInr.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-maxStudents" required>Max students</Label>
              <Input id="plan-maxStudents" type="number" min="1" step="1" aria-invalid={errors.maxStudents ? true : undefined} {...register("maxStudents")} />
              {errors.maxStudents && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.maxStudents.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-maxStaff" required>Max staff</Label>
              <Input id="plan-maxStaff" type="number" min="1" step="1" aria-invalid={errors.maxStaff ? true : undefined} {...register("maxStaff")} />
              {errors.maxStaff && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.maxStaff.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-storage">Storage (GB)</Label>
              <Input id="plan-storage" type="number" min="1" step="1" aria-invalid={errors.storageGb ? true : undefined} {...register("storageGb")} />
              {errors.storageGb && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.storageGb.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Included modules</Label>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {includedModules.length} of {AVAILABLE_MODULE_LABELS.length} selected
                </span>
                <button type="button" className="font-medium text-primary-text hover:underline cursor-pointer" onClick={() => setValue("includedModules", [...AVAILABLE_MODULE_LABELS])}>
                  Select all
                </button>
                <button type="button" className="font-medium text-muted-foreground hover:underline cursor-pointer" onClick={() => setValue("includedModules", normalizeModules([]))}>
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border grid grid-cols-1 sm:grid-cols-2">
              {AVAILABLE_MODULE_LABELS.map((label) => {
                const locked = ALWAYS_INCLUDED_PLAN_MODULES.includes(label);
                return (
                  <label
                    key={label}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 border-b border-border",
                      locked ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-secondary/40",
                    )}
                  >
                    <Checkbox
                      checked={locked || includedModules.includes(label)}
                      disabled={locked}
                      onCheckedChange={(v) =>
                        setValue("includedModules", v ? normalizeModules([...includedModules, label]) : includedModules.filter((m) => m !== label))
                      }
                    />
                    <span className="text-sm text-foreground">{label}</span>
                    {locked && <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Always</span>}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">School admins can only grant these modules to roles in Roles &amp; Permissions.</p>
            {errors.includedModules && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.includedModules.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
