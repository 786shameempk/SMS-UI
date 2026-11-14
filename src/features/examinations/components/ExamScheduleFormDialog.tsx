import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subject } from "@/features/academics/types";
import type { AssessmentComponentInput, ExamSchedule, ExamScheduleFormValues } from "../types";
import { listAssessmentStructures, resolveAssessmentStructure } from "../api";
import { componentsTotal, validateComponents } from "../assessmentPresets";
import ComponentEditor from "./ComponentEditor";

import { useTranslation } from "react-i18next";
const scheduleFormSchema = z
  .object({
    subjectId: z.string().min(1, "Select a subject"),
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    maxMarks: z.coerce.number().int().min(1, "Must be at least 1"),
    internalMaxMarks: z.string().optional(),
    passMarks: z.coerce.number().int().min(0, "Cannot be negative"),
    room: z.string().optional(),
  })
  .refine(
    (v) => {
      const internal = v.internalMaxMarks?.trim();
      if (!internal) return true;
      const n = Number(internal);
      return Number.isInteger(n) && n >= 1 && n < v.maxMarks;
    },
    { message: "Must be a whole number from 1 up to one less than the max marks", path: ["internalMaxMarks"] },
  )
  .refine((v) => v.endTime > v.startTime, { message: "End time must be after start time", path: ["endTime"] })
  .refine((v) => v.passMarks <= v.maxMarks, { message: "Pass marks cannot exceed max marks", path: ["passMarks"] });

// The optional internal (CE) max is typed as text so "empty" means "no internal component".
type ScheduleForm = Omit<ExamScheduleFormValues, "internalMaxMarks"> & { internalMaxMarks?: string };

const emptyValues: ScheduleForm = { subjectId: "", date: "", startTime: "", endTime: "", maxMarks: 100, internalMaxMarks: "", passMarks: 35, room: "" };

