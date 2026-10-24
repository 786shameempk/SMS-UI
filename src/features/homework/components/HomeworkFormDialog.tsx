import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Section, Subject } from "@/features/academics/types";
import type { StaffMember } from "@/features/staff/types";
import { HOMEWORK_STATUSES } from "../constants";
import AttachmentField from "@/features/attachments/AttachmentField";
import { attachmentChange, toAttachmentRef, type AttachmentRef } from "@/features/attachments/api";
import type { Homework, HomeworkFormValues, HomeworkStatus } from "../types";

import { useTranslation } from "react-i18next";
const NONE_SECTION = "__none__";

const homeworkSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title can be at most 200 characters"),
  description: z.string().min(1, "Description is required").max(2000, "Description can be at most 2000 characters"),
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
  initialValues,
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
  /** Prefills a new homework (e.g. from an AI draft); ignored when editing. */
  initialValues?: Partial<HomeworkFormValues>;
  classes: SchoolClass[];
  subjects: Subject[];
  sections: Section[];
  teachers: StaffMember[];
  submitting: boolean;
  onSubmit: (values: HomeworkFormValues) => Promise<void>;
}) {
  const { t: tr } = useTranslation("homework");
  const isEdit = Boolean(homework);
  // The uploaded file is held beside the form fields: it is uploaded when chosen, and only its id is saved with the homework.
  const [attachment, setAttachment] = useState<AttachmentRef | null>(null);
  const originalAttachment = toAttachmentRef(homework?.attachmentId, homework?.attachmentFileName);
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
        : { ...emptyValues, ...initialValues, sectionId: initialValues?.sectionId ?? NONE_SECTION },
    );
    setAttachment(toAttachmentRef(homework?.attachmentId, homework?.attachmentFileName));
  }, [open, homework, initialValues, reset]);

  const classId = watch("classId");
  const availableSubjects = useMemo(() => (classId ? subjects.filter((s) => s.classIds.includes(classId)) : subjects), [subjects, classId]);
  const availableSections = useMemo(() => sections.filter((s) => s.classId === classId), [sections, classId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? tr("Edit homework") : tr("New homework")}</DialogTitle>
          <DialogDescription>{tr("Assign homework to a class (and optionally a single section) for a subject.")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              sectionId: values.sectionId && values.sectionId !== NONE_SECTION ? values.sectionId : undefined,
              attachmentNote: values.attachmentNote?.trim() || undefined,
              ...attachmentChange(originalAttachment, attachment),
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="hw-title" required>{tr("Title")}</Label>
            <Input id="hw-title" aria-invalid={errors.title ? true : undefined} {...register("title")} />
            {errors.title && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hw-description" required>{tr("Description")}</Label>
            <Textarea id="hw-description" rows={3} aria-invalid={errors.description ? true : undefined} {...register("description")} />
            {errors.description && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hw-classId" required>{tr("Class")}</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hw-classId">
                      <SelectValue placeholder={tr("Select a class")} />
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
              {errors.classId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.classId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-sectionId" optional>{tr("Section")}</Label>
              <Controller
                control={control}
                name="sectionId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!classId}>
                    <SelectTrigger id="hw-sectionId">
                      <SelectValue placeholder={tr("Whole class")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SECTION}>{tr("Whole class")}</SelectItem>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hw-subjectId" required>{tr("Subject")}</Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hw-subjectId">
                      <SelectValue placeholder={tr("Select a subject")} />
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
              {errors.subjectId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.subjectId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-staffId" required>{tr("Assigned by")}</Label>
              <Controller
                control={control}
                name="staffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hw-staffId">
                      <SelectValue placeholder={tr("Select a teacher")} />
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
              {errors.staffId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.staffId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hw-assignedDate" required>{tr("Assigned date")}</Label>
              <Input id="hw-assignedDate" type="date" aria-invalid={errors.assignedDate ? true : undefined} {...register("assignedDate")} />
              {errors.assignedDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.assignedDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-dueDate" required>{tr("Due date")}</Label>
              <Input id="hw-dueDate" type="date" aria-invalid={errors.dueDate ? true : undefined} {...register("dueDate")} />
              {errors.dueDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AttachmentField label={tr("Attachment")} value={attachment} onChange={setAttachment} />
            <div className="space-y-1.5">
              <Label htmlFor="hw-status" required>{tr("Status")}</Label>
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
                          {tr(s.label)}
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
              {tr("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? tr("Save changes") : tr("Create homework")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
