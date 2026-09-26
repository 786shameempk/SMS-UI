import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student } from "@/features/students/types";
import type { AllocateStudentFormValues, Hostel, HostelAllocation, RoomRow } from "../types";

const allocateSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  hostelId: z.string().min(1, "Select a hostel"),
  roomId: z.string().min(1, "Select a room"),
  monthlyFee: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().nonnegative().optional(),
  ),
});

type FormValues = z.infer<typeof allocateSchema>;

const emptyValues: FormValues = { studentId: "", hostelId: "", roomId: "", monthlyFee: undefined };

export default function AllocateStudentDialog({
  open,
  onOpenChange,
  students,
  hostels,
  rooms,
  existingAllocations,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  hostels: Hostel[];
  rooms: RoomRow[];
  existingAllocations: HostelAllocation[];
  submitting: boolean;
  onSubmit: (values: AllocateStudentFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(allocateSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const hostelId = watch("hostelId");

  const activeHostels = useMemo(() => hostels.filter((h) => h.status === "active"), [hostels]);
  const activeStudentIds = useMemo(
    () => new Set(existingAllocations.filter((a) => a.status === "active").map((a) => a.studentId)),
    [existingAllocations],
  );
  const availableStudents = useMemo(() => students.filter((s) => !activeStudentIds.has(s.id)), [students, activeStudentIds]);
  const availableRooms = useMemo(
    () => rooms.filter((r) => r.hostelId === hostelId && r.status === "active" && r.occupiedBeds < r.capacity),
    [rooms, hostelId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate student to hostel</DialogTitle>
          <DialogDescription>Pick a student, then a hostel and a room with a free bed.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, monthlyFee: values.monthlyFee === undefined || Number.isNaN(values.monthlyFee) ? undefined : values.monthlyFee }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="hal-studentId" required>Student</Label>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="hal-studentId">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} · {s.className}-{s.section} ({s.admissionNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.studentId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.studentId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hal-hostelId" required>Hostel</Label>
            <Controller
              control={control}
              name="hostelId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="hal-hostelId">
                    <SelectValue placeholder="Select a hostel" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeHostels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.hostelId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.hostelId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hal-roomId" required>Room</Label>
            <Controller
              control={control}
              name="roomId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!hostelId}>
                  <SelectTrigger id="hal-roomId">
                    <SelectValue placeholder={hostelId ? "Select a room" : "Select a hostel first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.roomNumber} · {r.floor} ({r.capacity - r.occupiedBeds} free)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {hostelId && availableRooms.length === 0 && (
              <p className="text-xs text-muted-foreground">No rooms with a free bed in this hostel.</p>
            )}
            {errors.roomId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.roomId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hal-monthlyFee" optional>Monthly fee</Label>
            <Input id="hal-monthlyFee" type="number" min="0" step="1" placeholder="e.g. 4500" {...register("monthlyFee")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Allocate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
