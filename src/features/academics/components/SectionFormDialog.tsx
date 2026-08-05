import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolClass, Section, SectionFormValues } from "../types";

const sectionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  classId: z.string().min(1, "Select a class"),
  classTeacherName: z.string().optional(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  currentStrength: z.coerce.number().int().min(0, "Cannot be negative"),
});

const emptyValues: SectionFormValues = { name: "", classId: "", classTeacherName: "", capacity: 40, currentStrength: 0 };

export default function SectionFormDialog({
  open,
  onOpenChange,
  section,
  classes,
  defaultClassId,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: Section | null;
  classes: SchoolClass[];
  defaultClassId?: string;
  onSubmit: (values: SectionFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = Boolean(section);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SectionFormValues>({ resolver: zodResolver(sectionFormSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(
        section
          ? {
              name: section.name,
              classId: section.classId,
              classTeacherName: section.classTeacherName ?? "",
              capacity: section.capacity,
              currentStrength: section.currentStrength,
            }
          : { ...emptyValues, classId: defaultClassId ?? "" },
      );
    }
  }, [open, section, defaultClassId, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit section" : "New section"}</DialogTitle>
          <DialogDescription>Sections are nested under a class and track capacity and enrolled strength.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="e.g. Section A" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="classId">Class</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="classId">
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="classTeacherName">Class teacher (optional)</Label>
            <Input id="classTeacherName" placeholder="Teacher name" {...register("classTeacherName")} />
            <p className="text-xs text-muted-foreground">Free-text for now until the teacher module is wired up.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min={1} {...register("capacity")} />
              {errors.capacity && <p className="text-xs text-red-600">{errors.capacity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentStrength">Current strength</Label>
              <Input id="currentStrength" type="number" min={0} {...register("currentStrength")} />
              {errors.currentStrength && <p className="text-xs text-red-600">{errors.currentStrength.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
