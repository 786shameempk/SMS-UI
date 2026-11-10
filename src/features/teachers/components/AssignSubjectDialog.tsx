import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Section, Subject } from "@/features/academics/types";

const assignSubjectSchema = z.object({
  classId: z.string().min(1, "Select a standard"),
  sectionId: z.string(),
  subjectId: z.string().min(1, "Select a subject"),
});

type AssignSubjectFormValues = z.infer<typeof assignSubjectSchema>;

const ALL_DIVISIONS = "__all__";

const emptyValues: AssignSubjectFormValues = { classId: "", sectionId: "", subjectId: "" };

export default function AssignSubjectDialog({
  open,
  onOpenChange,
  classes,
  sections,
  subjects,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  sections: Section[];
  subjects: Subject[];
  onSubmit: (values: AssignSubjectFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("teachers");
  const {
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssignSubjectFormValues>({ resolver: zodResolver(assignSubjectSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const classId = watch("classId");
  // Only the subjects set up for the chosen standard in Academic setup, and only that standard's divisions.
  const availableSubjects = useMemo(
    () => (classId ? subjects.filter((s) => s.classIds.includes(classId)) : []),
    [subjects, classId],
  );
  const availableSections = useMemo(
    () => (classId ? sections.filter((s) => s.classId === classId) : []),
    [sections, classId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Assign subject")}</DialogTitle>
          <DialogDescription>{t("Link a standard, division and subject to this teacher.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-classId" required>{t("Standard")}</Label>
            <Controller
              control={control}
              name="classId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("sectionId", "");
                    setValue("subjectId", "");
                  }}
                >
                  <SelectTrigger id="assign-classId">
                    <SelectValue placeholder={t("Select a standard")} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.classId.message ?? "")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-sectionId">{t("Division")}</Label>
            <Controller
              control={control}
              name="sectionId"
              render={({ field }) => (
                <Select value={field.value || ALL_DIVISIONS} onValueChange={(v) => field.onChange(v === ALL_DIVISIONS ? "" : v)} disabled={!classId}>
                  <SelectTrigger id="assign-sectionId">
                    <SelectValue placeholder={t("All divisions")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_DIVISIONS}>{t("All divisions")}</SelectItem>
                    {availableSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-subjectId" required>{t("Subject")}</Label>
            <Controller
              control={control}
              name="subjectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!classId}>
                  <SelectTrigger id="assign-subjectId">
                    <SelectValue placeholder={classId ? t("Select a subject") : t("Select a standard first")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subjectId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.subjectId.message ?? "")}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {t("Assign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
