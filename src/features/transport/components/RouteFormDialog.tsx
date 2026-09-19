import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Bus, Driver, RouteStatus, TransportRoute, TransportRouteFormValues } from "../types";

const NONE = "__none__";

const routeSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  busId: z.string().optional(),
  driverId: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  status: z.enum(["active", "inactive"] as [RouteStatus, ...RouteStatus[]]),
});

type FormValues = z.infer<typeof routeSchema>;

const emptyValues: FormValues = { name: "", busId: NONE, driverId: NONE, startTime: "07:00", endTime: "08:00", status: "active" };

export default function RouteFormDialog({
  open,
  onOpenChange,
  route,
  buses,
  drivers,
  routes,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route?: TransportRoute | null;
  buses: Bus[];
  drivers: Driver[];
  routes: TransportRoute[];
  submitting: boolean;
  onSubmit: (values: TransportRouteFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(route);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(routeSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      route
        ? {
            name: route.name,
            busId: route.busId ?? NONE,
            driverId: route.driverId ?? NONE,
            startTime: route.startTime,
            endTime: route.endTime,
            status: route.status,
          }
        : emptyValues,
    );
  }, [open, route, reset]);

  const busIdsInUse = useMemo(
    () => new Set(routes.filter((r) => r.id !== route?.id && r.busId).map((r) => r.busId)),
    [routes, route?.id],
  );
  const driverIdsInUse = useMemo(
    () => new Set(routes.filter((r) => r.id !== route?.id && r.driverId).map((r) => r.driverId)),
    [routes, route?.id],
  );

  const availableBuses = useMemo(() => buses.filter((b) => b.status === "active" && !busIdsInUse.has(b.id)), [buses, busIdsInUse]);
  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.status === "active" && !driverIdsInUse.has(d.id)),
    [drivers, driverIdsInUse],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit route" : "New route"}</DialogTitle>
          <DialogDescription>Bus and driver lists only show vehicles/staff not already tied to another active route.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              busId: values.busId === NONE ? undefined : values.busId,
              driverId: values.driverId === NONE ? undefined : values.driverId,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="rt-name">Route name</Label>
            <Input id="rt-name" placeholder="e.g. Route 1 — Jayanagar / JP Nagar" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt-busId">Bus</Label>
              <Controller
                control={control}
                name="busId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rt-busId">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {availableBuses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.regNumber} ({b.capacity} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-driverId">Driver</Label>
              <Controller
                control={control}
                name="driverId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rt-driverId">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {availableDrivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.staff.firstName} {d.staff.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt-startTime">Start time</Label>
              <Input id="rt-startTime" type="time" {...register("startTime")} />
              {errors.startTime && <p className="text-xs text-red-600">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-endTime">End time</Label>
              <Input id="rt-endTime" type="time" {...register("endTime")} />
              {errors.endTime && <p className="text-xs text-red-600">{errors.endTime.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rt-status">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="rt-status">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
