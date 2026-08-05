import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Subject } from "@/features/academics/types";
import { LESSON_PLAN_STATUSES } from "../constants";
import type { LessonPlan, LessonPlanFormValues, LessonPlanStatus } from "../types";

const lessonPlanSchema = z.object({
  subjectId: z.string().min(1, "Select a subject"),
  classId: z.string().min(1, "Select a class"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  weekOf: z.string().min(1, "Week is required"),
  attachmentNote: z.string().optional(),
  status: z.enum(["draft", "published"] as [LessonPlanStatus, ...LessonPlanStatus[]]),
});

type FormValues = z.infer<typeof lessonPlanSchema>;

const emptyValues: FormValues = {
  subjectId: "",
  classId: "",
  title: "",
  description: "",
  weekOf: new Date().toISOString().slice(0, 10),
  attachmentNote: "",
  status: "draft",
};

export default function LessonPlanFormDialog({
  open,
  onOpenChange,
  plan,
  classes,
  subjects,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: LessonPlan | null;
  classes: SchoolClass[];
  subjects: Subject[];
  onSubmit: (values: Omit<LessonPlanFormValues, "staffId">) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(plan);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(lessonPlanSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        plan
          ? {
              subjectId: plan.subjectId,
              classId: plan.classId,
              title: plan.title,
              description: plan.description,
              weekOf: plan.weekOf.slice(0, 10),
              attachmentNote: plan.attachmentNote ?? "",
              status: plan.status,
            }
          : emptyValues,
      );
    }
  }, [open, plan, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lesson plan" : "New lesson plan"}</DialogTitle>
          <DialogDescription>Outline what will be taught for a subject and class in a given week.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, attachmentNote: values.attachmentNote?.trim() || undefined }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lp-classId">Class</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="lp-classId">
                      <SelectValue placeholder="Select a class" />
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
              {errors.classId && <p className="text-xs text-red-600">{errors.classId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-subjectId">Subject</Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="lp-subjectId">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.subjectId && <p className="text-xs text-red-600">{errors.subjectId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lp-title">Title</Label>
            <Input id="lp-title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lp-description">Description</Label>
            <Textarea id="lp-description" rows={3} {...register("description")} />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lp-weekOf">Week of</Label>
              <Input id="lp-weekOf" type="date" {...register("weekOf")} />
              {errors.weekOf && <p className="text-xs text-red-600">{errors.weekOf.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="lp-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LESSON_PLAN_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lp-attachmentNote">Attachment note (optional)</Label>
            <Input id="lp-attachmentNote" placeholder="e.g. Worksheet: chapter-3.pdf" {...register("attachmentNote")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create lesson plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
