import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUDIENCE_OPTIONS, CATEGORY_CONFIG } from "../constants";
import type { AnnouncementFormValues, NotificationCategory } from "../types";

const categoryEnum = z.enum(["announcement", "academic", "finance", "event", "system", "alert"]);
const audienceEnum = z.enum(["everyone", "superAdmin", "admin", "principal", "teacher", "accountant", "librarian", "receptionist", "parent", "student"]);

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message is required"),
  category: categoryEnum,
  audience: audienceEnum,
  actionUrl: z.string().optional(),
});

type FormValues = z.infer<typeof announcementSchema>;

const emptyValues: FormValues = { title: "", body: "", category: "announcement", audience: "everyone", actionUrl: "" };

const CATEGORY_OPTIONS: NotificationCategory[] = ["announcement", "academic", "finance", "event", "system", "alert"];

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
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(announcementSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post announcement</DialogTitle>
          <DialogDescription>Shows up in the in-app notification inbox for the chosen audience.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, actionUrl: values.actionUrl?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ann-title" required>Title</Label>
            <Input id="ann-title" placeholder="e.g. Sports Day rescheduled" aria-invalid={errors.title ? true : undefined} {...register("title")} />
            {errors.title && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-body" required>Message</Label>
            <Textarea id="ann-body" rows={4} placeholder="Write the announcement…" aria-invalid={errors.body ? true : undefined} {...register("body")} />
            {errors.body && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.body.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ann-category">Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ann-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_CONFIG[c].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-audience">Audience</Label>
              <Controller
                control={control}
                name="audience"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ann-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-actionUrl" optional>Link</Label>
            <Input id="ann-actionUrl" placeholder="e.g. /fees" {...register("actionUrl")} />
            <p className="text-xs text-muted-foreground">Where "View" takes the reader, e.g. /fees or /examinations.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Post announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
