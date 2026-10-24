import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, CameraOff, LogIn, LogOut, ScanLine } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cameraErrorMessage, cameraSupported, createDetector, decodeFrame, startCamera, stopCamera } from "@/features/attendance/methods/camera";
import { formatDateTime } from "@/utils/format";
import { checkInFromPreApproval, checkOutVisitor, scanVisitorPass } from "../api";
import { VISITOR_PASS_PREFIX } from "../passCode";
import type { VisitorScan } from "../types";

const GOOD: VisitorScan["result"][] = ["inside", "arrival-expected"];

/** Gate scanner: read a badge or invitation with the camera (or type / scan its code with a handheld reader), see what it is, then act. */
export default function ScanPassDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("visitors");
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastToken = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const sending = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [scan, setScan] = useState<VisitorScan | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["visitors"] });
  };

  const scanMutation = useMutation({
    mutationFn: scanVisitorPass,
    onSuccess: setScan,
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not read this pass")),
    onSettled: () => {
      sending.current = false;
    },
  });
  const checkOutMutation = useMutation({
    mutationFn: checkOutVisitor,
    onSuccess: (entry) => {
      refresh();
      toast.success(t("{{name}} checked out", { name: entry.visitorName }));
      setScan(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not check out visitor")),
  });
  const checkInMutation = useMutation({
    mutationFn: checkInFromPreApproval,
    onSuccess: (entry) => {
      refresh();
      toast.success(t("{{name}} checked in — badge {{badge}}", { name: entry.visitorName, badge: entry.badgeNumber }));
      setScan(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not check in visitor")),
  });

  const submit = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || sending.current) return;
      // A camera sees the same code many times a second; ask the server once, then again only after a few seconds.
      if (lastToken.current.text === text && Date.now() - lastToken.current.at < 4000) return;
      lastToken.current = { text, at: Date.now() };
      sending.current = true;
      scanMutation.mutate(text);
    },
    [scanMutation],
  );

  useEffect(() => {
    if (!cameraOn) return;
    const detector = createDetector();
    let stopped = false;
    const tick = async () => {
      if (stopped || !videoRef.current || !canvasRef.current) return;
      const text = await decodeFrame(videoRef.current, canvasRef.current, detector);
      if (text?.startsWith(VISITOR_PASS_PREFIX)) submit(text);
      if (!stopped) setTimeout(tick, 250);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [cameraOn, submit]);

  const stop = useCallback(() => {
    stopCamera(streamRef.current);
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      setScan(null);
      setManual("");
      setCameraError(null);
    }
  }, [open, stop]);
  useEffect(() => stop, [stop]);

  const toggleCamera = async () => {
    if (cameraOn) return stop();
    setCameraError(null);
    try {
      streamRef.current = await startCamera(videoRef.current!);
      setCameraOn(true);
    } catch (e) {
      setCameraError(cameraErrorMessage(e));
    }
  };

  const good = scan ? GOOD.includes(scan.result) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Scan visitor pass")}</DialogTitle>
          <DialogDescription>{t("Scan a badge or visit pass. Scanning only shows what it is; you then choose to check the visitor in or out.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            <video ref={videoRef} className={cameraOn ? "h-full w-full object-cover" : "hidden"} muted />
            {!cameraOn && <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("Camera is off")}</div>}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          {cameraError && (
            <p role="alert" className="text-sm text-destructive-strong">
              {cameraError}
            </p>
          )}
          {cameraSupported() && (
            <Button variant="outline" onClick={toggleCamera}>
              {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              {cameraOn ? t("Stop camera") : t("Start camera")}
            </Button>
          )}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(manual);
              setManual("");
            }}
          >
            <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("Type or scan the code")} aria-label={t("Pass code")} autoComplete="off" />
            <Button type="submit" disabled={!manual.trim() || scanMutation.isPending}>
              <ScanLine className="w-4 h-4" />
              {t("Look up")}
            </Button>
          </form>

          {scan && (
            <div role="status" className={good ? "rounded-lg border border-success/30 bg-success-soft p-3 space-y-2" : "rounded-lg border border-warning/30 bg-warning-soft p-3 space-y-2"}>
              <p className="text-sm font-semibold text-foreground">{scan.message}</p>
              {scan.visitorName && (
                <p className="text-sm text-foreground">
                  {scan.visitorName}
                  {scan.badgeNumber ? ` · ${scan.badgeNumber}` : ""}
                </p>
              )}
              {scan.checkInAt && <p className="text-xs text-muted-foreground">{t("In since {{when}}", { when: formatDateTime(scan.checkInAt) })}</p>}
              {scan.scheduledAt && <p className="text-xs text-muted-foreground">{t("Expected {{when}}", { when: formatDateTime(scan.scheduledAt) })}</p>}
              {scan.result === "inside" && scan.visitorEntryId && (
                <Button size="sm" disabled={checkOutMutation.isPending} onClick={() => checkOutMutation.mutate(scan.visitorEntryId!)}>
                  <LogOut className="w-3.5 h-3.5" />
                  {t("Check out")}
                </Button>
              )}
              {scan.result === "arrival-expected" && scan.preApprovalId && (
                <Button size="sm" disabled={checkInMutation.isPending} onClick={() => checkInMutation.mutate(scan.preApprovalId!)}>
                  <LogIn className="w-3.5 h-3.5" />
                  {t("Check in")}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