export default function ExamScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  subjects,
  classId,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ExamSchedule | null;
  subjects: Subject[];
  /** The exam class, used to find the assessment structure assigned to the subject. */
  classId?: string;
  onSubmit: (values: ExamScheduleFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("examinations");
  const isEdit = Boolean(schedule);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ScheduleForm>({ resolver: zodResolver(scheduleFormSchema), defaultValues: emptyValues });

  const { data: structures = [] } = useQuery({ queryKey: ["examinations", "assessment-structures"], queryFn: () => listAssessmentStructures(), enabled: open });
  const [components, setComponents] = useState<AssessmentComponentInput[]>([]);
  const [structureId, setStructureId] = useState<string | undefined>();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      reset(
        schedule
          ? {
              subjectId: schedule.subjectId,
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              maxMarks: schedule.maxMarks,
              internalMaxMarks: schedule.internalMaxMarks ? String(schedule.internalMaxMarks) : "",
              passMarks: schedule.passMarks,
              room: schedule.room ?? "",
            }
          : emptyValues,
      );
      setComponents(schedule?.components?.map((c) => ({ ...c })) ?? []);
      setStructureId(schedule?.structureId);
      setNote(null);
    }
  }, [open, schedule, reset]);

  // A new schedule starts from the structure assigned to this class and subject, if the school set one up.
  const subjectId = watch("subjectId");
  useEffect(() => {
    if (!open || schedule || !subjectId) return;
    let cancelled = false;
    resolveAssessmentStructure({ classId, subjectId })
      .then((found) => {
        if (cancelled) return;
        if (found) {
          setComponents(found.components.map((c) => ({ ...c })));
          setStructureId(found.id);
          setNote(found.name);
        } else {
          setNote(null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, schedule, subjectId, classId]);

  const hasComponents = components.length > 0;
  const componentTotal = componentsTotal(components);
  const componentProblem = hasComponents ? validateComponents(components) : null;
  useEffect(() => {
    if (hasComponents) setValue("maxMarks", componentTotal);
  }, [hasComponents, componentTotal, setValue]);

  const maxMarks = Number(watch("maxMarks")) || 0;
  const internalMax = Number(watch("internalMaxMarks")) || 0;
  const hasInternal = internalMax > 0 && internalMax < maxMarks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit subject schedule") : t("New subject schedule")}</DialogTitle>
          <DialogDescription>{t("Schedule one subject paper within this exam, with its date, time, and marks.")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) => {
            if (componentProblem) return;
            return onSubmit({
              ...v,
              internalMaxMarks: hasComponents ? null : v.internalMaxMarks?.trim() ? Number(v.internalMaxMarks) : null,
              components: hasComponents ? components : [],
              structureId: hasComponents ? (structureId ?? null) : null,
            });
          })}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="subjectId">{t("Subject")}</Label>
            <Controller
              control={control}
              name="subjectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="subjectId">
                    <SelectValue placeholder={t("Select a subject")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subjectId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.subjectId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">{t("Date")}</Label>
              <Input id="date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              {errors.date && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">{t("Start time")}</Label>
              <Input id="startTime" type="time" aria-invalid={errors.startTime ? true : undefined} {...register("startTime")} />
              {errors.startTime && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">{t("End time")}</Label>
              <Input id="endTime" type="time" aria-invalid={errors.endTime ? true : undefined} {...register("endTime")} />
              {errors.endTime && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.endTime.message}</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{t("Assessment components")}</p>
                <p className="text-xs text-muted-foreground">
                  {hasComponents
                    ? note
                      ? t("Using the structure \"{{name}}\" assigned to this subject. You can still change it for this exam.", { name: note })
                      : t("Marks are entered per component and added up for you.")
                    : t("Optional. Split this subject's marks into labelled parts such as PT, NBS, SEA and Half Yearly.")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={structureId}
                  onValueChange={(id) => {
                    const found = structures.find((x) => x.id === id);
                    if (!found) return;
                    setComponents(found.components.map((c) => ({ ...c })));
                    setStructureId(id);
                    setNote(found.name);
                  }}
                >
                  <SelectTrigger className="w-56" aria-label={t("Copy from a structure")}>
                    <SelectValue placeholder={t("Copy from a structure")} />
                  </SelectTrigger>
                  <SelectContent>
                    {structures.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasComponents ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setComponents([]); setStructureId(undefined); setNote(null); }}>
                    {t("No split")}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setComponents([{ label: "", max: Number(maxMarks) || 100, optional: false, counts: true, showOnCard: true }])}>
                    {t("Add components")}
                  </Button>
                )}
              </div>
            </div>
            {hasComponents && (
              <ComponentEditor
                value={components}
                showPresets={false}
                onChange={(next) => {
                  setComponents(next);
                  setStructureId(undefined); // edited: no longer an exact copy of the structure
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maxMarks">{t("Max marks (total)")}</Label>
              <Input id="maxMarks" type="number" min={1} readOnly={hasComponents} aria-invalid={errors.maxMarks ? true : undefined} {...register("maxMarks")} />
              {errors.maxMarks && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.maxMarks.message}</p>}
            </div>
            {!hasComponents && (
              <div className="space-y-1.5">
                <Label htmlFor="internalMaxMarks" optional>{t("Internal (CE) max marks")}</Label>
                <Input id="internalMaxMarks" type="number" min={1} placeholder={t("None")} aria-invalid={errors.internalMaxMarks ? true : undefined} {...register("internalMaxMarks")} />
                {errors.internalMaxMarks ? (
                  <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.internalMaxMarks.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {hasInternal
                      ? t("Internal {{internalMax}} + actual {{v1}} = {{maxMarks}}. Marks are entered separately.", { internalMax, v1: maxMarks - internalMax, maxMarks })
                      : t("Leave empty if there is no internal / CE component.")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="passMarks">{t("Pass marks")}</Label>
              <Input id="passMarks" type="number" min={0} aria-invalid={errors.passMarks ? true : undefined} {...register("passMarks")} />
              {errors.passMarks && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.passMarks.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room" optional>{t("Room")}</Label>
              <Input id="room" placeholder={t("e.g. Room 101")} {...register("room")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting} disabled={Boolean(componentProblem)}>
              {isEdit ? t("Save changes") : t("Add subject schedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
