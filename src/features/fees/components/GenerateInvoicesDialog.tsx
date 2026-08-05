import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AcademicYear, Term } from "@/features/academics/types";
import type { FeeStructure, GenerateInvoicesParams } from "../types";

const generateSchema = z.object({
  academicYearId: z.string().min(1, "Select an academic year"),
  term: z.string().min(1, "Select a term"),
  feeStructureId: z.string().min(1, "Select a fee structure"),
  dueDate: z.string().min(1, "Due date is required"),
});

type FormValues = z.infer<typeof generateSchema>;

const emptyValues: FormValues = {
  academicYearId: "",
  term: "",
  feeStructureId: "",
  dueDate: new Date().toISOString().slice(0, 10),
};

export default function GenerateInvoicesDialog({
  open,
  onOpenChange,
  academicYears,
  terms,
  structures,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYears: AcademicYear[];
  terms: Term[];
  structures: FeeStructure[];
  submitting: boolean;
  onSubmit: (values: GenerateInvoicesParams) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(generateSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const academicYearId = watch("academicYearId");
  const availableTerms = useMemo(() => terms.filter((t) => t.academicYearId === academicYearId), [terms, academicYearId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate invoices</DialogTitle>
          <DialogDescription>
            Bulk-create invoices for every active student covered by the chosen fee structure (its class, or all students if
            the structure has no class), for the selected term.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gi-feeStructureId">Fee structure</Label>
            <Controller
              control={control}
              name="feeStructureId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="gi-feeStructureId">
                    <SelectValue placeholder="Select a fee structure" />
                  </SelectTrigger>
                  <SelectContent>
                    {structures.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.feeStructureId && <p className="text-xs text-red-600">{errors.feeStructureId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gi-academicYearId">Academic year</Label>
              <Controller
                control={control}
                name="academicYearId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gi-academicYearId">
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
              {errors.academicYearId && <p className="text-xs text-red-600">{errors.academicYearId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gi-term">Term</Label>
              <Controller
                control={control}
                name="term"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!academicYearId}>
                    <SelectTrigger id="gi-term">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTerms.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.term && <p className="text-xs text-red-600">{errors.term.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gi-dueDate">Due date</Label>
            <Input id="gi-dueDate" type="date" {...register("dueDate")} />
            {errors.dueDate && <p className="text-xs text-red-600">{errors.dueDate.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate invoices
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
