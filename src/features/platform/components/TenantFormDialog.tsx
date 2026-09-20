import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
            <Label htmlFor="tenant-schoolName">School name</Label>
            <Input id="tenant-schoolName" {...register("schoolName")} />
            {errors.schoolName && <p className="text-xs text-red-600">{errors.schoolName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenant-subdomain">Subdomain</Label>
            <div className="flex items-center gap-1.5">
              <Input id="tenant-subdomain" placeholder="riverside-intl" {...register("subdomain")} />
              <span className="text-sm text-muted-foreground shrink-0">.educore.app</span>
            </div>
            {errors.subdomain && <p className="text-xs text-red-600">{errors.subdomain.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenant-planId">Plan</Label>
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
            {errors.planId && <p className="text-xs text-red-600">{errors.planId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tenant-billingName">Billing contact</Label>
              <Input id="tenant-billingName" {...register("billingContactName")} />
              {errors.billingContactName && <p className="text-xs text-red-600">{errors.billingContactName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-billingEmail">Billing email</Label>
              <Input id="tenant-billingEmail" type="email" {...register("billingContactEmail")} />
              {errors.billingContactEmail && <p className="text-xs text-red-600">{errors.billingContactEmail.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create tenant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
