import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { addPerformanceReview } from "../../api";
import type { PerformanceReviewFormValues, StaffMember } from "../../types";

const reviewSchema = z.object({
  reviewerName: z.string().min(1, "Reviewer name is required"),
  rating: z.number().min(1).max(5),
  comments: z.string().min(1, "Comments are required"),
});

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)} className="cursor-pointer">
          <Star className={cn("w-5 h-5", star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/70")} />
        </button>
      ))}
    </div>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn("w-3.5 h-3.5", star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
      ))}
    </div>
  );
}

export default function PerformanceTab({ staff }: { staff: StaffMember }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PerformanceReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { reviewerName: "", rating: 5, comments: "" },
  });

  const addMutation = useMutation({
    mutationFn: (values: PerformanceReviewFormValues) => addPerformanceReview(staff.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", staff.id] });
      toast.success("Performance review added");
      setFormOpen(false);
      reset();
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Performance reviews</CardTitle>
          <CardDescription>Periodic performance evaluations for this staff member.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add review
        </Button>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {staff.performanceReviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews on file yet.</p>}
        {staff.performanceReviews.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{r.reviewerName}</p>
              <ReviewStars rating={r.rating} />
            </div>
            <p className="text-sm text-secondary-foreground">{r.comments}</p>
            <p className="text-[11px] text-muted-foreground">{new Date(r.reviewDate).toLocaleDateString()}</p>
          </div>
        ))}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add performance review</DialogTitle>
            <DialogDescription>Record a new evaluation for {staff.firstName}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => addMutation.mutate(values))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reviewerName" required>Reviewer</Label>
              <Input id="reviewerName" aria-invalid={errors.reviewerName ? true : undefined} {...register("reviewerName")} />
              {errors.reviewerName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.reviewerName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <Controller control={control} name="rating" render={({ field }) => <StarRating value={field.value} onChange={field.onChange} />} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comments" required>Comments</Label>
              <Textarea id="comments" rows={3} aria-invalid={errors.comments ? true : undefined} {...register("comments")} />
              {errors.comments && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.comments.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={addMutation.isPending}>
                Add review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
