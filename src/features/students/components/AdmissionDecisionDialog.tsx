import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DECISION_OPTIONS } from "../constants";
import { listSeatAvailability } from "../api";
import type { AdmissionApplication, AdmissionDecisionFormValues, SelectionDecision } from "../types";

const decisionSchema = z.object({
  decision: z.enum(["selected", "waitlisted", "rejected"] as [SelectionDecision, ...SelectionDecision[]]),
  decisionRemarks: z.string().optional(),
});

type FormValues = z.infer<typeof decisionSchema>;

export default function AdmissionDecisionDialog({
  open,
  onOpenChange,
  application,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AdmissionApplication | null;
  submitting: boolean;
  onSubmit: (values: AdmissionDecisionFormValues) => Promise<void>;
}) {
  const { data: seatAvailability = [] } = useQuery({ queryKey: ["students", "seat-availability"], queryFn: listSeatAvailability, enabled: open });

  const {
    handleSubmit,
    reset,
    control,
    register,
  } = useForm<FormValues>({ resolver: zodResolver(decisionSchema), defaultValues: { decision: "selected", decisionRemarks: "" } });

  useEffect(() => {
    if (open && application) reset({ decision: "selected", decisionRemarks: "" });
  }, [open, application, reset]);

  if (!application) return null;
  const seats = seatAvailability.find((s) => s.className === application.appliedClass);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selection decision</DialogTitle>
          <DialogDescription>
            Decide the outcome for {application.applicantFirstName} {application.applicantLastName} ({application.appliedClass}).
          </DialogDescription>
        </DialogHeader>

        {seats && (
          <p className={`text-xs rounded-md border px-2.5 py-2 ${seats.availableSeats > 0 ? "bg-secondary/40 border-border text-slate-600" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            {seats.availableSeats > 0
              ? `${seats.availableSeats} of ${seats.capacity} seats currently available in ${seats.className}.`
              : `${seats.className} currently has no seats available (${seats.currentStrength}/${seats.capacity}) — consider waitlisting.`}
          </p>
        )}

        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, decisionRemarks: values.decisionRemarks?.trim() || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dec-decision">Decision</Label>
            <Controller
              control={control}
              name="decision"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="dec-decision">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DECISION_OPTIONS.map((o) => (
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
            <Label htmlFor="dec-remarks">Remarks (optional)</Label>
            <Textarea id="dec-remarks" rows={3} {...register("decisionRemarks")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Record decision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
