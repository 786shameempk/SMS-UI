import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLeaveRequest, listLeaveRequests } from "../api";
import type { LeaveRequestFormValues, LeaveRequestStatus } from "../types";

const STATUS_CONFIG: Record<LeaveRequestStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

const leaveFormSchema = z
  .object({
    fromDate: z.string().min(1, "Start date is required"),
    toDate: z.string().min(1, "End date is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine((v) => new Date(v.toDate) >= new Date(v.fromDate), { message: "End date must be after start date", path: ["toDate"] });

export default function LeaveRequestsTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "leave", studentId],
    queryFn: () => listLeaveRequests(studentId),
  });
  const [formOpen, setFormOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { fromDate: "", toDate: "", reason: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: LeaveRequestFormValues) => createLeaveRequest(studentId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-portal", "leave", studentId] });
      toast.success("Leave request submitted");
      setFormOpen(false);
      reset();
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Leave requests</CardTitle>
          <CardDescription>Request and track leave on behalf of your child.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          New request
        </Button>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading requests…</p>}
        {!isLoading && requests.length === 0 && <p className="text-sm text-muted-foreground">No leave requests yet.</p>}
        {requests.map((req) => {
          const config = STATUS_CONFIG[req.status];
          return (
            <div key={req.id} className="flex items-center justify-between rounded-lg border border-border p-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {new Date(req.fromDate).toLocaleDateString()} - {new Date(req.toDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground truncate">{req.reason}</p>
              </div>
              <Badge variant={config.variant} className="shrink-0">
                {config.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New leave request</DialogTitle>
            <DialogDescription>Let the school know your child will be away.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fromDate">From</Label>
                <Input id="fromDate" type="date" aria-invalid={errors.fromDate ? true : undefined} {...register("fromDate")} />
                {errors.fromDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.fromDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toDate">To</Label>
                <Input id="toDate" type="date" aria-invalid={errors.toDate ? true : undefined} {...register("toDate")} />
                {errors.toDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.toDate.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" rows={3} aria-invalid={errors.reason ? true : undefined} {...register("reason")} />
              {errors.reason && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.reason.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
