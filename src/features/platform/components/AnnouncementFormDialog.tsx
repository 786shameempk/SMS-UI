import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AnnouncementFormValues } from "../types";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message is required"),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof announcementSchema>;

const emptyValues: FormValues = { title: "", body: "", expiresAt: "" };

export default function AnnouncementFormDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(announcementSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>Broadcast to every tenant admin on the platform.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, expiresAt: values.expiresAt || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="announce-title">Title</Label>
            <Input id="announce-title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announce-body">Message</Label>
            <Textarea id="announce-body" rows={4} {...register("body")} />
            {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announce-expiresAt">Expires (optional)</Label>
            <Input id="announce-expiresAt" type="date" {...register("expiresAt")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Post announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
