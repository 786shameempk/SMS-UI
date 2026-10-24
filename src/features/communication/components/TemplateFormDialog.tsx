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
import { TEMPLATE_CATEGORIES, TEMPLATE_LANGUAGES } from "../constants";
import type { MessageTemplate, MessageTemplateFormValues } from "../types";
import ChannelSelector from "./ChannelSelector";

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
            language: template.language ?? "en",
            smsTemplateId: template.smsTemplateId ?? "",
            whatsAppTemplateName: template.whatsAppTemplateName ?? "",
            whatsAppTemplateLanguage: template.whatsAppTemplateLanguage ?? "",
          }
        : emptyValues,
    );
  }, [open, template, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
