import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, CircleOff, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/ui/states";
import { getMethodSettings, getMethodStatus, updateMethodSettings } from "../../methods/api";
import type { AttendanceMethodSettings, MethodStatus } from "../../methods/types";

import { useTranslation } from "react-i18next";
const METHOD_LABEL: Record<string, string> = {
  manual: "Manual register",
  qr: "QR passes",
  rfid: "RFID cards",
  biometric: "Biometric terminals",
  face: "Face recognition",
};

/** One row per method: the school's switch, and whether it can really work right now. */
export function MethodStatusList({ statuses }: { statuses: MethodStatus[] }) {
  const { t } = useTranslation("attendance");
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {statuses.map((m) => {
        const Icon = !m.enabled ? CircleOff : m.ready ? CheckCircle2 : CircleAlert;
        return (
          <div key={m.method} className="flex items-start gap-3 px-3 py-2.5">
            <Icon className={!m.enabled ? "mt-0.5 h-4 w-4 text-muted-foreground" : m.ready ? "mt-0.5 h-4 w-4 text-success" : "mt-0.5 h-4 w-4 text-warning"} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{METHOD_LABEL[m.method] ?? m.method}</p>
              <p className="text-xs text-muted-foreground">
                {!m.enabled ? t("Off") : m.ready ? t("Ready") : t("Not ready")} · {m.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MethodsPanel() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["attendance-methods", "settings"], queryFn: getMethodSettings });
  const status = useQuery({ queryKey: ["attendance-methods", "status"], queryFn: getMethodStatus });
  // Unsaved edits; until the first edit the form shows what the server has.
  const [draft, setForm] = useState<AttendanceMethodSettings | null>(null);
  const form = draft ?? settings.data ?? null;

  const save = useMutation({
    mutationFn: updateMethodSettings,
    onSuccess: (s) => {
      setForm(s);
      toast.success(t("Attendance settings saved"));
      queryClient.invalidateQueries({ queryKey: ["attendance-methods"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (settings.isError) return <ErrorState onRetry={() => settings.refetch()} />;
  if (!form) return <p className="py-6 text-sm text-muted-foreground">{t("Loading…")}</p>;

  const set = <K extends keyof AttendanceMethodSettings>(key: K, value: AttendanceMethodSettings[K]) =>
    setForm((prev) => ({ ...(prev ?? form), [key]: value }));
  const toggle = (key: "qrEnabled" | "rfidEnabled" | "biometricEnabled" | "faceEnabled", label: string, hint: string) => (
    <label className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={form[key]} onCheckedChange={(v) => set(key, v)} aria-label={label} />
    </label>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("Methods and rules")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("Manual registers always work. Each method below only takes attendance when it is switched on here and its device or service is connected.")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {toggle("qrEnabled", "QR passes", "People show a one-minute pass from the app; teachers scan it.")}
            {toggle("rfidEnabled", "RFID cards", "Card readers registered under Devices.")}
            {toggle("biometricEnabled", "Biometric terminals", "Fingerprint/face terminals (ZKTeco ADMS or a vendor gateway).")}
            {toggle("faceEnabled", "Face recognition", "Needs a face service on the server and consent per person.")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="att-tz">{t("School time zone")}</Label>
              <Input id="att-tz" value={form.timeZoneId} onChange={(e) => set("timeZoneId", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-dup">{t("Ignore repeat scans within (minutes)")}</Label>
              <Input id="att-dup" type="number" min={0} max={240} value={form.duplicateWindowMinutes} onChange={(e) => set("duplicateWindowMinutes", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-late-s">{t("Students are late after")}</Label>
              <Input id="att-late-s" type="time" value={form.studentLateAfter ?? ""} onChange={(e) => set("studentLateAfter", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-late-t">{t("Staff are late after")}</Label>
              <Input id="att-late-t" type="time" value={form.staffLateAfter ?? ""} onChange={(e) => set("staffLateAfter", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-qr">{t("QR pass lifetime (seconds)")}</Label>
              <Input id="att-qr" type="number" min={15} max={600} value={form.qrPassLifetimeSeconds} onChange={(e) => set("qrPassLifetimeSeconds", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-ret">{t("Keep scan events for (days)")}</Label>
              <Input id="att-ret" type="number" min={30} max={1095} value={form.scanEventRetentionDays} onChange={(e) => set("scanEventRetentionDays", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-fm">{t("Face: accept automatically from (0.5–1)")}</Label>
              <Input id="att-fm" type="number" step={0.01} min={0.5} max={1} value={form.faceMatchThreshold} onChange={(e) => set("faceMatchThreshold", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-fr">{t("Face: send for review from (0.5–1)")}</Label>
              <Input id="att-fr" type="number" step={0.01} min={0.5} max={1} value={form.faceReviewThreshold} onChange={(e) => set("faceReviewThreshold", Number(e.target.value))} />
            </div>
          </div>

          <label className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">{t("Lock past days")}</span>
              <span className="block text-xs text-muted-foreground">{t("Teachers send a correction request instead of editing earlier registers; administrators approve it.")}</span>
            </span>
            <Switch checked={form.requireApprovalForPastEdits} onCheckedChange={(v) => set("requireApprovalForPastEdits", v)} aria-label={t("Lock past days")} />
          </label>

          <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("Save settings")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Connection status")}</CardTitle>
        </CardHeader>
        <CardContent>{status.data ? <MethodStatusList statuses={status.data} /> : <p className="text-sm text-muted-foreground">{t("Loading…")}</p>}</CardContent>
      </Card>
    </div>
  );
}
