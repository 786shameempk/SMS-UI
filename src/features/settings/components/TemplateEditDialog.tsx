import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SystemTemplate, SystemTemplateFormValues } from "../types";

const templateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1, "Message body is required"),
});

type FormValues = z.infer<typeof templateSchema>;

export default function TemplateEditDialog({
  open,
  onOpenChange,
  template,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: SystemTemplate | null;
  submitting: boolean;
  onSubmit: (values: SystemTemplateFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(templateSchema) });

  useEffect(() => {
    if (open && template) reset({ subject: template.subject ?? "", body: template.body });
  }, [open, template, reset]);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>System-triggered {template.channel === "email" ? "email" : "SMS"} content. Use the variables below in the body.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, subject: values.subject?.trim() || undefined }),
          )}
          className="space-y-4"
        >
          <div className="flex flex-wrap gap-1.5">
            {template.variables.map((v) => (
              <Badge key={v} variant="neutral">
                {"{{" + v + "}}"}
              </Badge>
            ))}
          </div>

          {template.channel === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input id="tpl-subject" {...register("subject")} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tpl-body" required>Body</Label>
            <Textarea id="tpl-body" rows={6} aria-invalid={errors.body ? true : undefined} {...register("body")} />
            {errors.body && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.body.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
