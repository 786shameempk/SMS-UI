import { useEffect, useMemo } from "react";
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
import type { StaffMember } from "@/features/staff/types";
import { RESOURCE_TYPES } from "../constants";
import type { LearningResource, LearningResourceFormValues, ResourceType } from "../types";

const FORM_RESOURCE_TYPES = RESOURCE_TYPES.filter((t) => t.value !== "quiz");

const resourceSchema = z.object({
  subjectId: z.string().min(1, "Select a subject"),
  classId: z.string().min(1, "Select a class"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["video", "notes", "pdf", "ppt", "discussion"] as [ResourceType, ...ResourceType[]]),
  url: z.string().optional(),
  description: z.string().optional(),
  createdByStaffId: z.string().min(1, "Select a teacher"),
});

type FormValues = z.infer<typeof resourceSchema>;

const emptyValues: FormValues = {
  subjectId: "",
  classId: "",
  title: "",
  type: "video",
  url: "",
  description: "",
  createdByStaffId: "",
};

export default function LearningResourceFormDialog({
  open,
  onOpenChange,
  resource,
  classes,
  subjects,
  teachers,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: LearningResource | null;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: StaffMember[];
  submitting: boolean;
  onSubmit: (values: LearningResourceFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(resource);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(resourceSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      resource
        ? {
            subjectId: resource.subjectId,
            classId: resource.classId,
            title: resource.title,
            type: resource.type === "quiz" ? "notes" : resource.type,
            url: resource.url ?? "",
            description: resource.description ?? "",
            createdByStaffId: resource.createdByStaffId,
          }
        : emptyValues,
    );
  }, [open, resource, reset]);

  const classId = watch("classId");
  const type = watch("type");
  const availableSubjects = useMemo(() => (classId ? subjects.filter((s) => s.classIds.includes(classId)) : subjects), [subjects, classId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit resource" : "New learning resource"}</DialogTitle>
          <DialogDescription>Share a video, notes, PDF, slide deck, or discussion topic with a class.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, url: values.url?.trim() || undefined, description: values.description?.trim() || undefined }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-classId">Class</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="res-classId">
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
              <Label htmlFor="res-subjectId">Subject</Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="res-subjectId">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((s) => (
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
            <Label htmlFor="res-title">Title</Label>
            <Input id="res-title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-type">Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="res-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_RESOURCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-createdByStaffId">Shared by</Label>
              <Controller
                control={control}
                name="createdByStaffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="res-createdByStaffId">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.createdByStaffId && <p className="text-xs text-red-600">{errors.createdByStaffId.message}</p>}
            </div>
          </div>

          {type !== "discussion" && (
            <div className="space-y-1.5">
              <Label htmlFor="res-url">Link (video / drive / document URL)</Label>
              <Input id="res-url" placeholder="https://…" {...register("url")} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="res-description">Description (optional)</Label>
            <Textarea id="res-description" rows={2} {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Share resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
