import { useState } from "react";
import { Camera, CheckCircle2, CircleAlert, Loader2, Maximize, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { giveProctoringConsent } from "./api";
import type { ProctoringSetup } from "./types";
import { useTranslation } from "react-i18next";

type Check = { state: "pending" | "ok" | "failed"; message: string };

function Row({ ok, icon: Icon, label, message }: { ok: boolean; icon: typeof Camera; label: string; message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <span className={ok ? "flex items-center gap-1 text-success-strong" : "flex items-center gap-1 text-warning-strong"}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />} {message}
      </span>
    </div>
  );
}


/**
 * Shown before a proctored exam starts: what is recorded and why, a device check, and an explicit agreement. Nothing
 * is recorded before the student agrees; refusing simply means the exam does not start (the teacher can help).
 */
export default function ProctoringConsent({
  examId,
  setup,
  onAgreed,
  onCancel,
}: {
  examId: string;
  setup: ProctoringSetup;
  onAgreed: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("online-exams");
  const needsCamera = setup.mode === "Webcam";
  const [camera, setCamera] = useState<Check>({ state: needsCamera ? "pending" : "ok", message: needsCamera ? t("Not checked yet") : t("Not needed") });
  const fullscreenAvailable = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      setCamera({ state: "ok", message: t("Camera works") });
    } catch (e) {
      setCamera({ state: "failed", message: (e as { name?: string })?.name === "NotAllowedError" ? t("Permission refused - allow the camera for this site") : t("No working camera found") });
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await giveProctoringConsent(examId, {
        noticeVersion: setup.noticeVersion,
        cameraAvailable: camera.state === "ok",
        fullscreenAvailable,
        browser: navigator.userAgent.slice(0, 200),
      });
      // Entering fullscreen needs this click; afterwards every exit is recorded.
      if (setup.requireFullscreen) await document.documentElement.requestFullscreen().catch(() => undefined);
      await onAgreed();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Could not continue."));
    } finally {
      setBusy(false);
    }
  };

  const ready = agreed && camera.state === "ok" && (!setup.requireFullscreen || fullscreenAvailable);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">{t("This exam is proctored")}</h1>
          <p className="text-sm text-muted-foreground">{t("Read what is recorded before you start.")}</p>
        </div>
      </div>
      <ul className="list-disc space-y-2 rounded-xl border border-border bg-card p-4 ps-8 text-sm leading-relaxed">
        {setup.notice.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("Device check")}</p>
        {needsCamera && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Row ok={camera.state === "ok"} icon={Camera} label={t("Camera")} message={camera.message} />
            </div>
            <Button variant="outline" onClick={checkCamera}>
              {t("Test camera")}
            </Button>
          </div>
        )}
        {setup.requireFullscreen && (
          <Row ok={fullscreenAvailable} icon={Maximize} label={t("Fullscreen")} message={fullscreenAvailable ? t("Supported") : t("Not supported in this browser")} />
        )}
        {!needsCamera && !setup.requireFullscreen && <p className="text-sm text-muted-foreground">{t("No camera or fullscreen needed for this exam.")}</p>}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} aria-label={t("I agree")} />
        <span>{t("I have read this notice and agree to these observations during the exam.")}</span>
      </label>
      {error && <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive-strong">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={start} disabled={!ready || busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("I agree, start the exam")}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t("Not now")}
        </Button>
      </div>
    </div>
  );
}
