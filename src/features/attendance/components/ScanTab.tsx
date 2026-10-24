import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CameraOff, CheckCircle2, Loader2, QrCode, ScanFace, Square, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { listClasses, listSections } from "@/features/academics/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/utils/cn";
import { listRosterSections } from "../api";
import { closeScanSession, getMethodStatus, getScanSession, listScanSessions, openScanSession, recognizeFaceInSession, scanPass } from "../methods/api";
import { captureJpeg, cameraErrorMessage, cameraSupported, createDetector, decodeFrame, PASS_PREFIX, startCamera, stopCamera } from "../methods/camera";
import { RESULT_LABEL, RESULT_TONE, formatTime, useIsAttendanceAdmin } from "../methods/shared";
import type { PersonType, ScanDirection, ScanOutcome, ScanSession } from "../methods/types";

import { useTranslation } from "react-i18next";
const DURATIONS = [15, 30, 60, 120, 240];

/**
 * Scanning sessions: a teacher opens one for a section (an administrator can open one for staff), then scans personal
 * QR passes with the device camera or a handheld scanner, or recognises faces. Every result comes from the server.
 */
export default function ScanTab() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();
  const isAdmin = useIsAttendanceAdmin();
  const status = useQuery({ queryKey: ["attendance-methods", "status"], queryFn: getMethodStatus });
  const sessions = useQuery({ queryKey: ["attendance-methods", "sessions"], queryFn: () => listScanSessions() });
  const [activeId, setActiveId] = useState<string | null>(null);

  const qr = status.data?.find((m) => m.method === "qr");
  const face = status.data?.find((m) => m.method === "face");
  const anyOn = Boolean(qr?.enabled || face?.enabled);

  if (status.isLoading) return <p className="py-6 text-sm text-muted-foreground">{t("Loading…")}</p>;
  if (!anyOn)
    return (
      <EmptyState
        icon={QrCode}
        title={t("QR and face attendance are switched off")}
        description={
          isAdmin
            ? t("Switch them on under Setup → Methods to scan attendance passes or recognise faces.")
            : t("Ask an administrator to switch on QR or face attendance for this branch. You can still take the register by hand.")
        }
      />
    );

  const active = sessions.data?.find((s) => s.id === activeId);
  return (
    <div className="space-y-4">
      {active ? (
        <ActiveSession
          session={active}
          faceReady={Boolean(face?.ready)}
          faceMessage={face?.message}
          qrOn={Boolean(qr?.enabled)}
          onClose={() => setActiveId(null)}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ["attendance-methods", "sessions"] })}
        />
      ) : (
        <OpenSessionCard
          isAdmin={isAdmin}
          onOpened={(s) => {
            queryClient.invalidateQueries({ queryKey: ["attendance-methods", "sessions"] });
            setActiveId(s.id);
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("Today's sessions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions.data?.length ? (
            <p className="text-sm text-muted-foreground">{t("No scanning sessions today.")}</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {sessions.data.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.audience === "staff" ? t("Staff") : s.sectionName ?? t("Section")}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(s.opensAt)} – {formatTime(s.closesAt)} · {s.accepted} {t("accepted")}
                      {s.expected ? t(" of {{expected}}", { expected: s.expected }) : ""} · {s.rejected} {t("refused")}
                    </p>
                  </div>
                  <Badge variant={s.status === "open" ? "success" : "neutral"}>{s.status === "open" ? t("Open") : t("Closed")}</Badge>
                  {s.status === "open" && s.id !== activeId && (
                    <Button size="sm" variant="outline" onClick={() => setActiveId(s.id)}>
                      {t("Resume")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OpenSessionCard({ isAdmin, onOpened }: { isAdmin: boolean; onOpened: (s: ScanSession) => void }) {
  const { t } = useTranslation("attendance");
  const roster = useQuery({ queryKey: ["attendance", "roster-sections"], queryFn: listRosterSections });
  const classes = useQuery({ queryKey: ["attendance", "classes"], queryFn: listClasses });
  const sections = useQuery({ queryKey: ["attendance", "sections"], queryFn: listSections });
  const [audience, setAudience] = useState<PersonType>("student");
  const [sectionId, setSectionId] = useState("");
  const [duration, setDuration] = useState(30);
  const [direction, setDirection] = useState<ScanDirection>("auto");

  const options = useMemo(() => {
    const allowed = new Set((roster.data ?? []).map((r) => r.sectionId));
    const classNames = new Map((classes.data ?? []).map((c) => [c.id, c.name]));
    return (sections.data ?? [])
      .filter((s) => allowed.has(s.id))
      .map((s) => ({ id: s.id, name: `${classNames.get(s.classId) ?? "Class"} – ${s.name}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roster.data, classes.data, sections.data]);

  const open = useMutation({
    mutationFn: () => openScanSession({ audience, sectionId: audience === "student" ? sectionId : null, durationMinutes: duration, direction }),
    onSuccess: (s) => {
      toast.success(t("Scanning session opened"));
      onOpened(s);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Open a scanning session")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("Students and staff show the attendance pass from their app. Passes are accepted only while the session is open and only for the people it covers.")}
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{t("For")}</Label>
          <Select value={audience} onValueChange={(v) => setAudience(v as PersonType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">{t("Students of a section")}</SelectItem>
              {isAdmin && <SelectItem value="staff">{t("Staff")}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        {audience === "student" && (
          <div className="space-y-1.5">
            <Label>{t("Section")}</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder={t("Choose a section")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t("Open for")}</Label>
          <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d < 60 ? t("{{d}} minutes", { d }) : (d === 60 ? t("1 hour") : t("{{n}} hours", { n: d / 60 }))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("Scans mean")}</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as ScanDirection)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("Arrival (first scan), then departure")}</SelectItem>
              <SelectItem value="in">{t("Arrival")}</SelectItem>
              <SelectItem value="out">{t("Departure")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button onClick={() => open.mutate()} disabled={open.isPending || (audience === "student" && !sectionId)}>
            {open.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            {t("Open session")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveSession({
  session: initial,
  qrOn,
  faceReady,
  faceMessage,
  onClose,
  onChanged,
}: {
  session: ScanSession;
  qrOn: boolean;
  faceReady: boolean;
  faceMessage?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation("attendance");
  const session = useQuery({ queryKey: ["attendance-methods", "session", initial.id], queryFn: () => getScanSession(initial.id), initialData: initial, refetchInterval: 10_000 });
  const s = session.data;
  const [mode, setMode] = useState<"qr" | "face">(qrOn ? "qr" : "face");
  const [results, setResults] = useState<ScanOutcome[]>([]);
  const [manual, setManual] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recent = useRef(new Map<string, number>());
  const sending = useRef(false);

  const record = useCallback(
    (outcome: ScanOutcome) => {
      setResults((prev) => [outcome, ...prev].slice(0, 50));
      onChanged();
      session.refetch();
    },
    [onChanged, session],
  );

  const submitToken = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token || sending.current) return;
      const last = recent.current.get(token);
      if (last && Date.now() - last < 5000) return; // the camera sees the same pass many times a second
      recent.current.set(token, Date.now());
      sending.current = true;
      setBusy(true);
      try {
        record(await scanPass(initial.id, token));
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        sending.current = false;
        setBusy(false);
      }
    },
    [initial.id, record],
  );

  // QR camera loop
  useEffect(() => {
    if (!cameraOn || mode !== "qr") return;
    const detector = createDetector();
    let stopped = false;
    const tick = async () => {
      if (stopped || !videoRef.current || !canvasRef.current) return;
      const text = await decodeFrame(videoRef.current, canvasRef.current, detector);
      if (text?.startsWith(PASS_PREFIX)) await submitToken(text);
      if (!stopped) setTimeout(tick, 250);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [cameraOn, mode, submitToken]);

  useEffect(() => () => stopCamera(streamRef.current), []);

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera(streamRef.current);
      streamRef.current = null;
      setCameraOn(false);
      return;
    }
    setCameraError(null);
    try {
      streamRef.current = await startCamera(videoRef.current!, mode === "face" ? "user" : "environment");
      setCameraOn(true);
    } catch (e) {
      setCameraError(cameraErrorMessage(e));
    }
  };

  const recognise = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setBusy(true);
    try {
      const frame = await captureJpeg(videoRef.current, canvasRef.current);
      if (!frame) return;
      const result = await recognizeFaceInSession(initial.id, frame);
      record(result.scan);
      if (result.needsManualFallback) toast(t("Not recognised confidently. Mark this person in the register."), { icon: "✋" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const close = useMutation({
    mutationFn: () => closeScanSession(initial.id),
    onSuccess: () => {
      stopCamera(streamRef.current);
      onChanged();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = results[0];
  const closed = s.status !== "open";

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{s.audience === "staff" ? t("Staff attendance") : s.sectionName}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Open until")} {formatTime(s.closesAt)} · {s.accepted} {t("accepted")}{s.expected ? t(" of {{expected}}", { expected: s.expected }) : ""} · {s.rejected} {t("refused")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("Back")}
          </Button>
          <Button variant="destructive" onClick={() => close.mutate()} disabled={closed || close.isPending}>
            <Square className="h-4 w-4" />
            {t("Close session")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="space-y-3">
          {closed && <p className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">{t("This session has closed. Open a new one to keep scanning.")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant={mode === "qr" ? "default" : "outline"} size="sm" onClick={() => setMode("qr")} disabled={!qrOn}>
              <QrCode className="h-4 w-4" /> {t("QR passes")}
            </Button>
            <Button variant={mode === "face" ? "default" : "outline"} size="sm" onClick={() => setMode("face")} disabled={!faceReady}>
              <ScanFace className="h-4 w-4" /> {t("Face")}
            </Button>
            {cameraSupported() && (
              <Button variant="outline" size="sm" onClick={toggleCamera} disabled={closed}>
                {cameraOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {cameraOn ? t("Stop camera") : t("Start camera")}
              </Button>
            )}
          </div>
          {!faceReady && mode === "qr" && faceMessage && <p className="text-xs text-muted-foreground">{t("Face: {{faceMessage}}", { faceMessage })}</p>}
          <div className="relative overflow-hidden rounded-xl border border-border bg-black/90" style={{ aspectRatio: "4 / 3" }}>
            <video ref={videoRef} className={cn("h-full w-full object-cover", !cameraOn && "hidden")} muted />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
                {cameraError ?? (cameraSupported() ? t("Start the camera to scan, or use a handheld scanner below.") : t("This browser has no camera access. Use a handheld scanner below."))}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          {mode === "face" && (
            <Button onClick={recognise} disabled={!cameraOn || busy || closed} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
              {t("Recognise")}
            </Button>
          )}
          {mode === "qr" && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitToken(manual);
                setManual("");
              }}
            >
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder={t("Handheld scanner: focus here and scan")}
                aria-label={t("Pass from a handheld scanner")}
                disabled={closed}
              />
              <Button type="submit" variant="outline" disabled={!manual.trim() || busy || closed}>
                {t("Check")}
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-3">
          {latest ? (
            <div
              className={cn(
                "rounded-xl border p-4",
                latest.result === "accepted" ? "border-success/40 bg-success-soft" : latest.result === "pendingReview" ? "border-warning/40 bg-warning-soft" : "border-destructive/40 bg-destructive-soft",
              )}
              role="status"
            >
              <div className="flex items-center gap-2">
                {latest.result === "accepted" ? <CheckCircle2 className="h-6 w-6 text-success" /> : <XCircle className="h-6 w-6 text-destructive" />}
                <p className="text-lg font-semibold">{latest.personName ?? t("Not accepted")}</p>
              </div>
              <p className="mt-1 text-sm">
                {RESULT_LABEL[latest.result]}
                {latest.attendanceStatus ? ` · ${latest.attendanceStatus}` : ""}
                {latest.reason ? ` · ${latest.reason}` : ""}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("Results appear here as people are scanned.")}</p>
          )}
          <div className="max-h-[360px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {results.map((r) => (
              <div key={r.eventId} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.personName ?? r.reason ?? t("Unknown")}</span>
                <span className="text-xs text-muted-foreground">{formatTime(r.occurredAt)}</span>
                <Badge variant={RESULT_TONE[r.result]}>{RESULT_LABEL[r.result]}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
