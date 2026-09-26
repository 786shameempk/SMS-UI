import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student } from "@/features/students/types";
import { DISCOUNT_TYPE_OPTIONS } from "../constants";
import type { DiscountAppliesTo, DiscountType, FeeDiscount, FeeDiscountFormValues } from "../types";

const discountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["percentage", "flat"] as [DiscountType, ...DiscountType[]]),
  value: z.coerce.number().positive("Value must be greater than zero"),
  appliesTo: z.enum(["all", "specific"] as [DiscountAppliesTo, ...DiscountAppliesTo[]]),
  studentIds: z.array(z.string()),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof discountSchema>;

const emptyValues: FormValues = {
  name: "",
  type: "percentage",
  value: 0,
  appliesTo: "all",
  studentIds: [],
  description: "",
};

export default function DiscountFormDialog({
  open,
  onOpenChange,
  discount,
  students,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount?: FeeDiscount | null;
  students: Student[];
  submitting: boolean;
  onSubmit: (values: FeeDiscountFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(discount);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(discountSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      discount
        ? {
            name: discount.name,
            type: discount.type,
            value: discount.value,
            appliesTo: discount.appliesTo,
            studentIds: discount.studentIds,
            description: discount.description ?? "",
          }
        : emptyValues,
    );
  }, [open, discount, reset]);

  const appliesTo = watch("appliesTo");
  const studentIds = watch("studentIds");

  const toggleStudent = (id: string, checked: boolean) => {
    setValue("studentIds", checked ? [...studentIds, id] : studentIds.filter((s) => s !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit discount" : "New discount / scholarship"}</DialogTitle>
          <DialogDescription>Apply a percentage or flat reduction to all students, or a specific list.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, description: values.description?.trim() || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="disc-name" required>Name</Label>
            <Input id="disc-name" placeholder="e.g. Merit Scholarship" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disc-type" required>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="disc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_TYPE_OPTIONS.map((o) => (
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
              <Label htmlFor="disc-value" required>Value</Label>
              <Input id="disc-value" type="number" step="1" min="0" aria-invalid={errors.value ? true : undefined} {...register("value")} />
              {errors.value && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.value.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="disc-appliesTo" required>Applies to</Label>
            <Controller
              control={control}
              name="appliesTo"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="disc-appliesTo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    <SelectItem value="specific">Specific students</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {appliesTo === "specific" && (
            <div className="space-y-1.5">
              <Label>Students</Label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2 space-y-1.5">
                {students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox checked={studentIds.includes(s.id)} onCheckedChange={(checked) => toggleStudent(s.id, checked === true)} />
                    {s.firstName} {s.lastName} ({s.className} - {s.section})
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="disc-description" optional>Description</Label>
            <Textarea id="disc-description" rows={2} {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create discount"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
