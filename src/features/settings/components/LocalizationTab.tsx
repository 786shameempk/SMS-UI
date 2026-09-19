import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
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

  useEffect(() => {
    if (localization) setForm(localization);
  }, [localization]);

  const saveMutation = useMutation({
    mutationFn: (values: LocalizationSettings) => updateLocalization(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "localization"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });
      toast.success("Localization settings saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save settings"),
  });

  if (isLoading || !form) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  let preview = "";
  try {
    preview = new Intl.NumberFormat(form.language, { style: "currency", currency: form.currency, maximumFractionDigits: 0 }).format(125000);
  } catch {
    preview = "—";
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Localization</CardTitle>
        <CardDescription>
          Saved as the school's preferred settings. Existing screens keep displaying INR (₹) as today — this captures the
          preference for a future rollout rather than silently reformatting every currency value already on screen.
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
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date format</Label>
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

          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-slate-700">
            Preview: <span className="font-semibold">{preview}</span>
          </div>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
