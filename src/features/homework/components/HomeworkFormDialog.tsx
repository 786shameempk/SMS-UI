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
import type { SchoolClass, Section, Subject } from "@/features/academics/types";
import type { StaffMember } from "@/features/staff/types";
import { HOMEWORK_STATUSES } from "../constants";
import type { Homework, HomeworkFormValues, HomeworkStatus } from "../types";

const NONE_SECTION = "__none__";

const homeworkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  subjectId: z.string().min(1, "Select a subject"),
  classId: z.string().min(1, "Select a class"),
  sectionId: z.string().optional(),
  staffId: z.string().min(1, "Select a teacher"),
  assignedDate: z.string().min(1, "Assigned date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  attachmentNote: z.string().optional(),
  status: z.enum(["draft", "published"] as [HomeworkStatus, ...HomeworkStatus[]]),
});

type FormValues = z.infer<typeof homeworkSchema>;

const emptyValues: FormValues = {
  title: "",
  description: "",
  subjectId: "",
  classId: "",
  sectionId: NONE_SECTION,
  staffId: "",
  assignedDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  attachmentNote: "",
  status: "draft",
};

export default function HomeworkFormDialog({
  open,
  onOpenChange,
  homework,
  classes,
  subjects,
  sections,
  teachers,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework?: Homework | null;
  classes: SchoolClass[];
  subjects: Subject[];
  sections: Section[];
  teachers: StaffMember[];
  submitting: boolean;
  onSubmit: (values: HomeworkFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(homework);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(homeworkSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      homework
        ? {
            title: homework.title,
            description: homework.description,
            subjectId: homework.subjectId,
            classId: homework.classId,
            sectionId: homework.sectionId ?? NONE_SECTION,
            staffId: homework.staffId,
            assignedDate: homework.assignedDate.slice(0, 10),
            dueDate: homework.dueDate.slice(0, 10),
            attachmentNote: homework.attachmentNote ?? "",
            status: homework.status,
          }
        : emptyValues,
    );
  }, [open, homework, reset]);

  const classId = watch("classId");
  const availableSubjects = useMemo(() => (classId ? subjects.filter((s) => s.classIds.includes(classId)) : subjects), [subjects, classId]);
  const availableSections = useMemo(() => sections.filter((s) => s.classId === classId), [sections, classId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit homework" : "New homework"}</DialogTitle>
          <DialogDescription>Assign homework to a class (and optionally a single section) for a subject.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              sectionId: values.sectionId && values.sectionId !== NONE_SECTION ? values.sectionId : undefined,
              attachmentNote: values.attachmentNote?.trim() || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="hw-title">Title</Label>
            <Input id="hw-title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hw-description">Description</Label>
            <Textarea id="hw-description" rows={3} {...register("description")} />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hw-classId">Class</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hw-classId">
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
              <Label htmlFor="hw-sectionId">Section (optional)</Label>
              <Controller
                control={control}
                name="sectionId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!classId}>
                    <SelectTrigger id="hw-sectionId">
                      <SelectValue placeholder="Whole class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SECTION}>Whole class</SelectItem>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hw-subjectId">Subject</Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hw-subjectId">
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
            <div className="space-y-1.5">
              <Label htmlFor="hw-staffId">Assigned by</Label>
              <Controller
                control={control}
                name="staffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hw-staffId">
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
              {errors.staffId && <p className="text-xs text-red-600">{errors.staffId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hw-assignedDate">Assigned date</Label>
              <Input id="hw-assignedDate" type="date" {...register("assignedDate")} />
              {errors.assignedDate && <p className="text-xs text-red-600">{errors.assignedDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-dueDate">Due date</Label>
              <Input id="hw-dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-red-600">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hw-attachmentNote">Attachment note (optional)</Label>
              <Input id="hw-attachmentNote" placeholder="e.g. Worksheet: chapter-3.pdf" {...register("attachmentNote")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hw-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOMEWORK_STATUSES.map((s) => (
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create homework"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
