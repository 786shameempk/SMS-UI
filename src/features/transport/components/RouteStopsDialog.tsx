import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, LocateFixed, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { addStop, deleteStop, listStops, moveStop, updateStop } from "../api";
import type { RouteStop, RouteStopFormValues, TransportRoute } from "../types";

const StopLocationPicker = lazy(() => import("./StopLocationPicker"));

const stopSchema = z.object({
  name: z.string().min(1, "Stop name is required"),
  arrivalTime: z.string().min(1, "Arrival time is required"),
  landmark: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  arrivalRadiusMeters: z.string().optional(),
}).superRefine((v, ctx) => {
  const lat = v.latitude?.trim();
  const lng = v.longitude?.trim();
  if (!lat && !lng) return;
  if (!lat || !lng) ctx.addIssue({ code: "custom", path: [lat ? "longitude" : "latitude"], message: "Enter both latitude and longitude, or leave both empty" });
  if (lat && !(Number.isFinite(Number(lat)) && Math.abs(Number(lat)) <= 90)) ctx.addIssue({ code: "custom", path: ["latitude"], message: "Latitude must be between -90 and 90" });
  if (lng && !(Number.isFinite(Number(lng)) && Math.abs(Number(lng)) <= 180)) ctx.addIssue({ code: "custom", path: ["longitude"], message: "Longitude must be between -180 and 180" });
  const radius = v.arrivalRadiusMeters?.trim();
  if (radius && !(Number.isInteger(Number(radius)) && Number(radius) >= 5 && Number(radius) <= 500)) ctx.addIssue({ code: "custom", path: ["arrivalRadiusMeters"], message: "Radius must be 5 to 500 metres" });
});

type FormValues = z.infer<typeof stopSchema>;

const emptyValues: FormValues = { name: "", arrivalTime: "", landmark: "", latitude: "", longitude: "", arrivalRadiusMeters: "10" };

