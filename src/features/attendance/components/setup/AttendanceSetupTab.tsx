import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { listAttendanceAudit } from "../../methods/api";
import { SOURCE_LABEL, formatDateTime } from "../../methods/shared";
import MethodsPanel from "./MethodsPanel";
import DevicesPanel from "./DevicesPanel";
import CredentialsPanel from "./CredentialsPanel";
import FacePanel from "./FacePanel";

import { useTranslation } from "react-i18next";
type Section = "methods" | "devices" | "cards" | "face" | "audit";

/** Administrators: which methods are on, the devices and cards behind them, face consent, and the audit trail. */
export default function AttendanceSetupTab() {
  const { t } = useTranslation("attendance");
  const [section, setSection] = useState<Section>("methods");
  return (
    <div className="space-y-4">
      <SegmentedControl
        value={section}
        onValueChange={(v) => setSection(v as Section)}
        aria-label={t("Attendance setup section")}
        options={[
          { value: "methods", label: t("Methods") },
          { value: "devices", label: t("Devices") },
          { value: "cards", label: t("Cards & ids") },
          { value: "face", label: t("Face consent") },
          { value: "audit", label: t("Audit trail") },
        ]}
      />
      {section === "methods" && <MethodsPanel />}
      {section === "devices" && <DevicesPanel />}
      {section === "cards" && <CredentialsPanel />}
      {section === "face" && <FacePanel />}
      {section === "audit" && <AuditPanel />}
    </div>
  );
}

function AuditPanel() {
  const { t } = useTranslation("attendance");
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(from);
  const audit = useQuery({ queryKey: ["attendance-methods", "audit", from, to], queryFn: () => listAttendanceAudit({ from, to }) });
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>{t("Every change to attendance")}</CardTitle>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("From")} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("To")} />
        </div>
      </CardHeader>
      <CardContent>
        {!audit.data?.length ? (
          <p className="text-sm text-muted-foreground">{audit.isLoading ? t("Loading…") : t("No changes in this period.")}</p>
        ) : (
          <div className="max-h-[560px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {audit.data.map((a) => (
              <div key={a.id} className="px-3 py-2 text-sm">
                <p>
                  <span className="font-medium">{a.personName ?? t("Unknown")}</span> · {a.date} · {a.action}
                  {a.oldStatus || a.newStatus ? ` (${a.oldStatus ?? "none"} → ${a.newStatus ?? "none"})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SOURCE_LABEL[a.source] ?? a.source} · {a.actorName ?? t("System")} · {formatDateTime(a.at)}
                  {a.details ? ` · ${a.details}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
