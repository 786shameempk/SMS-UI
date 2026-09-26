import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { WatchlistEntryFormValues } from "../types";

const watchlistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
});

type FormValues = z.infer<typeof watchlistSchema>;

const emptyValues: FormValues = { name: "", phone: "", reason: "" };

export default function WatchlistFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: WatchlistEntryFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(watchlistSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to watchlist</DialogTitle>
          <DialogDescription>Front desk sees a warning if this name is entered during check-in.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, phone: values.phone?.trim() || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="watch-name" required>Name</Label>
            <Input id="watch-name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="watch-phone" optional>Phone</Label>
            <Input id="watch-phone" {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="watch-reason" required>Reason</Label>
            <Textarea id="watch-reason" rows={3} aria-invalid={errors.reason ? true : undefined} {...register("reason")} />
            {errors.reason && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={submitting}>
              Add to watchlist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
