import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { addStop, deleteStop, listStops, moveStop, updateStop } from "../api";
import type { RouteStop, RouteStopFormValues, TransportRoute } from "../types";

const stopSchema = z.object({
  name: z.string().min(1, "Stop name is required"),
  arrivalTime: z.string().min(1, "Arrival time is required"),
  landmark: z.string().optional(),
});

type FormValues = z.infer<typeof stopSchema>;

const emptyValues: FormValues = { name: "", arrivalTime: "", landmark: "" };

export default function RouteStopsDialog({
  open,
  onOpenChange,
  route,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: TransportRoute | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<RouteStop | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RouteStop | null>(null);

  const { data: stops = [], isLoading } = useQuery({
    queryKey: ["transport", "stops", route?.id],
    queryFn: () => listStops(route!.id),
    enabled: open && Boolean(route),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(stopSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!formOpen) return;
    reset(editing ? { name: editing.name, arrivalTime: editing.arrivalTime, landmark: editing.landmark ?? "" } : emptyValues);
  }, [formOpen, editing, reset]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport", "stops", route?.id] });

  const addMutation = useMutation({
    mutationFn: (values: RouteStopFormValues) => addStop(route!.id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Stop added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add stop"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RouteStopFormValues }) => updateStop(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Stop updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update stop"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStop,
    onSuccess: () => {
      invalidate();
      toast.success("Stop removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove stop"),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) => moveStop(id, direction),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not reorder stop"),
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
            <DialogTitle>Stops — {route?.name}</DialogTitle>
            <DialogDescription>Stops are visited in order from first to last on the way to school.</DialogDescription>
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
                Add stop
              </Button>

              {isLoading && <p className="text-sm text-muted-foreground">Loading stops…</p>}
              {!isLoading && stops.length === 0 && <p className="text-sm text-muted-foreground">No stops on this route yet.</p>}

              <ul className="space-y-2">
                {stops.map((stop, index) => (
                  <li key={stop.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-slate-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{stop.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stop.arrivalTime}
                        {stop.landmark ? ` · ${stop.landmark}` : ""}
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
                const payload: RouteStopFormValues = { ...values, landmark: values.landmark?.trim() || undefined };
                if (editing) updateMutation.mutate({ id: editing.id, values: payload });
                else addMutation.mutate(payload);
              })}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="stop-name">Stop name</Label>
                <Input id="stop-name" placeholder="e.g. Jayanagar 4th Block" {...register("name")} />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stop-arrivalTime">Arrival time</Label>
                <Input id="stop-arrivalTime" type="time" {...register("arrivalTime")} />
                {errors.arrivalTime && <p className="text-xs text-red-600">{errors.arrivalTime.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stop-landmark">Landmark (optional)</Label>
                <Input id="stop-landmark" placeholder="e.g. Near BDA Complex" {...register("landmark")} />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
                  {(addMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Save changes" : "Add stop"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove stop"
        description={`Remove "${deleteTarget?.name}" from this route? This cannot be undone.`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}
