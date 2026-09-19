import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Room, RoomFormValues } from "../types";

const roomFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
});

const emptyValues: RoomFormValues = { name: "", capacity: 30 };

export default function RoomFormDialog({
  open,
  onOpenChange,
  room,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  onSubmit: (values: RoomFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(room);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({ resolver: zodResolver(roomFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(room ? { name: room.name, capacity: room.capacity } : emptyValues);
    }
  }, [open, room, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit room" : "New room"}</DialogTitle>
          <DialogDescription>Rooms can be selected when assigning a timetable slot.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Room 101" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" type="number" min={1} {...register("capacity")} />
            {errors.capacity && <p className="text-xs text-red-600">{errors.capacity.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
