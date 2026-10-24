import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdmissionApplication, AdmissionInterviewFormValues } from "../types";

const NONE = "__none__";

const interviewSchema = z.object({
  interviewDate: z.string().min(1, "Interview date is required"),
  interviewerName: z.string().min(1, "Interviewer name is required"),
  interviewRating: z.string(),
  interviewRemarks: z.string().optional(),
});

type FormValues = z.infer<typeof interviewSchema>;

export default function AdmissionInterviewDialog({
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
  onSubmit: (values: AdmissionInterviewFormValues) => Promise<void>;
}) {
  const { t } = useTranslation("students");
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(interviewSchema) });

  useEffect(() => {
    if (open && application) {
      reset({
        interviewDate: application.interviewDate?.slice(0, 10) ?? "",
        interviewerName: application.interviewerName ?? "",
        interviewRating: application.interviewRating ? String(application.interviewRating) : NONE,
        interviewRemarks: application.interviewRemarks ?? "",
      });
    }
  }, [open, application, reset]);

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Interview")}</DialogTitle>
          <DialogDescription>
            {t("Schedule the interview for {{name}}, then reopen this to record the outcome.", {
              name: `${application.applicantFirstName} ${application.applicantLastName}`,
            })}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              interviewRating: values.interviewRating === NONE ? undefined : Number(values.interviewRating),
              interviewRemarks: values.interviewRemarks?.trim() || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="int-date">{t("Interview date")}</Label>
              <Input id="int-date" type="date" aria-invalid={errors.interviewDate ? true : undefined} {...register("interviewDate")} />
              {errors.interviewDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.interviewDate.message ?? "")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="int-interviewer">{t("Interviewer")}</Label>
              <Input id="int-interviewer" aria-invalid={errors.interviewerName ? true : undefined} {...register("interviewerName")} />
              {errors.interviewerName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.interviewerName.message ?? "")}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="int-rating" optional>{t("Rating")}</Label>
            <Controller
              control={control}
              name="interviewRating"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="int-rating">
                    <SelectValue placeholder={t("Not yet rated")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("Not yet rated")}</SelectItem>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t("{{rating}} / 5", { rating: n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="int-remarks" optional>{t("Remarks")}</Label>
            <Textarea id="int-remarks" rows={3} {...register("interviewRemarks")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
