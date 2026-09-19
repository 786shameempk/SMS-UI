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
import { TEMPLATE_CATEGORIES } from "../constants";
import type { MessageTemplate, MessageTemplateFormValues } from "../types";
import ChannelSelector from "./ChannelSelector";

const NONE = "__none__";

const channelEnum = z.enum(["email", "sms", "push", "whatsapp", "in-app"]);

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1, "Message body is required"),
  channels: z.array(channelEnum).min(1, "Select at least one default channel"),
});

type FormValues = z.infer<typeof templateSchema>;

const emptyValues: FormValues = { name: "", category: NONE, subject: "", body: "", channels: ["email"] };

export default function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
  submitting: boolean;
  onSubmit: (values: MessageTemplateFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(template);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(templateSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      template
        ? {
            name: template.name,
            category: template.category ?? NONE,
            subject: template.subject ?? "",
            body: template.body,
            channels: template.channels,
          }
        : emptyValues,
    );
  }, [open, template, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>Reusable message content that can be picked when composing a broadcast.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              category: values.category === NONE ? undefined : values.category,
              subject: values.subject?.trim() || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template name</Label>
              <Input id="tpl-name" placeholder="e.g. Fee due reminder" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-category">Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tpl-category">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-subject">Subject (optional, used for email)</Label>
            <Input id="tpl-subject" placeholder="e.g. Fee payment reminder" {...register("subject")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">Message body</Label>
            <Textarea id="tpl-body" rows={5} placeholder="Write the reusable message content…" {...register("body")} />
            {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Default channels</Label>
            <Controller control={control} name="channels" render={({ field }) => <ChannelSelector value={field.value} onChange={field.onChange} />} />
            {errors.channels && <p className="text-xs text-red-600">{errors.channels.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
