import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ResignStaffFormValues, StaffMember } from "../types";

const resignFormSchema = z.object({
  lastWorkingDate: z.string().min(1, "Last working date is required"),
  reason: z.string().min(1, "Reason is required"),
});

export default function ResignStaffDialog({
  open,
  onOpenChange,
  staff,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSubmit: (values: ResignStaffFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResignStaffFormValues>({
    resolver: zodResolver(resignFormSchema),
    defaultValues: { lastWorkingDate: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ lastWorkingDate: "", reason: "" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record resignation</DialogTitle>
          <DialogDescription>
            {staff ? `Mark ${staff.firstName} ${staff.lastName} as resigned.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lastWorkingDate">Last working date</Label>
            <Input id="lastWorkingDate" type="date" {...register("lastWorkingDate")} />
            {errors.lastWorkingDate && <p className="text-xs text-red-600">{errors.lastWorkingDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" rows={3} {...register("reason")} />
            {errors.reason && <p className="text-xs text-red-600">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm resignation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
