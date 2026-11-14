import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAssessmentAssignments, listAssessmentStructures } from "@/features/examinations/api";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECT_TYPES } from "../constants";
import type { SchoolClass, Subject, SubjectFormValues } from "../types";

import { useTranslation } from "react-i18next";
const subjectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  type: z.enum(SUBJECT_TYPES),
  classIds: z.array(z.string()).min(1, "Select at least one standard"),
});

const emptyValues: SubjectFormValues = { name: "", code: "", type: "core", classIds: [] };

export default function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  classes,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
  classes: SchoolClass[];
  /** structureId is the assessment structure chosen for this subject ("" = none). */
  onSubmit: (values: SubjectFormValues, structureId: string) => Promise<void>;
  submitting: boolean;
}) {
  const { t: tr } = useTranslation("academics");
  const isEdit = Boolean(subject);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SubjectFormValues>({ resolver: zodResolver(subjectFormSchema), defaultValues: emptyValues });

  // Assessment configuration: the structure that applies to this subject in every class unless a more specific assignment exists.
  const { data: structures = [] } = useQuery({ queryKey: ["examinations", "assessment-structures"], queryFn: () => listAssessmentStructures(), enabled: open });
  const { data: assignments = [] } = useQuery({ queryKey: ["examinations", "assessment-assignments"], queryFn: listAssessmentAssignments, enabled: open });
  const [structureId, setStructureId] = useState("");
  useEffect(() => {
    if (!open) return;
    const own = subject ? assignments.find((a) => a.subjectId === subject.id && !a.classId && !a.academicYearId) : undefined;
    setStructureId(own?.structureId ?? "");
  }, [open, subject, assignments]);

  useEffect(() => {
    if (open) {
      reset(subject ? { name: subject.name, code: subject.code, type: subject.type, classIds: subject.classIds } : emptyValues);
    }
  }, [open, subject, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? tr("Edit subject") : tr("New subject")}</DialogTitle>
          <DialogDescription>{tr("Subjects are core or elective and can be linked to one or more standards.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => onSubmit(v, structureId))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" required>{tr("Name")}</Label>
              <Input id="name" placeholder={tr("e.g. Mathematics")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
              {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code" required>{tr("Code")}</Label>
              <Input id="code" placeholder={tr("e.g. MATH")} aria-invalid={errors.code ? true : undefined} {...register("code")} />
              {errors.code && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.code.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type" required>{tr("Type")}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{tr("Standards")}</Label>
            <Controller
              control={control}
              name="classIds"
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
                  {classes.map((c) => {
                    const checked = field.value.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            if (value) field.onChange([...field.value, c.id]);
                            else field.onChange(field.value.filter((id) => id !== c.id));
                          }}
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.classIds && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.classIds.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assessment-structure" optional>{tr("Assessment configuration")}</Label>
            <Select value={structureId || "__none__"} onValueChange={(v) => setStructureId(v === "__none__" ? "" : v)}>
              <SelectTrigger id="assessment-structure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tr("None (a single total)")}</SelectItem>
                {structures.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name} ({x.components.map((c) => c.label).join(" + ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{tr("How the marks of this subject are collected, for example PT, NBS, SEA and Half Yearly. Define structures under Examinations, Assessment.")}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tr("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? tr("Save changes") : tr("Create subject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
