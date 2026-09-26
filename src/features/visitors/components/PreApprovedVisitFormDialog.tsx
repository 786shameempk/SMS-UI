import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { nowLocalDateTimeValue, PURPOSE_OPTIONS } from "../constants";
import type { PreApprovedVisitFormValues, VisitorHostType, VisitPurpose } from "../types";

const preApprovalSchema = z
  .object({
    visitorName: z.string().min(1, "Visitor name is required"),
    phone: z.string().min(1, "Phone number is required"),
    purpose: z.enum(PURPOSE_OPTIONS.map((o) => o.value) as [VisitPurpose, ...VisitPurpose[]]),
    purposeNotes: z.string().optional(),
    hostType: z.enum(["student", "staff", "other"] as [VisitorHostType, ...VisitorHostType[]]),
    hostStudentId: z.string().optional(),
    hostStaffId: z.string().optional(),
    hostOtherLabel: z.string().optional(),
    scheduledAt: z.string().min(1, "Scheduled date/time is required"),
  })
  .superRefine((values, ctx) => {
    if (values.hostType === "student" && !values.hostStudentId) ctx.addIssue({ code: "custom", path: ["hostStudentId"], message: "Select who they're visiting" });
    if (values.hostType === "staff" && !values.hostStaffId) ctx.addIssue({ code: "custom", path: ["hostStaffId"], message: "Select who they're visiting" });
    if (values.hostType === "other" && !values.hostOtherLabel?.trim()) ctx.addIssue({ code: "custom", path: ["hostOtherLabel"], message: "Describe who or where they're visiting" });
  });

type FormValues = z.infer<typeof preApprovalSchema>;

function emptyValues(): FormValues {
  return {
    visitorName: "",
    phone: "",
    purpose: "meeting",
    purposeNotes: "",
    hostType: "staff",
    hostStudentId: "",
    hostStaffId: "",
    hostOtherLabel: "",
    scheduledAt: nowLocalDateTimeValue(),
  };
}

export default function PreApprovedVisitFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: PreApprovedVisitFormValues) => Promise<void>;
}) {
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(preApprovalSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  const hostType = watch("hostType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a pre-approved visit</DialogTitle>
          <DialogDescription>Front desk can check the visitor in on arrival against this appointment.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              purposeNotes: values.purposeNotes?.trim() || undefined,
              hostStudentId: values.hostType === "student" ? values.hostStudentId : undefined,
              hostStaffId: values.hostType === "staff" ? values.hostStaffId : undefined,
              hostOtherLabel: values.hostType === "other" ? values.hostOtherLabel?.trim() : undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pre-name">Visitor name</Label>
              <Input id="pre-name" aria-invalid={errors.visitorName ? true : undefined} {...register("visitorName")} />
              {errors.visitorName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.visitorName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pre-phone">Phone</Label>
              <Input id="pre-phone" aria-invalid={errors.phone ? true : undefined} {...register("phone")} />
              {errors.phone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pre-purpose">Purpose</Label>
              <Controller
                control={control}
                name="purpose"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pre-purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((o) => (
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
              <Label htmlFor="pre-scheduledAt">Scheduled for</Label>
              <Input id="pre-scheduledAt" type="datetime-local" aria-invalid={errors.scheduledAt ? true : undefined} {...register("scheduledAt")} />
              {errors.scheduledAt && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.scheduledAt.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pre-notes" optional>Notes</Label>
            <Textarea id="pre-notes" rows={2} {...register("purposeNotes")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pre-hostType">Here to see</Label>
            <Controller
              control={control}
              name="hostType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="pre-hostType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">A staff member</SelectItem>
                    <SelectItem value="student">A student</SelectItem>
                    <SelectItem value="other">Somewhere else (office, event, etc.)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {hostType === "staff" && (
            <div className="space-y-1.5">
              <Label htmlFor="pre-hostStaffId">Staff member</Label>
              <Controller
                control={control}
                name="hostStaffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pre-hostStaffId">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} · {s.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.hostStaffId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.hostStaffId.message}</p>}
            </div>
          )}

          {hostType === "student" && (
            <div className="space-y-1.5">
              <Label htmlFor="pre-hostStudentId">Student</Label>
              <Controller
                control={control}
                name="hostStudentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pre-hostStudentId">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} · {s.className} - {s.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.hostStudentId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.hostStudentId.message}</p>}
            </div>
          )}

          {hostType === "other" && (
            <div className="space-y-1.5">
              <Label htmlFor="pre-hostOtherLabel">Where / department</Label>
              <Input id="pre-hostOtherLabel" placeholder="e.g. Front Office, School Auditorium" aria-invalid={errors.hostOtherLabel ? true : undefined} {...register("hostOtherLabel")} />
              {errors.hostOtherLabel && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.hostOtherLabel.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Schedule visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
