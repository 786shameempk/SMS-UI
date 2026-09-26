import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AcademicYear, SchoolClass } from "@/features/academics/types";
import { FEE_TYPE_OPTIONS, FREQUENCY_OPTIONS } from "../constants";
import type { FeeFrequency, FeeStructure, FeeStructureFormValues, FeeType } from "../types";

const ALL_CLASSES = "__all__";

const structureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  academicYearId: z.string().min(1, "Select an academic year"),
  classId: z.string().optional(),
  feeType: z.enum(FEE_TYPE_OPTIONS.map((o) => o.value) as [FeeType, ...FeeType[]]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  frequency: z.enum(FREQUENCY_OPTIONS.map((o) => o.value) as [FeeFrequency, ...FeeFrequency[]]),
  lateFineFlat: z.coerce.number().min(0).optional(),
  lateFinePerDay: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof structureSchema>;

const emptyValues: FormValues = {
  name: "",
  academicYearId: "",
  classId: ALL_CLASSES,
  feeType: "tuition",
  amount: 0,
  frequency: "term_wise",
  lateFineFlat: 0,
  lateFinePerDay: 0,
};

export default function FeeStructureFormDialog({
  open,
  onOpenChange,
  structure,
  academicYears,
  classes,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structure?: FeeStructure | null;
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  submitting: boolean;
  onSubmit: (values: FeeStructureFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(structure);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(structureSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      structure
        ? {
            name: structure.name,
            academicYearId: structure.academicYearId,
            classId: structure.classId ?? ALL_CLASSES,
            feeType: structure.feeType,
            amount: structure.amount,
            frequency: structure.frequency,
            lateFineFlat: structure.lateFineFlat ?? 0,
            lateFinePerDay: structure.lateFinePerDay ?? 0,
          }
        : emptyValues,
    );
  }, [open, structure, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit fee structure" : "New fee structure"}</DialogTitle>
          <DialogDescription>Define the charge for a class and fee type, and optionally a late fine rule.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              classId: values.classId && values.classId !== ALL_CLASSES ? values.classId : undefined,
              lateFineFlat: values.lateFineFlat || undefined,
              lateFinePerDay: values.lateFinePerDay || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="fs-name" required>Name</Label>
            <Input id="fs-name" placeholder="e.g. Grade 8 Tuition Fee" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fs-academicYearId" required>Academic year</Label>
              <Controller
                control={control}
                name="academicYearId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="fs-academicYearId">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.academicYearId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.academicYearId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fs-classId" optional>Class</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="fs-classId">
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CLASSES}>All classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
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
              <Label htmlFor="fs-feeType" required>Fee type</Label>
              <Controller
                control={control}
                name="feeType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="fs-feeType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_TYPE_OPTIONS.map((o) => (
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
              <Label htmlFor="fs-frequency" required>Frequency</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="fs-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fs-amount" required>Amount (per cycle)</Label>
            <Input id="fs-amount" type="number" step="1" min="0" aria-invalid={errors.amount ? true : undefined} {...register("amount")} />
            {errors.amount && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fs-lateFineFlat" optional>Flat late fine</Label>
              <Input id="fs-lateFineFlat" type="number" step="1" min="0" {...register("lateFineFlat")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fs-lateFinePerDay" optional>Per-day late fine</Label>
              <Input id="fs-lateFinePerDay" type="number" step="1" min="0" {...register("lateFinePerDay")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create structure"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
