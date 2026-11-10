import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEMPLATE_CATEGORIES, TEMPLATE_LANGUAGES } from "../constants";
import type { MessageTemplate, MessageTemplateFormValues } from "../types";
import ChannelSelector from "./ChannelSelector";
import { previewTemplate, type TemplatePreview } from "../messaging/platformApi";

import { useTranslation } from "react-i18next";
const NONE = "__none__";

const channelEnum = z.enum(["email", "sms", "push", "whatsapp", "in-app"]);

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1, "Message body is required"),
  channels: z.array(channelEnum).min(1, "Select at least one default channel"),
  language: z.string(),
  smsTemplateId: z.string().optional(),
  whatsAppTemplateName: z.string().optional(),
  whatsAppTemplateLanguage: z.string().optional(),
  eventType: z.string().optional(),
  approvalStatus: z.enum(["draft", "pending", "approved", "rejected"]),
  whatsAppCategory: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof templateSchema>;

const emptyValues: FormValues = {
  name: "",
  category: NONE,
  subject: "",
  body: "",
  channels: ["email"],
  language: "en",
  smsTemplateId: "",
  whatsAppTemplateName: "",
  whatsAppTemplateLanguage: "",
  eventType: "",
  approvalStatus: "approved",
  whatsAppCategory: "",
  isActive: true,
};

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
  const { t } = useTranslation("communication");
  const isEdit = Boolean(template);
  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(templateSchema), defaultValues: emptyValues });

  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const runPreview = useMutation({
    mutationFn: () => previewTemplate(getValues("subject"), getValues("body")),
    onSuccess: setPreview,
  });

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
            language: template.language ?? "en",
            smsTemplateId: template.smsTemplateId ?? "",
            whatsAppTemplateName: template.whatsAppTemplateName ?? "",
            whatsAppTemplateLanguage: template.whatsAppTemplateLanguage ?? "",
            eventType: template.eventType ?? "",
            approvalStatus: template.approvalStatus ?? "approved",
            whatsAppCategory: template.whatsAppCategory ?? "",
            isActive: template.isActive ?? true,
          }
        : emptyValues,
    );
  }, [open, template, reset]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPreview(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit template") : t("New template")}</DialogTitle>
          <DialogDescription>{t("Reusable message content that can be picked when composing a broadcast.")}</DialogDescription>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" required>{t("Template name")}</Label>
              <Input id="tpl-name" placeholder={t("e.g. Fee due reminder")} aria-invalid={errors.name ? true : undefined} {...register("name")} />
              {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-category">{t("Category")}</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tpl-category">
                      <SelectValue placeholder={t("None")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("None")}</SelectItem>
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
            <Label htmlFor="tpl-subject">{t("Subject (optional, used for email)")}</Label>
            <Input id="tpl-subject" placeholder={t("e.g. Fee payment reminder")} {...register("subject")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-body" required>{t("Message body")}</Label>
            <Textarea id="tpl-body" rows={5} placeholder={t("Write the reusable message content…")} aria-invalid={errors.body ? true : undefined} {...register("body")} />
            {errors.body && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.body.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-language">{t("Language")}</Label>
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tpl-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {t(l.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-sms-id">{t("SMS DLT template / MSG91 flow id")}</Label>
              <Input id="tpl-sms-id" placeholder={t("Required for SMS in India")} {...register("smsTemplateId")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-wa-name">{t("WhatsApp template name")}</Label>
              <Input id="tpl-wa-name" placeholder={t("Approved in WhatsApp Manager")} {...register("whatsAppTemplateName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-wa-lang">{t("WhatsApp template language")}</Label>
              <Input id="tpl-wa-lang" placeholder={t("e.g. en, en_US, ml")} {...register("whatsAppTemplateLanguage")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("The approved SMS and WhatsApp templates must accept this message text as their variable. Messages sent from this template use them.")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-event">{t("Event (for automatic notifications)")}</Label>
              <Input id="tpl-event" placeholder={t("e.g. fee.reminder, attendance.absent")} {...register("eventType")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-approval">{t("Approval status")}</Label>
              <Controller
                control={control}
                name="approvalStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tpl-approval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t("Draft")}</SelectItem>
                      <SelectItem value="pending">{t("Pending approval")}</SelectItem>
                      <SelectItem value="approved">{t("Approved")}</SelectItem>
                      <SelectItem value="rejected">{t("Rejected")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-wa-cat">{t("WhatsApp category")}</Label>
              <Controller
                control={control}
                name="whatsAppCategory"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger id="tpl-wa-cat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("Not set")}</SelectItem>
                      <SelectItem value="utility">{t("Utility")}</SelectItem>
                      <SelectItem value="authentication">{t("Authentication")}</SelectItem>
                      <SelectItem value="marketing">{t("Marketing")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" {...register("isActive")} /> {t("Template switched on")}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Automatic notifications only use Approved templates that are switched on. Editing the wording starts a new version and asks for approval again.")}
          </p>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("Preview")}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => runPreview.mutate()} loading={runPreview.isPending}>
                {t("Preview with sample data")}
              </Button>
            </div>
            {preview ? (
              <div className="space-y-1 text-sm">
                {preview.subject && <p className="font-medium">{preview.subject}</p>}
                <p className="whitespace-pre-wrap">{preview.body}</p>
                <p className="text-xs text-muted-foreground">
                  {t("{{n}} characters", { n: preview.length })} · {t("{{n}} SMS part(s)", { n: preview.smsSegments })}
                </p>
                {preview.unknown.length > 0 && (
                  <p className="text-xs text-warning-strong">{t("Not a standard placeholder: {{names}}. Make sure the sender provides it.", { names: preview.unknown.join(", ") })}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("Placeholders such as {{StudentName}} are filled for each recipient. Preview shows sample values.")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("Default channels")}</Label>
            <Controller control={control} name="channels" render={({ field }) => <ChannelSelector value={field.value} onChange={field.onChange} />} />
            {errors.channels && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.channels.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Create template")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
