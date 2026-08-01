import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAVE_TYPES } from "../constants";
import type { LeaveRequestFormValues, StaffMember } from "../types";

const leaveFormSchema = z
  .object({
    staffId: z.string().min(1, "Select a staff member"),
    leaveType: z.enum(["sick", "casual", "earned", "unpaid"]),
    fromDate: z.string().min(1, "Start date is required"),
    toDate: z.string().min(1, "End date is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine((v) => new Date(v.toDate) >= new Date(v.fromDate), { message: "End date must be after start date", path: ["toDate"] });

export default function LeaveRequestFormDialog({
  open,
  onOpenChange,
  staffList,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: StaffMember[];
  onSubmit: (values: LeaveRequestFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { staffId: "", leaveType: "casual", fromDate: "", toDate: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ staffId: "", leaveType: "casual", fromDate: "", toDate: "", reason: "" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New leave request</DialogTitle>
          <DialogDescription>Record leave on behalf of a staff member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staffId">Staff member</Label>
            <Controller
              control={control}
              name="staffId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="staffId">
                    <SelectValue placeholder="Select a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} &middot; {s.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staffId && <p className="text-xs text-red-600">{errors.staffId.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="leaveType">Type</Label>
              <Controller
                control={control}
                name="leaveType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="leaveType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="fromDate">From</Label>
              <Input id="fromDate" type="date" {...register("fromDate")} />
              {errors.fromDate && <p className="text-xs text-red-600">{errors.fromDate.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="toDate">To</Label>
              <Input id="toDate" type="date" {...register("toDate")} />
              {errors.toDate && <p className="text-xs text-red-600">{errors.toDate.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" rows={2} {...register("reason")} />
            {errors.reason && <p className="text-xs text-red-600">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
