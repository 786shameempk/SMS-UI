import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { getAttendanceExceptions, reviewScanEvent } from "../methods/api";
import { SOURCE_LABEL, formatDateTime, formatTime, useIsAttendanceAdmin } from "../methods/shared";
import type { ReconciliationRow, ScanEvent } from "../methods/types";
import { todayDateKey } from "../constants";

import { useTranslation } from "react-i18next";
/** The day's exceptions: what devices refused, what needs review, and where scans and registers disagree. */
export default function ExceptionsTab() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();
  const isAdmin = useIsAttendanceAdmin();
  const [date, setDate] = useState(todayDateKey());
  const report = useQuery({ queryKey: ["attendance-methods", "exceptions", date], queryFn: () => getAttendanceExceptions(date), refetchInterval: 60_000 });
  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => reviewScanEvent(id, approve),
    onSuccess: (e) => {
      toast.success(e.result === "accepted" ? t("Approved and marked") : t("Rejected"));
      queryClient.invalidateQueries({ queryKey: ["attendance-methods", "exceptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (report.isError) return <ErrorState onRetry={() => report.refetch()} />;
  const r = report.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" className="w-auto" value={date} max={todayDateKey()} onChange={(e) => setDate(e.target.value)} aria-label={t("Day")} />
        {report.isFetching && <span className="text-xs text-muted-foreground">{t("Refreshing…")}</span>}
      </div>
      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("Accepted scans")} value={r.accepted} />
            <StatCard label={t("Duplicates ignored")} value={r.duplicates} />
            <StatCard label={t("Refused")} value={r.rejected} />
            <StatCard label={t("Waiting for review")} value={r.pendingReview} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("Waiting for review")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!r.pendingEvents.length ? (
                <p className="text-sm text-muted-foreground">{t("Nothing to review.")}</p>
              ) : (
                <EventList
                  events={r.pendingEvents}
                  actions={(e) =>
                    isAdmin && (
                      <>
                        <Button size="sm" onClick={() => review.mutate({ id: e.id, approve: true })} disabled={review.isPending}>
                          <Check className="h-4 w-4" /> {t("Approve")}
                        </Button>
                        <Button size="sm" variant="destructive-outline" onClick={() => review.mutate({ id: e.id, approve: false })} disabled={review.isPending}>
                          <X className="h-4 w-4" /> {t("Reject")}
                        </Button>
                      </>
                    )
                  }
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Rows title={t("Scanned in, marked absent")} rows={r.scannedButAbsent} empty="No conflicts." />
            <Rows title={t("Present without a scan")} rows={r.presentWithoutScan} empty="Every present student has a scan (or no device method is on)." />
            <Rows title={t("Staff who did not check out")} rows={r.staffNotCheckedOut} empty="Everyone checked out (shown for past days)." />
            <Card>
              <CardHeader>
                <CardTitle>{t("Unknown cards and ids")}</CardTitle>
              </CardHeader>
              <CardContent>
                {!r.unknownIdentifiers.length ? (
                  <p className="text-sm text-muted-foreground">{t("No unknown cards were tapped.")}</p>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {r.unknownIdentifiers.map((u) => (
                      <div key={`${u.identifierLabel}-${u.deviceName}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="flex-1">
                          {u.identifierLabel} · {SOURCE_LABEL[u.source] ?? u.source} · {u.deviceName ?? t("Unknown device")}
                        </span>
                        <span className="text-xs text-muted-foreground">{t("{{count1}}× · last {{v2}}", { count1: u.count, v2: formatTime(u.lastSeenAt) })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("Refused scans")}</CardTitle>
            </CardHeader>
            <CardContent>{!r.rejectedEvents.length ? <p className="text-sm text-muted-foreground">{t("None.")}</p> : <EventList events={r.rejectedEvents} />}</CardContent>
          </Card>

          {r.offlineDevices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Offline devices")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {r.offlineDevices.map((d) => (
                  <p key={d.id} className="text-sm">{t("{{name}} · last seen {{v1}}", { name: d.name, v1: formatDateTime(d.lastSeenAt) })}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function EventList({ events, actions }: { events: ScanEvent[]; actions?: (e: ScanEvent) => React.ReactNode }) {
  const { t } = useTranslation("attendance");
  return (
    <div className="max-h-[420px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
      {events.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{e.personName ?? e.identifierLabel ?? t("Unknown")}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(e.occurredAt)} · {SOURCE_LABEL[e.source] ?? e.source}
              {e.deviceName ? ` · ${e.deviceName}` : ""}
              {e.confidence != null ? t(" · match {{v1}}%", { v1: (e.confidence * 100).toFixed(0) }) : ""}
              {e.reason ? ` · ${e.reason}` : ""}
            </p>
          </div>
          {actions?.(e)}
        </div>
      ))}
    </div>
  );
}

function Rows({ title, rows, empty }: { title: string; rows: ReconciliationRow[]; empty: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {rows.length > 0 && <Badge variant="warning">{rows.length}</Badge>}
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="max-h-[280px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {rows.map((row) => (
              <div key={`${row.personType}-${row.personId}`} className="px-3 py-2 text-sm">
                <span className="font-medium">{row.personName}</span>
                {row.detail && <span className="text-muted-foreground"> · {row.detail}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
