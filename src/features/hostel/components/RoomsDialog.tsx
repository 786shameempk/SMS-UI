import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { ROOM_STATUS_CONFIG, ROOM_TYPE_OPTIONS } from "../constants";
import { addRoom, deleteRoom, listRooms, updateRoom } from "../api";
import type { Hostel, Room, RoomFormValues, RoomStatus, RoomType } from "../types";

const roomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  floor: z.string().min(1, "Floor is required"),
  capacity: z.coerce.number().int().positive("Must have at least one bed"),
  roomType: z.enum(["single", "double", "triple", "dormitory"] as [RoomType, ...RoomType[]]),
  status: z.enum(["active", "maintenance"] as [RoomStatus, ...RoomStatus[]]),
});

type FormValues = z.infer<typeof roomSchema>;

const emptyValues: FormValues = { roomNumber: "", floor: "", capacity: 2, roomType: "double", status: "active" };

export default function RoomsDialog({
  open,
  onOpenChange,
  hostel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostel: Hostel | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Room | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["hostel", "rooms", hostel?.id],
    queryFn: () => listRooms(hostel!.id),
    enabled: open && Boolean(hostel),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(roomSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!formOpen) return;
    reset(
      editing
        ? { roomNumber: editing.roomNumber, floor: editing.floor, capacity: editing.capacity, roomType: editing.roomType, status: editing.status }
        : emptyValues,
    );
  }, [formOpen, editing, reset]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hostel", "rooms", hostel?.id] });
    queryClient.invalidateQueries({ queryKey: ["hostel", "hostels"] });
  };

  const addMutation = useMutation({
    mutationFn: (values: RoomFormValues) => addRoom(hostel!.id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Room added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add room"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RoomFormValues }) => updateRoom(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Room updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update room"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      invalidate();
      toast.success("Room removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove room"),
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
            <DialogTitle>Rooms — {hostel?.name}</DialogTitle>
            <DialogDescription>Capacity sets the number of beds; occupancy updates as students are allocated.</DialogDescription>
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
                Add room
              </Button>

              {isLoading && <p className="text-sm text-muted-foreground">Loading rooms…</p>}
              {!isLoading && rooms.length === 0 && <p className="text-sm text-muted-foreground">No rooms in this hostel yet.</p>}

              <ul className="space-y-2">
                {rooms.map((room) => {
                  const config = ROOM_STATUS_CONFIG[room.status];
                  return (
                    <li key={room.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {room.roomNumber} <span className="text-xs text-muted-foreground font-normal">· {room.floor}</span>
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {room.roomType} · {room.occupiedBeds}/{room.capacity} beds occupied
                        </p>
                      </div>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(room);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(room)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {formOpen && (
            <form
              onSubmit={handleSubmit((values) => {
                if (editing) updateMutation.mutate({ id: editing.id, values });
                else addMutation.mutate(values);
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="room-roomNumber" required>Room number</Label>
                  <Input id="room-roomNumber" placeholder="e.g. 1-101" aria-invalid={errors.roomNumber ? true : undefined} {...register("roomNumber")} />
                  {errors.roomNumber && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.roomNumber.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room-floor" required>Floor</Label>
                  <Input id="room-floor" placeholder="e.g. 1st Floor" aria-invalid={errors.floor ? true : undefined} {...register("floor")} />
                  {errors.floor && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.floor.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="room-capacity" required>Capacity (beds)</Label>
                  <Input id="room-capacity" type="number" min="1" step="1" aria-invalid={errors.capacity ? true : undefined} {...register("capacity")} />
                  {errors.capacity && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.capacity.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room-roomType" required>Room type</Label>
                  <Controller
                    control={control}
                    name="roomType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="room-roomType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPE_OPTIONS.map((o) => (
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
                <Label htmlFor="room-status" required>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="room-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
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
                  {editing ? "Save changes" : "Add room"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove room"
        description={`Remove room "${deleteTarget?.roomNumber}"? This cannot be undone.`}
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
