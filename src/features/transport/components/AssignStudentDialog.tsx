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
import type { Student } from "@/features/students/types";
import type { RouteStop, StudentTransportAssignment, StudentTransportAssignmentFormValues, TransportRoute } from "../types";

const assignSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  routeId: z.string().min(1, "Select a route"),
  stopId: z.string().min(1, "Select a stop"),
  monthlyFee: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().nonnegative().optional(),
  ),
});

type FormValues = z.infer<typeof assignSchema>;

const emptyValues: FormValues = { studentId: "", routeId: "", stopId: "", monthlyFee: undefined };

export default function AssignStudentDialog({
  open,
  onOpenChange,
  assignment,
  students,
  routes,
  stops,
  existingAssignments,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: StudentTransportAssignment | null;
  students: Student[];
  routes: TransportRoute[];
  stops: RouteStop[];
  existingAssignments: StudentTransportAssignment[];
  submitting: boolean;
  onSubmit: (values: StudentTransportAssignmentFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(assignment);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(assignSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      assignment
        ? { studentId: assignment.studentId, routeId: assignment.routeId, stopId: assignment.stopId, monthlyFee: assignment.monthlyFee }
        : emptyValues,
    );
  }, [open, assignment, reset]);

  const routeId = watch("routeId");

  const activeStudentIds = useMemo(
    () => new Set(existingAssignments.filter((a) => a.status === "active" && a.id !== assignment?.id).map((a) => a.studentId)),
    [existingAssignments, assignment?.id],
  );
  const availableStudents = useMemo(() => students.filter((s) => !activeStudentIds.has(s.id)), [students, activeStudentIds]);
  const activeRoutes = useMemo(() => routes.filter((r) => r.status === "active"), [routes]);
  const routeStops = useMemo(
    () => stops.filter((s) => s.routeId === routeId).sort((a, b) => a.sequence - b.sequence),
    [stops, routeId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit transport assignment" : "Assign student to transport"}</DialogTitle>
          <DialogDescription>Pick a student, then a route and one of its stops.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, monthlyFee: values.monthlyFee === undefined || Number.isNaN(values.monthlyFee) ? undefined : values.monthlyFee }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ta-studentId">Student</Label>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger id="ta-studentId">
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
            {errors.studentId && <p className="text-xs text-red-600">{errors.studentId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ta-routeId">Route</Label>
            <Controller
              control={control}
              name="routeId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                  }}
                >
                  <SelectTrigger id="ta-routeId">
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRoutes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.routeId && <p className="text-xs text-red-600">{errors.routeId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ta-stopId">Pickup stop</Label>
            <Controller
              control={control}
              name="stopId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!routeId}>
                  <SelectTrigger id="ta-stopId">
                    <SelectValue placeholder={routeId ? "Select a stop" : "Select a route first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {routeStops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.arrivalTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.stopId && <p className="text-xs text-red-600">{errors.stopId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ta-monthlyFee">Monthly fee (optional)</Label>
            <Input id="ta-monthlyFee" type="number" min="0" step="1" placeholder="e.g. 1200" {...register("monthlyFee")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
