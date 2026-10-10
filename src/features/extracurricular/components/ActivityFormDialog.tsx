import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_STATUS_LABEL, KIND_LABEL, SETTING_LABEL } from "../constants";
import { SelectField, options } from "../shared";
import type { Activity, ActivityInput, Category } from "../types";

const optionalInt = z.string().refine((v) => v.trim() === "" || /^\d+$/.test(v.trim()), "Enter a whole number");

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    code: z.string().trim().min(1, "Code is required").max(40),
    categoryId: z.string().min(1, "Choose a category"),
    description: z.string().max(4000),
    academicYear: z.string().min(1, "Academic year is required"),
    kind: z.enum(["Individual", "Team"]),
    setting: z.enum(["Indoor", "Outdoor", "Both"]),
    status: z.enum(["Draft", "Active", "Inactive", "Completed"]),
    eligibility: z.string().max(300),
    minGrade: optionalInt,
    maxGrade: optionalInt,
    coordinatorName: z.string().max(200),
    capacity: optionalInt,
    minParticipants: optionalInt,
    location: z.string().max(200),
    scheduleNote: z.string().max(500),
    equipment: z.string().max(1000),
    safetyNotes: z.string().max(2000),
    enrollmentStart: z.string(),
    enrollmentEnd: z.string(),
    requiresApproval: z.boolean(),
    requiresConsent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const cap = v.capacity.trim() === "" ? null : Number(v.capacity);
    const min = v.minParticipants.trim() === "" ? 0 : Number(v.minParticipants);
    if (cap !== null && cap < 1) ctx.addIssue({ code: "custom", path: ["capacity"], message: "Capacity must be at least 1 (or leave it empty for no limit)" });
    if (cap !== null && min > cap) ctx.addIssue({ code: "custom", path: ["minParticipants"], message: "Cannot be more than the capacity" });
    if (v.minGrade.trim() && v.maxGrade.trim() && Number(v.maxGrade) < Number(v.minGrade)) ctx.addIssue({ code: "custom", path: ["maxGrade"], message: "Cannot be below the lowest grade" });
    if (v.enrollmentStart && v.enrollmentEnd && v.enrollmentEnd < v.enrollmentStart) ctx.addIssue({ code: "custom", path: ["enrollmentEnd"], message: "Enrollment cannot end before it starts" });
  });

type FormValues = z.infer<typeof schema>;

const blank = (academicYear: string, categoryId = ""): FormValues => ({
  name: "", code: "", categoryId, description: "", academicYear, kind: "Individual", setting: "Both", status: "Draft", eligibility: "", minGrade: "", maxGrade: "",
  coordinatorName: "", capacity: "", minParticipants: "", location: "", scheduleNote: "", equipment: "", safetyNotes: "", enrollmentStart: "", enrollmentEnd: "",
  requiresApproval: true, requiresConsent: false,
});

