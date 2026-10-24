import { useTranslation } from "react-i18next";
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
  const { t } = useTranslation("hostel");
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
          <DialogTitle>{t("Check in visitor")}</DialogTitle>
          <DialogDescription>{t("Log a visitor against the resident student they're here to see.")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, purpose: values.purpose?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="vis-hostelId" required>{t("Hostel")}</Label>
            <Controller
              control={control}
              name="hostelId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="vis-hostelId">
                    <SelectValue placeholder={t("Select a hostel")} />
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
            {errors.hostelId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.hostelId.message ?? "")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vis-studentId" required>{t("Resident student")}</Label>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!hostelId}>
                  <SelectTrigger id="vis-studentId">
                    <SelectValue placeholder={hostelId ? t("Select a student") : t("Select a hostel first")} />
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
            {errors.studentId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.studentId.message ?? "")}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vis-visitorName" required>{t("Visitor name")}</Label>
              <Input id="vis-visitorName" placeholder={t("e.g. Rajesh Kumar")} aria-invalid={errors.visitorName ? true : undefined} {...register("visitorName")} />
              {errors.visitorName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.visitorName.message ?? "")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vis-relation" required>{t("Relation")}</Label>
              <Input id="vis-relation" placeholder={t("e.g. Father")} aria-invalid={errors.relation ? true : undefined} {...register("relation")} />
              {errors.relation && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.relation.message ?? "")}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vis-phone" required>{t("Phone")}</Label>
            <Input id="vis-phone" placeholder="e.g. +91 98450 12345" aria-invalid={errors.phone ? true : undefined} {...register("phone")} />
            {errors.phone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.phone.message ?? "")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vis-purpose" optional>{t("Purpose")}</Label>
            <Input id="vis-purpose" placeholder={t("e.g. Weekly visit")} {...register("purpose")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {t("Check in")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
