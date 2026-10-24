import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS, LANGUAGE_OPTIONS, TIMEZONE_OPTIONS } from "../constants";
import { getLocalization, updateLocalization } from "../api";
import type { LocalizationSettings } from "../types";

export default function LocalizationTab() {
  const queryClient = useQueryClient();
  const { data: localization, isLoading } = useQuery({ queryKey: ["settings", "localization"], queryFn: getLocalization });

  const [form, setForm] = useState<LocalizationSettings | null>(null);
  const { t } = useTranslation("settings");

  useEffect(() => {
    if (localization) setForm(localization);
  }, [localization]);

  const saveMutation = useMutation({
    mutationFn: (values: LocalizationSettings) => updateLocalization(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "localization"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });
      toast.success(t("Localization settings saved"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not save settings")),
  });

  if (isLoading || !form) return <p className="text-sm text-muted-foreground py-10 text-center">{t("Loading…")}</p>;

  let preview = "";
  try {
    preview = new Intl.NumberFormat(form.language, { style: "currency", currency: form.currency, maximumFractionDigits: 0 }).format(125000);
  } catch {
    preview = "—";
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("Localization")}</CardTitle>
        <CardDescription>
          {t(
            "Saved as the school's preferred settings. The language is the default interface language for everyone who hasn't chosen their own. Existing screens keep displaying INR (₹) as today — the currency is captured for a future rollout rather than silently reformatting every amount already on screen.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("Language")}</Label>
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Timezone")}</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("Currency")}</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Date format")}</Label>
              <Select value={form.dateFormat} onValueChange={(v) => setForm({ ...form, dateFormat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground">
            {t("Preview:")} <span className="font-semibold">{preview}</span>
          </div>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("Save settings")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
