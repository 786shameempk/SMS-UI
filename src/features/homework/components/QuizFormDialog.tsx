import { useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Subject } from "@/features/academics/types";
import type { StaffMember } from "@/features/staff/types";
import { MAX_QUIZ_QUESTIONS, MIN_QUIZ_QUESTIONS, QUIZ_OPTION_COUNT } from "../constants";
import type { QuizFormValues } from "../types";

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1, "Option can't be empty")).length(QUIZ_OPTION_COUNT),
  correctIndex: z.number().min(0).max(QUIZ_OPTION_COUNT - 1),
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
          <DialogTitle>New quiz</DialogTitle>
          <DialogDescription>Add a few multiple-choice questions. Students are auto-scored on submission.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(({ createdByStaffId, ...values }) => onSubmit(values, createdByStaffId))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-classId">Class</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="quiz-classId">
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
              <Label htmlFor="quiz-subjectId">Subject</Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="quiz-subjectId">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-title">Quiz title</Label>
              <Input id="quiz-title" {...register("title")} />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-createdByStaffId">Created by</Label>
              <Controller
                control={control}
                name="createdByStaffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="quiz-createdByStaffId">
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

          <div className="space-y-3">
            {fields.map((field, qIndex) => (
              <div key={field.id} className="rounded-lg border border-border p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Label htmlFor={`quiz-q-${qIndex}`}>Question {qIndex + 1}</Label>
                  {fields.length > MIN_QUIZ_QUESTIONS && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(qIndex)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <Input id={`quiz-q-${qIndex}`} placeholder="Question text" {...register(`questions.${qIndex}.text`)} />
                {errors.questions?.[qIndex]?.text && <p className="text-xs text-red-600">{errors.questions[qIndex]?.text?.message}</p>}

                <div className="space-y-1.5">
                  {Array.from({ length: QUIZ_OPTION_COUNT }).map((_, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        className="h-3.5 w-3.5 cursor-pointer accent-brand-600"
                        value={oIndex}
                        {...register(`questions.${qIndex}.correctIndex`, { valueAsNumber: true })}
                      />
                      <Input placeholder={`Option ${oIndex + 1}`} {...register(`questions.${qIndex}.options.${oIndex}`)} />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Select the radio button next to the correct option.</p>
                </div>
              </div>
            ))}
            {typeof errors.questions?.message === "string" && <p className="text-xs text-red-600">{errors.questions.message}</p>}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_QUIZ_QUESTIONS}
            onClick={() => append({ ...emptyQuestion, options: [...emptyQuestion.options] })}
          >
            <Plus className="w-3.5 h-3.5" />
            Add question
          </Button>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create quiz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
