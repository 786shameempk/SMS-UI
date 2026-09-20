import { useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStaff } from "@/features/staff/api";
import { AUDIENCE_OPTIONS, MAX_CHOICE_OPTIONS, MAX_QUESTIONS, MIN_CHOICE_OPTIONS, MIN_QUESTIONS, QUESTION_TYPE_OPTIONS, todayDateValue } from "../constants";
import type { QuestionType, SurveyAudience, SurveyFormValues } from "../types";

const questionSchema = z
  .object({
    text: z.string().min(1, "Question text is required"),
    type: z.enum(QUESTION_TYPE_OPTIONS.map((o) => o.value) as [QuestionType, ...QuestionType[]]),
    options: z.array(z.string()),
    required: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "multiple_choice") {
      const filled = (values.options ?? []).filter((o) => o.trim().length > 0);
      if (filled.length < MIN_CHOICE_OPTIONS) ctx.addIssue({ code: "custom", path: ["options"], message: `Add at least ${MIN_CHOICE_OPTIONS} options` });
    }
  });

const surveySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  audience: z.enum(AUDIENCE_OPTIONS.map((o) => o.value) as [SurveyAudience, ...SurveyAudience[]]),
  anonymousAllowed: z.boolean(),
  opensAt: z.string().min(1, "Open date is required"),
  closesAt: z.string().optional(),
  createdByStaffId: z.string().optional(),
  questions: z.array(questionSchema).min(MIN_QUESTIONS, "Add at least one question"),
});

type FormValues = z.infer<typeof surveySchema>;

const emptyQuestion: FormValues["questions"][number] = { text: "", type: "rating", options: ["", ""], required: true };

function emptyValues(): FormValues {
  return {
    title: "",
    description: "",
    audience: "all",
    anonymousAllowed: true,
    opensAt: todayDateValue(),
    closesAt: "",
    createdByStaffId: "",
    questions: [{ ...emptyQuestion, options: [...(emptyQuestion.options ?? [])] }],
  };
}

export default function SurveyFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: SurveyFormValues) => Promise<void>;
}) {
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(surveySchema), defaultValues: emptyValues() });

  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>New survey</DialogTitle>
          <DialogDescription>Build a survey as a draft — publish it separately when you're ready to collect responses.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              description: values.description?.trim() || undefined,
              closesAt: values.closesAt || undefined,
              createdByStaffId: values.createdByStaffId || undefined,
              questions: values.questions.map((q) => ({
                ...q,
                options: q.type === "multiple_choice" ? (q.options ?? []).filter((o) => o.trim().length > 0) : undefined,
              })),
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="survey-title">Title</Label>
            <Input id="survey-title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="survey-description">Description (optional)</Label>
            <Textarea id="survey-description" rows={2} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="survey-audience">Audience</Label>
              <Controller
                control={control}
                name="audience"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="survey-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="survey-createdBy">Created by (optional)</Label>
              <Controller
                control={control}
                name="createdByStaffId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="survey-createdBy">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} · {s.designation}
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
              <Label htmlFor="survey-opensAt">Opens</Label>
              <Input id="survey-opensAt" type="date" {...register("opensAt")} />
              {errors.opensAt && <p className="text-xs text-red-600">{errors.opensAt.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="survey-closesAt">Closes (optional)</Label>
              <Input id="survey-closesAt" type="date" {...register("closesAt")} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Controller
              control={control}
              name="anonymousAllowed"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />}
            />
            <span className="text-sm text-slate-600">Allow anonymous responses</span>
          </label>

          <div className="space-y-3">
            {fields.map((field, qIndex) => {
              const type = watch(`questions.${qIndex}.type`);
              return (
                <div key={field.id} className="rounded-lg border border-border p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Label htmlFor={`survey-q-${qIndex}`}>Question {qIndex + 1}</Label>
                    {fields.length > MIN_QUESTIONS && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(qIndex)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <Input id={`survey-q-${qIndex}`} placeholder="Question text" {...register(`questions.${qIndex}.text`)} />
                  {errors.questions?.[qIndex]?.text && <p className="text-xs text-red-600">{errors.questions[qIndex]?.text?.message}</p>}

                  <div className="grid grid-cols-2 gap-3">
                    <Controller
                      control={control}
                      name={`questions.${qIndex}.type`}
                      render={({ field: typeField }) => (
                        <Select value={typeField.value} onValueChange={typeField.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Controller
                        control={control}
                        name={`questions.${qIndex}.required`}
                        render={({ field: reqField }) => <Checkbox checked={reqField.value} onCheckedChange={(v) => reqField.onChange(v === true)} />}
                      />
                      <span className="text-sm text-slate-600">Required</span>
                    </label>
                  </div>

                  {type === "multiple_choice" && (
                    <QuestionOptions
                      options={watch(`questions.${qIndex}.options`) ?? []}
                      errorMessage={errors.questions?.[qIndex]?.options?.message as string | undefined}
                      onChange={(options) => setValue(`questions.${qIndex}.options`, options)}
                      onAdd={() => setValue(`questions.${qIndex}.options`, [...(getValues(`questions.${qIndex}.options`) ?? []), ""])}
                      onRemove={(oIndex) =>
                        setValue(
                          `questions.${qIndex}.options`,
                          (getValues(`questions.${qIndex}.options`) ?? []).filter((_, i) => i !== oIndex),
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
            {typeof errors.questions?.message === "string" && <p className="text-xs text-red-600">{errors.questions.message}</p>}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_QUESTIONS}
            onClick={() => append({ ...emptyQuestion, options: [...(emptyQuestion.options ?? [])] })}
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
              Save as draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A useFieldArray nested inside another useFieldArray's row hits a known react-hook-form +
 * TypeScript inference limitation (the dynamic `questions.${n}.options` path type doesn't
 * resolve), so this manages the per-question options list as a plain array via watch/setValue
 * instead — simpler, and avoids fighting the type checker for no real benefit here.
 */
function QuestionOptions({
  options,
  errorMessage,
  onChange,
  onAdd,
  onRemove,
}: {
  options: string[];
  errorMessage?: string;
  onChange: (options: string[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((option, oIndex) => (
        <div key={oIndex} className="flex items-center gap-2">
          <Input
            placeholder={`Option ${oIndex + 1}`}
            value={option}
            onChange={(e) => onChange(options.map((o, i) => (i === oIndex ? e.target.value : o)))}
          />
          {options.length > MIN_CHOICE_OPTIONS && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onRemove(oIndex)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      <Button type="button" variant="ghost" size="sm" disabled={options.length >= MAX_CHOICE_OPTIONS} onClick={onAdd}>
        <Plus className="w-3 h-3" />
        Add option
      </Button>
    </div>
  );
}
