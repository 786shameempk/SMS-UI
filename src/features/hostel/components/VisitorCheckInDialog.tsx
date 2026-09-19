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
import type { Hostel, HostelAllocationRow, VisitorCheckInFormValues } from "../types";

const visitorSchema = z.object({
  hostelId: z.string().min(1, "Select a hostel"),
  studentId: z.string().min(1, "Select a student"),
  visitorName: z.string().min(1, "Visitor name is required"),
  relation: z.string().min(1, "Relation is required"),
  phone: z.string().min(6, "Phone number is required"),
  purpose: z.string().optional(),
});

type FormValues = z.infer<typeof visitorSchema>;

const emptyValues: FormValues = { hostelId: "", studentId: "", visitorName: "", relation: "", phone: "", purpose: "" };

export default function VisitorCheckInDialog({
  open,
  onOpenChange,
  hostels,
  residents,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostels: Hostel[];
  residents: HostelAllocationRow[];
  submitting: boolean;
  onSubmit: (values: VisitorCheckInFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(visitorSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const hostelId = watch("hostelId");
  const activeHostels = useMemo(() => hostels.filter((h) => h.status === "active"), [hostels]);
  const hostelResidents = useMemo(() => residents.filter((r) => r.hostelId === hostelId), [residents, hostelId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check in visitor</DialogTitle>
          <DialogDescription>Log a visitor against the resident student they're here to see.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, purpose: values.purpose?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="vis-hostelId">Hostel</Label>
            <Controller
              control={control}
              name="hostelId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="vis-hostelId">
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
            {errors.hostelId && <p className="text-xs text-red-600">{errors.hostelId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vis-studentId">Resident student</Label>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!hostelId}>
                  <SelectTrigger id="vis-studentId">
                    <SelectValue placeholder={hostelId ? "Select a student" : "Select a hostel first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {hostelResidents.map((r) => (
                      <SelectItem key={r.studentId} value={r.studentId}>
                        {r.student.firstName} {r.student.lastName} · {r.room.roomNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.studentId && <p className="text-xs text-red-600">{errors.studentId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vis-visitorName">Visitor name</Label>
              <Input id="vis-visitorName" placeholder="e.g. Rajesh Kumar" {...register("visitorName")} />
              {errors.visitorName && <p className="text-xs text-red-600">{errors.visitorName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vis-relation">Relation</Label>
              <Input id="vis-relation" placeholder="e.g. Father" {...register("relation")} />
              {errors.relation && <p className="text-xs text-red-600">{errors.relation.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vis-phone">Phone</Label>
            <Input id="vis-phone" placeholder="e.g. +91 98450 12345" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vis-purpose">Purpose (optional)</Label>
            <Input id="vis-purpose" placeholder="e.g. Weekly visit" {...register("purpose")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Check in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
