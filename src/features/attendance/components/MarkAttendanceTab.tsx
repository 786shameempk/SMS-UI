import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, CloudDownload, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { listAcademicYears, listClasses, listSections } from "@/features/academics/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { networkFailureCount } from "@/lib/httpClient";
import {
  AttendanceConflictError,
  NetworkUnavailableError,
  getAttendanceRegister,
  getSectionRoster,
  listRosterSections,
  saveAttendance,
} from "../api";
import { withDeviceFallback } from "../offline/cache";
import { useAttendanceQueue } from "../offline/hooks";
import OfflineStatusBar, { RegisterConflictDialog } from "../offline/OfflineStatusBar";
import { discardOperation } from "../offline/sync";
import { enqueueRegister, newOperationId } from "../offline/queue";
import { prepareForOffline } from "../offline/prepare";
import { ATTENDANCE_STATUSES, attendanceStatusBadgeVariant, todayDateKey } from "../constants";
import StatusToggleGroup from "./StatusToggleGroup";
import type { AttendanceRecord, AttendanceRegister, AttendanceStatus, MarkAttendanceEntry, SaveAttendanceParams, StudentRosterEntry } from "../types";
import { SOURCE_LABEL, formatTime } from "../methods/shared";

import { useTranslation } from "react-i18next";
// Stable fallbacks: an inline `= []` default is a new array every render, and the status-map effect
// below depends on these — with no roster/records it would setState, re-render, get another new []
// and loop forever, freezing the page (the sidebar stopped responding after opening Attendance).
const NO_ROSTER: StudentRosterEntry[] = [];
const NO_RECORDS: AttendanceRecord[] = [];
const NO_REGISTER: AttendanceRegister = { version: "none", records: NO_RECORDS };

/** Everything this screen reads is kept on the device, so it opens (and registers can be taken) without a connection. */
const offlineQuery = { networkMode: "offlineFirst" as const, retry: false };
const keepValue = <T,>(result: { value: T }) => result.value;

