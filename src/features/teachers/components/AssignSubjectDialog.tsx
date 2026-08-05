import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Subject } from "@/features/academics/types";

const assignSubjectSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  subjectId: z.string().min(1, "Select a subject"),
});

type AssignSubjectFormValues = z.infer<typeof assignSubjectSchema>;

const emptyValues: AssignSubjectFormValues = { classId: "", subjectId: "" };

export default function AssignSubjectDialog({
  open,
  onOpenChange,
  classes,
  subjects,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  subjects: Subject[];
  onSubmit: (values: AssignSubjectFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const {
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<AssignSubjectFormValues>({ resolver: zodResolver(assignSubjectSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const classId = watch("classId");
  const availableSubjects = useMemo(
    () => (classId ? subjects.filter((s) => s.classIds.includes(classId)) : subjects),
    [subjects, classId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign subject</DialogTitle>
          <DialogDescription>Link a subject and class to this teacher.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-classId">Class</Label>
            <Controller
              control={control}
              name="classId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="assign-classId">
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
            <Label htmlFor="assign-subjectId">Subject</Label>
            <Controller
              control={control}
              name="subjectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="assign-subjectId">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subjectId && <p className="text-xs text-red-600">{errors.subjectId.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
