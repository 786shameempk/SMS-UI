import { useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Subject } from "@/features/academics/types";
import type { StaffMember } from "@/features/staff/types";
import { MAX_QUIZ_QUESTIONS, MIN_QUIZ_QUESTIONS, QUIZ_OPTION_COUNT } from "../constants";
import type { QuizFormValues } from "../types";

import { useTranslation } from "react-i18next";
const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1, "Option can't be empty")).length(QUIZ_OPTION_COUNT),
  correctIndex: z.coerce.number().min(0).max(QUIZ_OPTION_COUNT - 1),
});

const quizSchema = z.object({
  subjectId: z.string().min(1, "Select a subject"),
  classId: z.string().min(1, "Select a class"),
  title: z.string().min(1, "Title is required"),
  createdByStaffId: z.string().min(1, "Select a teacher"),
  questions: z.array(questionSchema).min(MIN_QUIZ_QUESTIONS, "Add at least one question"),
});

type FormValues = z.infer<typeof quizSchema>;

const emptyQuestion = { text: "", options: ["", "", "", ""], correctIndex: 0 };
const emptyValues: FormValues = {
  subjectId: "",
  classId: "",
  title: "",
  createdByStaffId: "",
  questions: [{ ...emptyQuestion, options: [...emptyQuestion.options] }],
};

export default function QuizFormDialog({
  open,
  onOpenChange,
  classes,
  subjects,
  teachers,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: StaffMember[];
  submitting: boolean;
  onSubmit: (values: QuizFormValues, createdByStaffId: string) => Promise<void>;
}) {
  const { t: tr } = useTranslation("homework");
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(quizSchema), defaultValues: emptyValues });

  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const classId = watch("classId");
  const availableSubjects = useMemo(() => (classId ? subjects.filter((s) => s.classIds.includes(classId)) : subjects), [subjects, classId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tr("New quiz")}</DialogTitle>
          <DialogDescription>{tr("Add a few multiple-choice questions. Students are auto-scored on submission.")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(({ createdByStaffId, ...values }) => onSubmit(values, createdByStaffId))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-classId" required>{tr("Class")}</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="quiz-classId">
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
              <Label htmlFor="quiz-subjectId" required>{tr("Subject")}</Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="quiz-subjectId">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-title" required>{tr("Quiz title")}</Label>
              <Input id="quiz-title" aria-invalid={errors.title ? true : undefined} {...register("title")} />
              {errors.title && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-createdByStaffId" required>{tr("Created by")}</Label>
              <Controller
                control={control}
                name="createdByStaffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="quiz-createdByStaffId">
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
              {errors.createdByStaffId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.createdByStaffId.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            {fields.map((field, qIndex) => (
              <div key={field.id} className="rounded-lg border border-border p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Label htmlFor={`quiz-q-${qIndex}`}>{tr("Question {{v1}}", { v1: qIndex + 1 })}</Label>
                  {fields.length > MIN_QUIZ_QUESTIONS && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(qIndex)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <Input id={`quiz-q-${qIndex}`} placeholder={tr("Question text")} {...register(`questions.${qIndex}.text`)} />
                {errors.questions?.[qIndex]?.text && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.questions[qIndex]?.text?.message}</p>}

                <div className="space-y-1.5">
                  {Array.from({ length: QUIZ_OPTION_COUNT }).map((_, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        className="h-3.5 w-3.5 cursor-pointer accent-brand-600"
                        value={oIndex}
                        {...register(`questions.${qIndex}.correctIndex`, { valueAsNumber: true })}
                      />
                      <Input placeholder={tr("Option {{v1}}", { v1: oIndex + 1 })} {...register(`questions.${qIndex}.options.${oIndex}`)} />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">{tr("Select the radio button next to the correct option.")}</p>
                </div>
              </div>
            ))}
            {typeof errors.questions?.message === "string" && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.questions.message}</p>}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_QUIZ_QUESTIONS}
            onClick={() => append({ ...emptyQuestion, options: [...emptyQuestion.options] })}
          >
            <Plus className="w-3.5 h-3.5" />
            {tr("Add question")}
          </Button>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tr("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {tr("Create quiz")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