export default function MarkAttendanceTab() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const activeTenantId = useAuthStore((state) => state.activeTenantId);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const queue = useAttendanceQueue();
  const [conflict, setConflict] = useState<{ params: SaveAttendanceParams; current: AttendanceRecord[] } | null>(null);
  const [preparing, setPreparing] = useState(false);

  const { data: academicYears = [] } = useQuery({
    queryKey: ["attendance", "academic-years", "with-device-fallback"],
    queryFn: () => withDeviceFallback("years", listAcademicYears),
    select: keepValue,
    ...offlineQuery,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["attendance", "classes", "with-device-fallback"],
    queryFn: () => withDeviceFallback("classes", listClasses),
    select: keepValue,
    ...offlineQuery,
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["attendance", "sections", "with-device-fallback"],
    queryFn: () => withDeviceFallback("sections", listSections),
    select: keepValue,
    ...offlineQuery,
  });
  const { data: rosterSections = [] } = useQuery({
    queryKey: ["attendance", "roster-sections", "with-device-fallback"],
    queryFn: () => withDeviceFallback("roster-sections", listRosterSections),
    select: keepValue,
    ...offlineQuery,
  });

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayDateKey());
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});

  const rosterClassIds = useMemo(() => new Set(rosterSections.map((r) => r.classId)), [rosterSections]);
  const rosterSectionIds = useMemo(() => new Set(rosterSections.map((r) => r.sectionId)), [rosterSections]);

  const availableClasses = useMemo(
    () => classes.filter((c) => rosterClassIds.has(c.id) && (!academicYearId || c.academicYearId === academicYearId)),
    [classes, rosterClassIds, academicYearId],
  );
  const availableSections = useMemo(
    () => sections.filter((s) => s.classId === classId && rosterSectionIds.has(s.id)),
    [sections, classId, rosterSectionIds],
  );

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      setAcademicYearId((academicYears.find((y) => y.isCurrent) ?? academicYears[0]).id);
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (availableClasses.length && !availableClasses.some((c) => c.id === classId)) {
      setClassId(availableClasses[0].id);
    }
  }, [availableClasses, classId]);

  useEffect(() => {
    if (availableSections.length) {
      if (!availableSections.some((s) => s.id === sectionId)) setSectionId(availableSections[0].id);
    } else if (sectionId) {
      setSectionId("");
    }
  }, [availableSections, sectionId]);

  const { data: rosterResult, isLoading: rosterLoading } = useQuery({
    queryKey: ["attendance", "roster", sectionId],
    queryFn: () => withDeviceFallback(`roster:${sectionId}`, () => getSectionRoster(sectionId)),
    enabled: Boolean(sectionId),
    ...offlineQuery,
  });
  const roster = rosterResult?.value ?? NO_ROSTER;

  const { data: registerResult } = useQuery({
    queryKey: ["attendance", "records", sectionId, date],
    queryFn: async () => {
      const before = networkFailureCount();
      try {
        return await withDeviceFallback(`register:${sectionId}:${date}`, () => getAttendanceRegister(sectionId, date));
      } catch (err) {
        // Never opened on this device and no connection: take the register anyway; the school checks it against its own when it is sent.
        if (!navigator.onLine || networkFailureCount() !== before) return { value: NO_REGISTER, unknown: true as const };
        throw err;
      }
    },
    enabled: Boolean(sectionId && date),
    ...offlineQuery,
  });
  const register = registerResult?.value ?? NO_REGISTER;
  const existingRecords = register.records;
  const registerUnknown = Boolean(registerResult && "unknown" in registerResult);
  const registerFromDevice = registerResult && "fromDevice" in registerResult ? registerResult.fromDevice : undefined;

  // A register saved on this device and not yet accepted is what the teacher last entered, so it is what to show.
  const pendingOp = useMemo(
    () => queue.open.find((o) => o.sectionId === sectionId && o.date === date && o.userId === user?.id && o.status !== "rejected"),
    [queue.open, sectionId, date, user?.id],
  );

  useEffect(() => {
    if (!roster.length) {
      setStatusMap({});
      return;
    }
    if (pendingOp) {
      const map: Record<string, AttendanceStatus> = {};
      roster.forEach((s) => {
        map[s.id] = "present";
      });
      pendingOp.entries.forEach((e) => {
        map[e.studentId] = e.status;
      });
      setStatusMap(map);
    } else if (existingRecords.length) {
      const map: Record<string, AttendanceStatus> = {};
      existingRecords.forEach((r) => {
        map[r.studentId] = r.status;
      });
      setStatusMap(map);
    } else {
      const map: Record<string, AttendanceStatus> = {};
      roster.forEach((s) => {
        map[s.id] = "present";
      });
      setStatusMap(map);
    }
    // Re-derive whenever the roster, the persisted records or the register waiting on this device change.
  }, [roster, existingRecords, pendingOp]);

  const sectionLabelFor = () => `${classes.find((c) => c.id === classId)?.name ?? "Class"} · ${sections.find((s) => s.id === sectionId)?.name ?? "Section"}`;

  const saveMutation = useMutation({
    // Runs offline too: a register that can't be sent is kept on the device instead of waiting for a connection.
    networkMode: "always",
    mutationFn: async (entries: MarkAttendanceEntry[]) => {
      if (!user) throw new Error("Sign in again to save attendance.");
      const operationId = pendingOp?.operationId ?? newOperationId();
      const params: SaveAttendanceParams = {
        sectionId,
        date,
        captureMode: "manual",
        entries,
        operationId,
        baseVersion: pendingOp?.baseVersion ?? register.version,
        tenantId: activeTenantId,
        branchId: activeBranchId,
      };
      const keepOnDevice = async (maybeSent: boolean) => {
        await enqueueRegister({
          userId: user.id,
          tenantId: activeTenantId,
          branchId: activeBranchId,
          sectionId,
          date,
          label: sectionLabelFor(),
          entries,
          baseVersion: params.baseVersion ?? null,
          operationId,
          maybeSent,
        });
        return "queued" as const;
      };
      // Offline for sure: skip the attempt that would only wait for a timeout.
      if (!navigator.onLine) return keepOnDevice(false);
      try {
        await saveAttendance(params);
        // This save carries the newer edits, so an older copy waiting on the device must not be sent after it.
        if (pendingOp) await discardOperation(pendingOp.operationId);
        return "saved" as const;
      } catch (err) {
        if (err instanceof NetworkUnavailableError) return keepOnDevice(true);
        if (err instanceof AttendanceConflictError) {
          setConflict({ params, current: err.current });
          return "conflict" as const;
        }
        throw err;
      }
    },
    onSuccess: (outcome) => {
      if (outcome === "saved") toast.success(t("Attendance saved"));
      if (outcome === "queued") toast.success(t("Saved on this device. It will be sent when you're back online."), { duration: 6000 });
      void queryClient.invalidateQueries({ queryKey: ["attendance", "records", sectionId, date] });
    },
    onError: (e: Error) => toast.error(e.message || t("Could not save attendance")),
  });

  const keepMineAfterConflict = async () => {
    if (!conflict) return;
    try {
      await saveAttendance({ ...conflict.params, force: true });
      if (pendingOp) await discardOperation(pendingOp.operationId);
      toast.success(t("Attendance saved"));
      setConflict(null);
      void queryClient.invalidateQueries({ queryKey: ["attendance", "records", sectionId, date] });
    } catch (err) {
      toast.error((err as Error).message || t("Could not save attendance"));
    }
  };

  const useSchoolVersion = () => {
    setConflict(null);
    if (pendingOp) void discardOperation(pendingOp.operationId);
    void queryClient.invalidateQueries({ queryKey: ["attendance", "records", sectionId, date] });
  };

  const prepare = async () => {
    setPreparing(true);
    try {
      const count = await prepareForOffline(rosterSections.map((r) => r.sectionId), todayDateKey());
      toast.success(count === 0 ? t("Nothing to save.") : (count === 1 ? t("Ready offline: 1 class saved on this device for today.") : t("Ready offline: {{n}} classes saved on this device for today.", { n: count })));
    } catch {
      toast.error(t("Couldn't save the classes on this device. Check your connection and try again."));
    } finally {
      setPreparing(false);
    }
  };

  const scanByStudent = useMemo(
    () => new Map(existingRecords.filter((r) => r.captureMode !== "manual" && r.captureMode !== "mobile").map((r) => [r.studentId, r])),
    [existingRecords],
  );
  const scannedCount = scanByStudent.size;

  const selectedSection = availableSections.find((s) => s.id === sectionId);
  const selectedClass = availableClasses.find((c) => c.id === classId);

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, "half-day": 0, leave: 0 };
    roster.forEach((s) => {
      const status = statusMap[s.id];
      if (status) tally[status] += 1;
    });
    return tally;
  }, [roster, statusMap]);

  const markAllPresent = () => {
    const map: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => {
      map[s.id] = "present";
    });
    setStatusMap(map);
  };

  const handleSave = () => {
    if (!sectionId || !roster.length) return;
    const entries: MarkAttendanceEntry[] = roster.map((s) => ({ studentId: s.id, status: statusMap[s.id] ?? "present" }));
    saveMutation.mutate(entries);
  };

  return (
    <div className="space-y-5">
      <OfflineStatusBar />
      {conflict && (
        <RegisterConflictDialog
          open
          sectionId={conflict.params.sectionId}
          label={sectionLabelFor()}
          date={conflict.params.date}
          mine={conflict.params.entries}
          server={conflict.current}
          onKeepMine={() => void keepMineAfterConflict()}
          onUseServer={useSchoolVersion}
          onClose={() => setConflict(null)}
        />
      )}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{t("Roster & capture mode")}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void prepare()} disabled={preparing || !rosterSections.length || !navigator.onLine}>
            {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
            {t("Save classes for offline use")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>{t("Academic year")}</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select year")} />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Class")}</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select class")} />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!availableClasses.length && <p className="text-xs text-muted-foreground">{t("No rosters seeded for this academic year.")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("Section")}</Label>
              <Select value={sectionId} onValueChange={setSectionId} disabled={!availableSections.length}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select section")} />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attendance-date">{t("Date")}</Label>
              <Input id="attendance-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayDateKey()} />
            </div>
          </div>

          {pendingOp && (
            <p className="text-xs text-warning-strong">{t("Showing the register saved on this device, which has not reached the school yet.")}</p>
          )}
          {!pendingOp && registerFromDevice && (
            <p className="text-xs text-muted-foreground">{t("Offline: showing the register as it was when you last opened it.")}</p>
          )}
          {registerUnknown && (
            <p className="text-xs text-muted-foreground">
              {t("Today's saved register couldn't be loaded. What you save will be checked against the school's register when it is sent.")}
            </p>
          )}
          {scannedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {scannedCount === 1 ? t("{{n}} student was marked by a scan (QR, card, biometric or face). Saving keeps those unless you change their status.", { n: scannedCount }) : t("{{n}} students were marked by a scan (QR, card, biometric or face). Saving keeps those unless you change their status.", { n: scannedCount })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>
              {selectedClass?.name ?? t("Class")} · {selectedSection?.name ?? t("Section")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {roster.length} {t("student")}{roster.length === 1 ? "" : "s"} · {new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={markAllPresent} disabled={!roster.length}>
              <CheckCheck className="w-4 h-4" />
              {t("Mark all present")}
            </Button>
            <Button type="button" onClick={handleSave} disabled={!roster.length || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("Save attendance")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_STATUSES.map((s) => (
              <Badge key={s.value} variant={attendanceStatusBadgeVariant(s.value)}>
                {t(s.label)}: {counts[s.value]}
              </Badge>
            ))}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
              {rosterLoading && <p className="px-4 py-6 text-sm text-muted-foreground">{t("Loading roster…")}</p>}
              {!rosterLoading && !roster.length && (
                <p className="px-4 py-6 text-sm text-muted-foreground">{t("No students found for this section.")}</p>
              )}
              {!rosterLoading &&
                roster.map((student) => (
                  <div key={student.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    <div className="min-w-[180px]">
                      <p className="text-sm font-medium text-foreground">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Roll")} {student.rollNumber}
                        {scanByStudent.has(student.id) && (
                          <span className="ms-1.5 inline-flex items-center rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                            {SOURCE_LABEL[scanByStudent.get(student.id)!.captureMode]} {formatTime(scanByStudent.get(student.id)!.checkInAt)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="sm:ms-auto">
                      <StatusToggleGroup
                        value={statusMap[student.id]}
                        onChange={(status) => setStatusMap((prev) => ({ ...prev, [student.id]: status }))}
                        options={ATTENDANCE_STATUSES}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
