import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StaffMember } from "@/features/staff/types";
import { HOSTEL_TYPE_OPTIONS } from "../constants";
import type { Hostel, HostelFormValues, HostelStatus, HostelType } from "../types";

const NONE = "__none__";

const hostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required"),
  type: z.enum(["boys", "girls", "co-ed"] as [HostelType, ...HostelType[]]),
  wardenStaffId: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"] as [HostelStatus, ...HostelStatus[]]),
});

type FormValues = z.infer<typeof hostelSchema>;

const emptyValues: FormValues = { name: "", type: "co-ed", wardenStaffId: NONE, address: "", status: "active" };

export default function HostelFormDialog({
  open,
  onOpenChange,
  hostel,
  eligibleWardens,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostel?: Hostel | null;
  eligibleWardens: StaffMember[];
  submitting: boolean;
  onSubmit: (values: HostelFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(hostel);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(hostelSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      hostel
        ? {
            name: hostel.name,
            type: hostel.type,
            wardenStaffId: hostel.wardenStaffId ?? NONE,
            address: hostel.address ?? "",
            status: hostel.status,
          }
        : emptyValues,
    );
  }, [open, hostel, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit hostel" : "New hostel"}</DialogTitle>
          <DialogDescription>The warden list only shows staff with designation "Warden" not already assigned elsewhere.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              wardenStaffId: values.wardenStaffId === NONE ? undefined : values.wardenStaffId,
              address: values.address?.trim() || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="hst-name" required>Hostel name</Label>
            <Input id="hst-name" placeholder="e.g. Sunrise Boys Hostel" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hst-type" required>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hst-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOSTEL_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hst-status" required>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hst-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hst-wardenStaffId">Warden</Label>
            <Controller
              control={control}
              name="wardenStaffId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="hst-wardenStaffId">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {eligibleWardens.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hst-address" optional>Address</Label>
            <Input id="hst-address" placeholder="e.g. Block A, School Campus" {...register("address")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create hostel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
