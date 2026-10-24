import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { formatDate } from "@/utils/format";
import { ATTENDANCE_STATUSES } from "../constants";
import type { AttendanceRecord, AttendanceStatus, MarkAttendanceEntry, StudentRosterEntry } from "../types";
import { useAttendanceQueue } from "./hooks";
import { readCached } from "./cache";
import { type OperationStatus, type QueuedRegister } from "./queue";
import { discardOperation, resolveConflict, retryOperation, syncQueue } from "./sync";

import { useTranslation } from "react-i18next";
const STATUS_LABEL: Record<OperationStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Waiting to send", variant: "warning" },
  syncing: { label: "Sending…", variant: "info" },
  synced: { label: "Sent", variant: "success" },
  conflict: { label: "Needs your decision", variant: "danger" },
  rejected: { label: "Not accepted", variant: "danger" },
};

const statusName = (status: AttendanceStatus | undefined) => ATTENDANCE_STATUSES.find((s) => s.value === status)?.label ?? "Not marked";

/** Offline notice and the list of registers saved on this device: sent, waiting, disputed or refused. */
export default function OfflineStatusBar() {
  const { t } = useTranslation("attendance");
  const online = useOnlineStatus();
  const { items, open, persistent } = useAttendanceQueue();
  const [deciding, setDeciding] = useState<QueuedRegister | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const shown = items.slice().sort((a, b) => b.createdAt - a.createdAt);
  if (online && shown.length === 0) return null;

  const run = async (id: string, work: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await work();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3" aria-live="polite">
      {!online && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-strong">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {t("You're offline. You can still take attendance for classes you opened before. Registers you save are kept on this device and sent when you're back online.")}
            {!persistent && t(" This browser can't keep them after the tab is closed, so stay on this page until they are sent.")}
          </p>
        </div>
      )}

      {shown.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <p className="text-sm font-medium text-foreground">
              {t("Saved on this device")} {open.length > 0 && <span className="text-muted-foreground">{t("· {{length}} to send", { length: open.length })}</span>}
            </p>
            {open.length > 0 && online && (
              <Button type="button" size="sm" variant="outline" onClick={() => void syncQueue()}>
                <RefreshCw className="h-3.5 w-3.5" /> {t("Send now")}
              </Button>
            )}
          </div>
          <ul className="divide-y divide-border">
            {shown.map((op) => (
              <li key={op.operationId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t(op.label)} · {formatDate(op.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {op.entries.length} {t("student")}{op.entries.length === 1 ? "" : "s"}
                    {op.error && op.status !== "synced" && <span className="text-destructive-strong"> · {op.error}</span>}
                  </p>
                </div>
                <Badge variant={STATUS_LABEL[op.status].variant} dot>
                  {t(STATUS_LABEL[op.status].label)}
                </Badge>
                <div className="flex gap-2">
                  {op.status === "conflict" && (
                    <Button type="button" size="sm" onClick={() => setDeciding(op)}>
                      <TriangleAlert className="h-3.5 w-3.5" /> {t("Review")}
                    </Button>
                  )}
                  {op.status === "rejected" && (
                    <Button type="button" size="sm" variant="outline" disabled={!online || busy === op.operationId} onClick={() => void run(op.operationId, () => retryOperation(op.operationId))}>
                      {t("Try again")}
                    </Button>
                  )}
                  {(op.status === "rejected" || op.status === "pending") && (
                    <Button type="button" size="sm" variant="ghost" disabled={busy === op.operationId} onClick={() => void run(op.operationId, () => discardOperation(op.operationId))}>
                      {t("Discard")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {deciding && (
        <RegisterConflictDialog
          open
          sectionId={deciding.sectionId}
          label={deciding.label}
          date={deciding.date}
          mine={deciding.entries}
          server={deciding.conflict?.current ?? []}
          busy={busy === deciding.operationId}
          onKeepMine={() => void run(deciding.operationId, () => resolveConflict(deciding.operationId, "mine")).then(() => setDeciding(null))}
          onUseServer={() => void run(deciding.operationId, () => resolveConflict(deciding.operationId, "server")).then(() => setDeciding(null))}
          onClose={() => setDeciding(null)}
        />
      )}
    </div>
  );
}

interface ConflictProps {
  open: boolean;
  sectionId: string;
  label: string;
  date: string;
  mine: MarkAttendanceEntry[];
  server: AttendanceRecord[];
  busy?: boolean;
  onKeepMine: () => void;
  onUseServer: () => void;
  onClose: () => void;
}

/** Shows only the students whose status differs between this device's register and the one the school already holds. */
export function RegisterConflictDialog({ open, sectionId, label, date, mine, server, busy, onKeepMine, onUseServer, onClose }: ConflictProps) {
  const { t } = useTranslation("attendance");
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    void readCached<StudentRosterEntry[]>(`roster:${sectionId}`).then((saved) => {
      if (live && saved) setNames(Object.fromEntries(saved.value.map((s) => [s.id, `${s.firstName} ${s.lastName}`.trim()])));
    });
    return () => {
      live = false;
    };
  }, [sectionId]);

  const serverBy = new Map(server.map((r) => [r.studentId, r.status]));
  const mineBy = new Map(mine.map((e) => [e.studentId, e.status]));
  const ids = [...new Set([...mineBy.keys(), ...serverBy.keys()])];
  const differing = ids.filter((id) => mineBy.get(id) !== serverBy.get(id));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Someone else changed this register")}</DialogTitle>
          <DialogDescription>{t("{{label}} · {{v1}}. The school's register was saved by someone else after you opened it. Choose which version to keep.", { label, v1: formatDate(date) })}</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {differing.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{t("Both versions mark every student the same way.")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("Student")}</th>
                  <th className="px-3 py-2 font-medium">{t("Your version")}</th>
                  <th className="px-3 py-2 font-medium">{t("School's version")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {differing.map((id) => (
                  <tr key={id}>
                    <td className="px-3 py-2">{names[id] ?? t("Student")}</td>
                    <td className="px-3 py-2">{statusName(mineBy.get(id))}</td>
                    <td className="px-3 py-2">{statusName(serverBy.get(id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onUseServer} disabled={busy}>
            {t("Use the school's version")}
          </Button>
          <Button type="button" onClick={onKeepMine} loading={busy}>
            {t("Keep my version")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
