import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECT_TYPES } from "../constants";
import type { SchoolClass, Subject, SubjectFormValues } from "../types";

const subjectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  type: z.enum(SUBJECT_TYPES),
  classIds: z.array(z.string()).min(1, "Select at least one class"),
});

const emptyValues: SubjectFormValues = { name: "", code: "", type: "core", classIds: [] };

export default function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  classes,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
  classes: SchoolClass[];
  onSubmit: (values: SubjectFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(subject);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SubjectFormValues>({ resolver: zodResolver(subjectFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(subject ? { name: subject.name, code: subject.code, type: subject.type, classIds: subject.classIds } : emptyValues);
    }
  }, [open, subject, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit subject" : "New subject"}</DialogTitle>
          <DialogDescription>Subjects are core or elective and can be linked to one or more classes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="e.g. Mathematics" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="e.g. MATH" {...register("code")} />
              {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Classes</Label>
            <Controller
              control={control}
              name="classIds"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
                  {classes.map((c) => {
                    const checked = field.value.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            if (value) field.onChange([...field.value, c.id]);
                            else field.onChange(field.value.filter((id) => id !== c.id));
                          }}
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.classIds && <p className="text-xs text-red-600">{errors.classIds.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