const fromActivity = (a: Activity): FormValues => ({
  name: a.name, code: a.code, categoryId: a.categoryId, description: a.description ?? "", academicYear: a.academicYear, kind: a.kind, setting: a.setting, status: a.status,
  eligibility: a.eligibility ?? "", minGrade: a.minGrade?.toString() ?? "", maxGrade: a.maxGrade?.toString() ?? "", coordinatorName: a.coordinatorName ?? "",
  capacity: a.capacity?.toString() ?? "", minParticipants: a.minParticipants ? String(a.minParticipants) : "", location: a.location ?? "", scheduleNote: a.scheduleNote ?? "",
  equipment: a.equipment ?? "", safetyNotes: a.safetyNotes ?? "", enrollmentStart: a.enrollmentStart ?? "", enrollmentEnd: a.enrollmentEnd ?? "",
  requiresApproval: a.requiresApproval, requiresConsent: a.requiresConsent,
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const text = (v: string) => (v.trim() === "" ? null : v.trim());

export function toActivityInput(v: FormValues, keep?: Activity): ActivityInput {
  return {
    name: v.name.trim(), code: v.code.trim(), categoryId: v.categoryId, description: text(v.description), imageUrl: keep?.imageUrl ?? null, academicYear: v.academicYear,
    kind: v.kind, setting: v.setting, status: v.status, eligibility: text(v.eligibility), minGrade: num(v.minGrade), maxGrade: num(v.maxGrade),
    coordinatorStaffId: keep?.coordinatorStaffId ?? null, coordinatorName: text(v.coordinatorName), capacity: num(v.capacity), minParticipants: num(v.minParticipants) ?? 0,
    location: text(v.location), scheduleNote: text(v.scheduleNote), equipment: text(v.equipment), safetyNotes: text(v.safetyNotes),
    enrollmentStart: text(v.enrollmentStart), enrollmentEnd: text(v.enrollmentEnd), requiresApproval: v.requiresApproval, requiresConsent: v.requiresConsent,
  };
}

export default function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  categories,
  years,
  currentYear,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  categories: Category[];
  years: string[];
  currentYear: string;
  submitting: boolean;
  onSubmit: (input: ActivityInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank(currentYear) });

  useEffect(() => {
    if (open) reset(activity ? fromActivity(activity) : blank(currentYear, categories.find((c) => c.isActive)?.id));
  }, [open, activity, currentYear, categories, reset]);

  const err = (name: keyof FormValues) => errors[name]?.message as string | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{activity ? "Edit activity" : "New activity"}</DialogTitle>
          <DialogDescription>Football, chess, choir, school gardening — anything the school runs outside lessons.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => onSubmit(toActivityInput(v, activity ?? undefined)))} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="act-name" required error={err("name")}>
              <Input id="act-name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            </FormField>
            <FormField label="Code" htmlFor="act-code" required error={err("code")} hint="Short and unique this year, e.g. FB-U14">
              <Input id="act-code" aria-invalid={errors.code ? true : undefined} {...register("code")} />
            </FormField>
            <FormField label="Category" htmlFor="act-category" required error={err("categoryId")}>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <SelectField
                    id="act-category"
                    value={field.value || undefined}
                    onChange={(v) => field.onChange(v ?? "")}
                    items={categories.filter((c) => c.isActive || c.id === field.value).map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Choose a category"
                    invalid={Boolean(errors.categoryId)}
                  />
                )}
              />
            </FormField>
            <FormField label="Academic year" htmlFor="act-year" required error={err("academicYear")}>
              <Controller control={control} name="academicYear" render={({ field }) => <SelectField id="act-year" value={field.value} onChange={(v) => field.onChange(v ?? "")} items={years.map((y) => ({ value: y, label: y }))} />} />
            </FormField>
            <FormField label="Participation" htmlFor="act-kind">
              <Controller control={control} name="kind" render={({ field }) => <SelectField id="act-kind" value={field.value} onChange={(v) => v && field.onChange(v)} items={options(KIND_LABEL)} />} />
            </FormField>
            <FormField label="Where" htmlFor="act-setting">
              <Controller control={control} name="setting" render={({ field }) => <SelectField id="act-setting" value={field.value} onChange={(v) => v && field.onChange(v)} items={options(SETTING_LABEL)} />} />
            </FormField>
            <FormField label="Status" htmlFor="act-status" hint="Only active activities can be joined.">
              <Controller control={control} name="status" render={({ field }) => <SelectField id="act-status" value={field.value} onChange={(v) => v && field.onChange(v)} items={options(ACTIVITY_STATUS_LABEL)} />} />
            </FormField>
            <FormField label="Coordinator" htmlFor="act-coordinator" optional>
              <Input id="act-coordinator" {...register("coordinatorName")} />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="act-description" optional error={err("description")}>
            <Textarea id="act-description" rows={3} {...register("description")} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Capacity" htmlFor="act-capacity" optional error={err("capacity")} hint="Empty = no limit">
              <Input id="act-capacity" inputMode="numeric" aria-invalid={errors.capacity ? true : undefined} {...register("capacity")} />
            </FormField>
            <FormField label="Minimum to run" htmlFor="act-min" optional error={err("minParticipants")}>
              <Input id="act-min" inputMode="numeric" aria-invalid={errors.minParticipants ? true : undefined} {...register("minParticipants")} />
            </FormField>
            <FormField label="Lowest grade" htmlFor="act-mingrade" optional error={err("minGrade")}>
              <Input id="act-mingrade" inputMode="numeric" aria-invalid={errors.minGrade ? true : undefined} {...register("minGrade")} />
            </FormField>
            <FormField label="Highest grade" htmlFor="act-maxgrade" optional error={err("maxGrade")}>
              <Input id="act-maxgrade" inputMode="numeric" aria-invalid={errors.maxGrade ? true : undefined} {...register("maxGrade")} />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Eligibility note" htmlFor="act-eligibility" optional hint="Shown to families, e.g. Under 14, beginners welcome">
              <Input id="act-eligibility" {...register("eligibility")} />
            </FormField>
            <FormField label="Venue" htmlFor="act-location" optional>
              <Input id="act-location" {...register("location")} />
            </FormField>
            <FormField label="Enrollment opens" htmlFor="act-estart" optional>
              <Input id="act-estart" type="date" {...register("enrollmentStart")} />
            </FormField>
            <FormField label="Enrollment closes" htmlFor="act-eend" optional error={err("enrollmentEnd")}>
              <Input id="act-eend" type="date" aria-invalid={errors.enrollmentEnd ? true : undefined} {...register("enrollmentEnd")} />
            </FormField>
            <FormField label="When it meets" htmlFor="act-schedule" optional hint="e.g. Tuesdays and Thursdays after school">
              <Input id="act-schedule" {...register("scheduleNote")} />
            </FormField>
            <FormField label="Equipment needed" htmlFor="act-equipment" optional>
              <Input id="act-equipment" {...register("equipment")} />
            </FormField>
          </div>

          <FormField label="Safety instructions" htmlFor="act-safety" optional>
            <Textarea id="act-safety" rows={2} {...register("safetyNotes")} />
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <span>
                <span className="block font-medium">Needs approval</span>
                <span className="block text-xs text-muted-foreground">Requests wait for a coordinator.</span>
              </span>
              <Controller control={control} name="requiresApproval" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Needs approval" />} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <span>
                <span className="block font-medium">Needs parental consent</span>
                <span className="block text-xs text-muted-foreground">Families must confirm when asking to join.</span>
              </span>
              <Controller control={control} name="requiresConsent" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Needs parental consent" />} />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {activity ? "Save changes" : "Create activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
