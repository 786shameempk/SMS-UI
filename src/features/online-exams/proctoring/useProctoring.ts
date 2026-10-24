import { useCallback, useEffect, useRef, useState } from "react";
import { reportProctoringEvents, uploadProctoringSnapshot } from "./api";
import type { AttemptProctoring, ProctoringEventInput, ProctoringEventType, ProctoringStatus } from "./types";

const FLUSH_EVERY_MS = 10_000;
const INACTIVITY_MS = 120_000;
const AWAY_MIN_MS = 1_500;

/** Sequence numbers survive a refresh of the exam tab, so a resent batch is recognised by the server. */
function nextSequence(attemptId: string): number {
  const key = `proctoring-seq:${attemptId}`;
  let n = 0;
  try {
    n = Number(sessionStorage.getItem(key) ?? "0") + 1;
    sessionStorage.setItem(key, String(n));
  } catch {
    n = Date.now() % 1_000_000_000;
  }
  return n;
}

export interface ProctoringState {
  status: ProctoringStatus | null;
  /** The live camera stream in webcam mode (for the small self-view). */
  stream: MediaStream | null;
  cameraError: string | null;
  inFullscreen: boolean;
  enterFullscreen: () => Promise<void>;
}

/**
 * Watches the exam page the way a browser honestly can: tab visibility, window focus, fullscreen, copy/paste and the
 * context menu, inactivity, connectivity, extra screens, and (webcam mode) whether the camera stays on. Observations
 * are batched to the server, which counts them and decides what they mean. It does not and cannot stop cheating; it
 * records what happened so a teacher can review it.
 */
export function useProctoring(
  examId: string | undefined,
  attemptId: string | undefined,
  config: AttemptProctoring | null | undefined,
  active: boolean,
  onAutoSubmitted: (status: ProctoringStatus) => void,
): ProctoringState {
  const [status, setStatus] = useState<ProctoringStatus | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [inFullscreen, setInFullscreen] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  const queue = useRef<ProctoringEventInput[]>([]);
  const sending = useRef(false);
  const again = useRef(false);
  const autoSubmitted = useRef(false);
  const onAuto = useRef(onAutoSubmitted);
  useEffect(() => {
    onAuto.current = onAutoSubmitted;
  }, [onAutoSubmitted]);
  const enabled = !!examId && !!attemptId && !!config && config.mode !== "Off" && active;

  const flush = useCallback(async () => {
    if (!examId || !attemptId) return;
    if (sending.current) {
      // Something urgent came in while a batch is on its way: send it as soon as that one returns.
      again.current = true;
      return;
    }
    const batch = queue.current.splice(0, 100);
    sending.current = true;
    try {
      const result = await reportProctoringEvents(examId, batch);
      setStatus(result);
      if (result.autoSubmitted && !autoSubmitted.current) {
        autoSubmitted.current = true;
        onAuto.current(result);
      }
    } catch {
      // Offline or a blip: keep the events (same sequence numbers) and try again on the next tick.
      queue.current.unshift(...batch);
    } finally {
      sending.current = false;
    }
    if (again.current) {
      again.current = false;
      void flushRef.current();
    }
  }, [examId, attemptId]);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const record = useCallback(
    (type: ProctoringEventType, detail?: string, urgent = false) => {
      if (!attemptId) return;
      queue.current.push({ sequence: nextSequence(attemptId), type, occurredAt: new Date().toISOString(), detail: detail ?? null });
      if (urgent) void flush();
    },
    [attemptId, flush],
  );

  // Browser observations
  useEffect(() => {
    if (!enabled) return;
    let hiddenAt = 0;
    let lastActivity = Date.now();
    let idleReported = false;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt) {
        const away = Date.now() - hiddenAt;
        hiddenAt = 0;
        if (away >= AWAY_MIN_MS) record("TabHidden", `away ${Math.round(away / 1000)} s`, true);
        record("TabVisible");
      }
    };
    const onBlur = () => document.visibilityState === "visible" && record("WindowBlur");
    const onFullscreen = () => {
      const on = !!document.fullscreenElement;
      setInFullscreen(on);
      if (config?.requireFullscreen) record(on ? "FullscreenEnter" : "FullscreenExit", undefined, !on);
    };
    const onCopy = () => record("CopyAttempt");
    const onPaste = () => record("PasteAttempt");
    const onContext = () => record("ContextMenu");
    const onActivity = () => {
      lastActivity = Date.now();
      idleReported = false;
    };
    const onOffline = () => record("NetworkOffline");
    const onOnline = () => {
      record("NetworkOnline");
      void flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    for (const e of ["keydown", "mousemove", "pointerdown", "scroll"]) window.addEventListener(e, onActivity, { passive: true });
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    // A second screen is only detectable where the browser exposes it (Chromium's screen.isExtended).
    const extended = (window.screen as Screen & { isExtended?: boolean }).isExtended;
    if (extended) record("MultipleScreens", "extended display detected", true);

    const timer = window.setInterval(() => {
      if (!idleReported && Date.now() - lastActivity > INACTIVITY_MS) {
        idleReported = true;
        record("Inactivity", `no input for ${Math.round((Date.now() - lastActivity) / 1000)} s`);
      }
      void flush(); // also the heartbeat
    }, FLUSH_EVERY_MS);
    void flush();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      for (const e of ["keydown", "mousemove", "pointerdown", "scroll"]) window.removeEventListener(e, onActivity);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
      void flush();
    };
  }, [enabled, config?.requireFullscreen, record, flush]);

  // Camera (webcam mode): it must stay on; snapshots only when the teacher configured them.
  useEffect(() => {
    if (!enabled || config?.mode !== "Webcam") return;
    let cancelled = false;
    let current: MediaStream | null = null;
    let snapshotTimer: number | undefined;
    const video = document.createElement("video");
    video.muted = true;
    video.setAttribute("playsinline", "true");
    const canvas = document.createElement("canvas");

    (async () => {
      try {
        current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (cancelled) {
          current.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(current);
        setCameraError(null);
        record("CameraStarted");
        for (const track of current.getVideoTracks()) {
          track.addEventListener("ended", () => record("CameraStopped", "camera turned off or disconnected", true));
          track.addEventListener("mute", () => record("CameraStopped", "camera feed paused", true));
        }
        video.srcObject = current;
        await video.play().catch(() => undefined);
        if (config.snapshotIntervalSeconds > 0 && examId) {
          snapshotTimer = window.setInterval(() => {
            if (!video.videoWidth) return;
            canvas.width = Math.min(640, video.videoWidth);
            canvas.height = Math.round((video.videoHeight / video.videoWidth) * canvas.width);
            canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => blob && void uploadProctoringSnapshot(examId, blob).catch(() => undefined), "image/jpeg", 0.7);
          }, config.snapshotIntervalSeconds * 1000);
        }
      } catch (err) {
        if (cancelled) return;
        setCameraError((err as { name?: string })?.name === "NotAllowedError" ? "Camera permission was refused." : "The camera could not be started.");
        record("CameraUnavailable", (err as { name?: string })?.name, true);
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(snapshotTimer);
      current?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [enabled, config?.mode, config?.snapshotIntervalSeconds, examId, record]);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Refused (not from a click, or not supported): the overlay stays and the exit stays recorded.
    }
  }, []);

  return { status, stream, cameraError, inFullscreen, enterFullscreen };
}
