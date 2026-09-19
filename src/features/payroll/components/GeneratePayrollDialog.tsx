import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { currentMonthKey } from "../constants";

const generateSchema = z.object({
  month: z.string().min(1, "Month is required"),
});

type FormValues = z.infer<typeof generateSchema>;

export default function GeneratePayrollDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (month: string) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(generateSchema), defaultValues: { month: currentMonthKey() } });

  useEffect(() => {
    if (open) reset({ month: currentMonthKey() });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate payroll</DialogTitle>
          <DialogDescription>
            Creates a draft payslip for every active or on-leave staff member who hasn't already been paid for this month,
            using their current salary structure.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values.month))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pr-month">Month</Label>
            <Input id="pr-month" type="month" {...register("month")} />
            {errors.month && <p className="text-xs text-red-600">{errors.month.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
