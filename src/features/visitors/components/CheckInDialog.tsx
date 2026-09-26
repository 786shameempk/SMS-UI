import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { ID_PROOF_TYPES, PURPOSE_OPTIONS } from "../constants";
import { getWatchlistMatch } from "../api";
import type { VisitorCheckInFormValues, VisitorHostType, VisitPurpose } from "../types";

const checkInSchema = z
  .object({
    visitorName: z.string().min(1, "Visitor name is required"),
    phone: z.string().min(1, "Phone number is required"),
    idProofType: z.string().optional(),
    idProofNumber: z.string().optional(),
    purpose: z.enum(PURPOSE_OPTIONS.map((o) => o.value) as [VisitPurpose, ...VisitPurpose[]]),
    purposeNotes: z.string().optional(),
    hostType: z.enum(["student", "staff", "other"] as [VisitorHostType, ...VisitorHostType[]]),
    hostStudentId: z.string().optional(),
    hostStaffId: z.string().optional(),
    hostOtherLabel: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.hostType === "student" && !values.hostStudentId) ctx.addIssue({ code: "custom", path: ["hostStudentId"], message: "Select who they're visiting" });
    if (values.hostType === "staff" && !values.hostStaffId) ctx.addIssue({ code: "custom", path: ["hostStaffId"], message: "Select who they're visiting" });
    if (values.hostType === "other" && !values.hostOtherLabel?.trim()) ctx.addIssue({ code: "custom", path: ["hostOtherLabel"], message: "Describe who or where they're visiting" });
  });

type FormValues = z.infer<typeof checkInSchema>;

const emptyValues: FormValues = {
  visitorName: "",
  phone: "",
  idProofType: "",
  idProofNumber: "",
  purpose: "meeting",
  purposeNotes: "",
  hostType: "staff",
  hostStudentId: "",
  hostStaffId: "",
  hostOtherLabel: "",
};

export default function CheckInDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: VisitorCheckInFormValues) => Promise<void>;
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
  } = useForm<FormValues>({ resolver: zodResolver(checkInSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const hostType = watch("hostType");
  const visitorName = watch("visitorName");
  const { data: watchlistMatch } = useQuery({
    queryKey: ["visitors", "watchlist-match", visitorName],
    queryFn: () => getWatchlistMatch(visitorName),
    enabled: visitorName.trim().length > 1,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Check in a visitor</DialogTitle>
          <DialogDescription>Front-desk entry — issues a badge number and starts the visit.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              idProofType: values.idProofType || undefined,
              idProofNumber: values.idProofNumber?.trim() || undefined,
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
              <Label htmlFor="visit-name">Visitor name</Label>
              <Input id="visit-name" aria-invalid={errors.visitorName ? true : undefined} {...register("visitorName")} />
              {errors.visitorName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.visitorName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-phone">Phone</Label>
              <Input id="visit-phone" aria-invalid={errors.phone ? true : undefined} {...register("phone")} />
              {errors.phone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.phone.message}</p>}
            </div>
          </div>

          {watchlistMatch && (
            <p className="text-xs rounded-md border border-destructive/30 bg-destructive-soft text-destructive-strong px-2.5 py-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>{watchlistMatch.name}</strong> matches a watchlist entry: {watchlistMatch.reason}
              </span>
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visit-idType" optional>ID proof type</Label>
              <Controller
                control={control}
                name="idProofType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="visit-idType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_PROOF_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-idNumber" optional>ID proof number</Label>
              <Input id="visit-idNumber" {...register("idProofNumber")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-purpose">Purpose of visit</Label>
            <Controller
              control={control}
              name="purpose"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="visit-purpose">
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
            <Label htmlFor="visit-purposeNotes" optional>Notes</Label>
            <Textarea id="visit-purposeNotes" rows={2} {...register("purposeNotes")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-hostType">Here to see</Label>
            <Controller
              control={control}
              name="hostType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="visit-hostType">
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
              <Label htmlFor="visit-hostStaffId">Staff member</Label>
              <Controller
                control={control}
                name="hostStaffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="visit-hostStaffId">
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
              <Label htmlFor="visit-hostStudentId">Student</Label>
              <Controller
                control={control}
                name="hostStudentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="visit-hostStudentId">
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
              <Label htmlFor="visit-hostOtherLabel">Where / department</Label>
              <Input id="visit-hostOtherLabel" placeholder="e.g. Front Office, School Auditorium" aria-invalid={errors.hostOtherLabel ? true : undefined} {...register("hostOtherLabel")} />
              {errors.hostOtherLabel && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.hostOtherLabel.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Check in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