export default function RouteStopsDialog({
  open,
  onOpenChange,
  route,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: TransportRoute | null;
}) {
  const { t } = useTranslation("transport");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<RouteStop | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RouteStop | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: stops = [], isLoading } = useQuery({
    queryKey: ["transport", "stops", route?.id],
    queryFn: () => listStops(route!.id),
    enabled: open && Boolean(route),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(stopSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!formOpen) return;
    reset(
      editing
        ? {
            name: editing.name,
            arrivalTime: editing.arrivalTime,
            landmark: editing.landmark ?? "",
            latitude: editing.latitude != null ? String(editing.latitude) : "",
            longitude: editing.longitude != null ? String(editing.longitude) : "",
            arrivalRadiusMeters: String(editing.arrivalRadiusMeters),
          }
        : emptyValues,
    );
  }, [formOpen, editing, reset]);

  const [latText, lngText, radiusText] = watch(["latitude", "longitude", "arrivalRadiusMeters"]);
  const pickedLat = latText?.trim() && Number.isFinite(Number(latText)) ? Number(latText) : undefined;
  const pickedLng = lngText?.trim() && Number.isFinite(Number(lngText)) ? Number(lngText) : undefined;
  const setPosition = (lat: number, lng: number) => {
    setValue("latitude", String(lat), { shouldValidate: true });
    setValue("longitude", String(lng), { shouldValidate: true });
  };
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("This browser cannot share its location"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => {
        toast.error(t("Could not get your location. Allow location access, or enter the coordinates."));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport", "stops", route?.id] });

  const addMutation = useMutation({
    mutationFn: (values: RouteStopFormValues) => addStop(route!.id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Stop added"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not add stop")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RouteStopFormValues }) => updateStop(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Stop updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update stop")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStop,
    onSuccess: () => {
      invalidate();
      toast.success(t("Stop removed"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not remove stop")),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) => moveStop(id, direction),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not reorder stop")),
  });

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v);
          if (!v) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Stops — {{route}}", { route: route?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("Stops are visited in order from first to last on the way to school.")}</DialogDescription>
          </DialogHeader>

          {!formOpen && (
            <div className="space-y-3">
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t("Add stop")}
              </Button>

              {isLoading && <p className="text-sm text-muted-foreground">{t("Loading stops…")}</p>}
              {!isLoading && stops.length === 0 && <p className="text-sm text-muted-foreground">{t("No stops on this route yet.")}</p>}

              <ul className="space-y-2">
                {stops.map((stop, index) => (
                  <li key={stop.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{stop.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stop.arrivalTime}
                        {stop.landmark ? ` · ${stop.landmark}` : ""}
                        {stop.latitude != null && (
                          <span className="ms-1 inline-flex items-center gap-0.5 text-success" title={t("Map location set: reached within {{m}} m", { m: stop.arrivalRadiusMeters })}>
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            <span className="sr-only">{t("Map location set")}</span>
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0 || moveMutation.isPending}
                        onClick={() => moveMutation.mutate({ id: stop.id, direction: "up" })}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === stops.length - 1 || moveMutation.isPending}
                        onClick={() => moveMutation.mutate({ id: stop.id, direction: "down" })}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(stop);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(stop)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {formOpen && (
            <form
              onSubmit={handleSubmit((values) => {
                const located = Boolean(values.latitude?.trim() && values.longitude?.trim());
                const payload: RouteStopFormValues = {
                  name: values.name,
                  arrivalTime: values.arrivalTime,
                  landmark: values.landmark?.trim() || undefined,
                  latitude: located ? Number(values.latitude) : undefined,
                  longitude: located ? Number(values.longitude) : undefined,
                  arrivalRadiusMeters: located ? Number(values.arrivalRadiusMeters?.trim() || 10) : undefined,
                };
                if (editing) updateMutation.mutate({ id: editing.id, values: payload });
                else addMutation.mutate(payload);
              })}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="stop-name" required>{t("Stop name")}</Label>
                <Input id="stop-name" placeholder={t("e.g. Jayanagar 4th Block")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
                {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.name.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stop-arrivalTime" required>{t("Arrival time")}</Label>
                <Input id="stop-arrivalTime" type="time" aria-invalid={errors.arrivalTime ? true : undefined} {...register("arrivalTime")} />
                {errors.arrivalTime && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.arrivalTime.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stop-landmark" optional>{t("Landmark")}</Label>
                <Input id="stop-landmark" placeholder={t("e.g. Near BDA Complex")} {...register("landmark")} />
              </div>
              <fieldset className="space-y-3 rounded-lg border border-border p-3">
                <legend className="px-1 text-xs font-medium text-muted-foreground">{t("Map location (optional)")}</legend>
                <p className="text-xs text-muted-foreground">
                  {t("With a location, the stop turns green for parents when the bus comes within the radius. Click the map, use your current location, or type the coordinates.")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="stop-latitude" optional>{t("Latitude")}</Label>
                    <Input id="stop-latitude" inputMode="decimal" placeholder="11.250000" aria-invalid={errors.latitude ? true : undefined} {...register("latitude")} />
                    {errors.latitude && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.latitude.message ?? "")}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stop-longitude" optional>{t("Longitude")}</Label>
                    <Input id="stop-longitude" inputMode="decimal" placeholder="75.780000" aria-invalid={errors.longitude ? true : undefined} {...register("longitude")} />
                    {errors.longitude && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.longitude.message ?? "")}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="stop-radius" optional>{t("Arrival radius (m)")}</Label>
                    <Input id="stop-radius" inputMode="numeric" className="w-28" aria-invalid={errors.arrivalRadiusMeters ? true : undefined} {...register("arrivalRadiusMeters")} />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                    {t("Use my current location")}
                  </Button>
                  {(latText || lngText) && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setValue("latitude", ""); setValue("longitude", ""); }}>
                      {t("Clear location")}
                    </Button>
                  )}
                </div>
                {errors.arrivalRadiusMeters && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.arrivalRadiusMeters.message ?? "")}</p>}
                <Suspense fallback={<p className="text-xs text-muted-foreground">{t("Loading map…")}</p>}>
                  <StopLocationPicker latitude={pickedLat} longitude={pickedLng} radiusMeters={Number(radiusText) >= 5 ? Number(radiusText) : 10} onPick={setPosition} />
                </Suspense>
              </fieldset>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormOpen(false);
                    setEditing(null);
                  }}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
                  {(addMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? t("Save changes") : t("Add stop")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Remove stop")}
        description={t('Remove "{{name}}" from this route? This cannot be undone.', { name: deleteTarget?.name })}
        confirmLabel={t("Remove")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}
