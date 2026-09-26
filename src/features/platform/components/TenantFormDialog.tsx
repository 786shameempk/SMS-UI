import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidSubdomain } from "../constants";
import { listPlans } from "../api";
import type { TenantFormValues } from "../types";

const tenantSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .refine((v) => isValidSubdomain(v), "Lowercase letters, numbers, and hyphens only"),
  planId: z.string().min(1, "Select a plan"),
  billingContactName: z.string().min(1, "Billing contact name is required"),
  billingContactEmail: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof tenantSchema>;

const emptyValues: FormValues = { schoolName: "", subdomain: "", planId: "", billingContactName: "", billingContactEmail: "" };

export default function TenantFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: TenantFormValues) => Promise<void>;
}) {
  const { data: plans = [] } = useQuery({ queryKey: ["platform", "plans"], queryFn: listPlans });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(tenantSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New tenant</DialogTitle>
          <DialogDescription>Onboards a new school onto the platform as a trial tenant.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, subdomain: values.subdomain.toLowerCase() }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-schoolName" required>School name</Label>
            <Input id="tenant-schoolName" aria-invalid={errors.schoolName ? true : undefined} {...register("schoolName")} />
            {errors.schoolName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.schoolName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenant-subdomain">Subdomain</Label>
            <div className="flex items-center gap-1.5">
              <Input id="tenant-subdomain" placeholder="riverside-intl" aria-invalid={errors.subdomain ? true : undefined} {...register("subdomain")} />
              <span className="text-sm text-muted-foreground shrink-0">.educore.app</span>
            </div>
            {errors.subdomain && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.subdomain.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenant-planId" required>Plan</Label>
            <Controller
              control={control}
              name="planId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tenant-planId">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.planId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.planId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tenant-billingName">Billing contact</Label>
              <Input id="tenant-billingName" aria-invalid={errors.billingContactName ? true : undefined} {...register("billingContactName")} />
              {errors.billingContactName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.billingContactName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-billingEmail">Billing email</Label>
              <Input id="tenant-billingEmail" type="email" aria-invalid={errors.billingContactEmail ? true : undefined} {...register("billingContactEmail")} />
              {errors.billingContactEmail && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.billingContactEmail.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create tenant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
