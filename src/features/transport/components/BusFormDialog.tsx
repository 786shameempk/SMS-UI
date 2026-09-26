import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Bus, BusFormValues, BusStatus } from "../types";

const busSchema = z.object({
  regNumber: z.string().min(3, "Registration number is required"),
  model: z.string().min(1, "Model is required"),
  capacity: z.coerce.number().int().positive("Must seat at least one"),
  manufactureYear: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  gpsDeviceId: z.string().optional(),
  status: z.enum(["active", "maintenance", "inactive"] as [BusStatus, ...BusStatus[]]),
});

type FormValues = z.infer<typeof busSchema>;

const emptyValues: FormValues = {
  regNumber: "",
  model: "",
  capacity: 30,
  manufactureYear: new Date().getFullYear(),
  gpsDeviceId: "",
  status: "active",
};

export default function BusFormDialog({
  open,
  onOpenChange,
  bus,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus?: Bus | null;
  submitting: boolean;
  onSubmit: (values: BusFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(bus);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(busSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      bus
        ? {
            regNumber: bus.regNumber,
            model: bus.model,
            capacity: bus.capacity,
            manufactureYear: bus.manufactureYear,
            gpsDeviceId: bus.gpsDeviceId ?? "",
            status: bus.status,
          }
        : emptyValues,
    );
  }, [open, bus, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit bus" : "New bus"}</DialogTitle>
          <DialogDescription>Fleet vehicles used to run transport routes.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, gpsDeviceId: values.gpsDeviceId?.trim() || undefined }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bus-regNumber" required>Registration number</Label>
              <Input id="bus-regNumber" placeholder="e.g. KA-05-AB-1234" aria-invalid={errors.regNumber ? true : undefined} {...register("regNumber")} />
              {errors.regNumber && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.regNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bus-model" required>Model</Label>
              <Input id="bus-model" placeholder="e.g. Tata Starbus 40-seater" aria-invalid={errors.model ? true : undefined} {...register("model")} />
              {errors.model && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.model.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bus-capacity" required>Seating capacity</Label>
              <Input id="bus-capacity" type="number" min="1" step="1" aria-invalid={errors.capacity ? true : undefined} {...register("capacity")} />
              {errors.capacity && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.capacity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bus-manufactureYear" required>Manufacture year</Label>
              <Input id="bus-manufactureYear" type="number" step="1" aria-invalid={errors.manufactureYear ? true : undefined} {...register("manufactureYear")} />
              {errors.manufactureYear && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.manufactureYear.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bus-gpsDeviceId" optional>GPS device ID</Label>
              <Input id="bus-gpsDeviceId" placeholder="e.g. GPS-TRK-1001" {...register("gpsDeviceId")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bus-status" required>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="bus-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add bus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
