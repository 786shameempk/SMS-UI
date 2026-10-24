import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAVE_TYPES } from "../constants";
import type { LeaveRequestFormValues, StaffMember } from "../types";

const leaveFormSchema = z
  .object({
    staffId: z.string().min(1, "Select a staff member"),
    leaveType: z.enum(["sick", "casual", "earned", "unpaid"]),
    fromDate: z.string().min(1, "Start date is required"),
    toDate: z.string().min(1, "End date is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine((v) => new Date(v.toDate) >= new Date(v.fromDate), { message: "End date must be after start date", path: ["toDate"] });

export default function LeaveRequestFormDialog({
  open,
  onOpenChange,
  staffList,
  selfOnly = false,
  selfStaffId = null,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: StaffMember[];
  /** Teachers and other non-HR staff request leave only for themselves: the staff member is fixed to their own record. */
  selfOnly?: boolean;
  /** The signed-in login's own staff record, when it has one. */
  selfStaffId?: string | null;
  onSubmit: (values: LeaveRequestFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("staff");
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { staffId: "", leaveType: "casual", fromDate: "", toDate: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ staffId: selfOnly ? (selfStaffId ?? "") : "", leaveType: "casual", fromDate: "", toDate: "", reason: "" });
  }, [open, reset, selfOnly, selfStaffId]);

  const me = selfOnly ? staffList.find((s) => s.id === selfStaffId) : undefined;
  const unlinked = selfOnly && !selfStaffId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("New leave request")}</DialogTitle>
          <DialogDescription>{selfOnly ? t("Request leave for yourself. It goes to HR for approval.") : t("Record leave on behalf of a staff member.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {selfOnly ? (
            <div className="space-y-1.5">
              <Label htmlFor="staffId">{t("Staff member")}</Label>
              {unlinked ? (
                <p role="alert" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-strong">
                  {t("Your login isn't linked to a staff record, so leave can't be requested from here. Ask an administrator to link it.")}
                </p>
              ) : (
                <>
                  <Input id="staffId" readOnly value={me ? `${me.firstName} ${me.lastName} · ${t(me.designation)}` : t("You")} aria-describedby="staffId-hint" />
                  <p id="staffId-hint" className="text-xs text-muted-foreground">{t("Leave is requested for you; it can't be filed for someone else.")}</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="staffId">{t("Staff member")}</Label>
              <Controller
                control={control}
                name="staffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="staffId">
                      <SelectValue placeholder={t("Select a staff member")} />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} &middot; {t(s.designation)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.staffId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.staffId.message ?? "")}</p>}
            </div>
  
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="leaveType">{t("Type")}</Label>
              <Controller
                control={control}
                name="leaveType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="leaveType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t(type.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="fromDate">{t("From")}</Label>
              <Input id="fromDate" type="date" aria-invalid={errors.fromDate ? true : undefined} {...register("fromDate")} />
              {errors.fromDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.fromDate.message ?? "")}</p>}
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="toDate">{t("To")}</Label>
              <Input id="toDate" type="date" aria-invalid={errors.toDate ? true : undefined} {...register("toDate")} />
              {errors.toDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.toDate.message ?? "")}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">{t("Reason")}</Label>
            <Textarea id="reason" rows={2} aria-invalid={errors.reason ? true : undefined} {...register("reason")} />
            {errors.reason && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.reason.message ?? "")}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting} disabled={unlinked}>
              {t("Submit request")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
