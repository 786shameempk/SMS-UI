import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, ShieldCheck, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { captureJpeg, cameraErrorMessage, startCamera, stopCamera } from "../../methods/camera";
import { deleteFaceEnrollment, enrollFace, getMethodStatus, grantFaceConsent, listFaceConsents, withdrawFaceConsent } from "../../methods/api";
import PersonPicker from "../../methods/PersonPicker";
import { formatDateTime } from "../../methods/shared";
import type { FaceConsent, PersonType } from "../../methods/types";

import { useTranslation } from "react-i18next";
/**
 * Face recognition only runs for people with a recorded consent. Photos go straight to the school's face service and
 * are not kept by School Sphere; withdrawing consent deletes the face data there.
 */
export default function FacePanel() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["attendance-methods", "status"], queryFn: getMethodStatus });
  const consents = useQuery({ queryKey: ["attendance-methods", "face-consents"], queryFn: () => listFaceConsents() });
  const [granting, setGranting] = useState(false);
  const [enrolling, setEnrolling] = useState<FaceConsent | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["attendance-methods", "face-consents"] });
  const face = status.data?.find((m) => m.method === "face");

  const withdraw = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => withdrawFaceConsent(id, reason),
    onSuccess: () => {
      toast.success(t("Consent withdrawn and face data deleted"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeEnrolment = useMutation({
    mutationFn: (c: FaceConsent) => deleteFaceEnrollment(c.personType, c.personId),
    onSuccess: () => {
      toast.success(t("Face data deleted"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{t("Face recognition consent and enrolment")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {face ? (face.enabled ? face.message : t("Face recognition is switched off. Consent can still be recorded.")) : t("Loading…")}
          </p>
        </div>
        <Button onClick={() => setGranting(true)}>
          <ShieldCheck className="h-4 w-4" /> {t("Record consent")}
        </Button>
      </CardHeader>
      <CardContent>
        {consents.isError ? (
          <ErrorState bare onRetry={() => consents.refetch()} />
        ) : !consents.data?.length ? (
          <EmptyState bare title={t("No consent recorded")} description={t("Record consent from a signed form, or ask parents to give it in the parent portal.")} />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {consents.data.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.personName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.givenBy} · {c.method} · {formatDateTime(c.grantedAt)} {t("· notice")} {c.noticeVersion}
                    {c.withdrawnAt ? t(" · withdrawn {{v1}}", { v1: formatDateTime(c.withdrawnAt) }) : ""}
                  </p>
                </div>
                <Badge variant={c.status === "granted" ? "success" : "neutral"}>{c.status === "granted" ? t("Consent given") : t("Withdrawn")}</Badge>
                {c.status === "granted" && <Badge variant={c.enrolled ? "info" : "neutral"}>{c.enrolled ? t("{{sampleCount}} photo(s)", { sampleCount: c.sampleCount }) : t("Not enrolled")}</Badge>}
                {c.status === "granted" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEnrolling(c)} disabled={!face?.ready}>
                      <Camera className="h-4 w-4" /> {t("Add photo")}
                    </Button>
                    {c.enrolled && (
                      <Button size="sm" variant="outline" onClick={() => window.confirm(`Delete the face data for ${c.personName}?`) && removeEnrolment.mutate(c)}>
                        {t("Delete face data")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive-outline"
                      onClick={() => {
                        const reason = window.prompt(`Withdraw consent for ${c.personName}? Their face data will be deleted. Reason (optional):`);
                        if (reason !== null) withdraw.mutate({ id: c.id, reason });
                      }}
                    >
                      {t("Withdraw")}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <GrantConsentDialog open={granting} onOpenChange={setGranting} onDone={refresh} />
      <EnrolDialog consent={enrolling} onClose={() => setEnrolling(null)} onDone={refresh} />
    </Card>
  );
}

function GrantConsentDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { t } = useTranslation("attendance");
  const [personType, setPersonType] = useState<PersonType>("student");
  const [personId, setPersonId] = useState<string | null>(null);
  const [givenBy, setGivenBy] = useState("");
  const [method, setMethod] = useState("Signed paper form");
  const grant = useMutation({
    mutationFn: grantFaceConsent,
    onSuccess: () => {
      toast.success(t("Consent recorded"));
      onOpenChange(false);
      setGivenBy("");
      setPersonId(null);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Record face recognition consent")}</DialogTitle>
          <DialogDescription>
            {t("Only record consent you actually hold: for students, from a parent or guardian. Keep the signed form on file.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Select
            value={personType}
            onValueChange={(v) => {
              setPersonType(v as PersonType);
              setPersonId(null);
            }}
          >
            <SelectTrigger aria-label={t("Person type")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">{t("Student")}</SelectItem>
              <SelectItem value="staff">{t("Staff member")}</SelectItem>
            </SelectContent>
          </Select>
          <PersonPicker personType={personType} value={personId} onChange={setPersonId} ariaLabel="Person giving or receiving consent" />
          <div className="space-y-1.5">
            <Label htmlFor="consent-by">{t("Given by")}</Label>
            <Input id="consent-by" value={givenBy} onChange={(e) => setGivenBy(e.target.value)} placeholder={personType === "student" ? t("Guardian: Anita Menon (mother)") : t("Self")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="consent-method">{t("How")}</Label>
            <Input id="consent-method" value={method} onChange={(e) => setMethod(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button disabled={!personId || !givenBy.trim() || grant.isPending} onClick={() => personId && grant.mutate({ personType, personId, givenBy, method })}>
            {grant.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Record consent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrolDialog({ consent, onClose, onDone }: { consent: FaceConsent | null; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation("attendance");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const enrol = useMutation({
    mutationFn: (image: Blob) => enrollFace(consent!.personType, consent!.personId, image),
    onSuccess: () => {
      toast.success(t("Face photo added"));
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const close = () => {
    stopCamera(streamRef.current);
    streamRef.current = null;
    setCameraOn(false);
    onClose();
  };
  return (
    <Dialog open={!!consent} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Add a face photo for")} {consent?.personName}</DialogTitle>
          <DialogDescription>{t("A clear, front-facing photo in good light. Add 2–3 photos for better matching. Photos are sent to the face service and not kept here.")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border border-border bg-black/90" style={{ aspectRatio: "4 / 3" }}>
          <video ref={videoRef} className={cameraOn ? "h-full w-full object-cover" : "hidden"} muted />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex flex-wrap gap-2">
          {!cameraOn ? (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  streamRef.current = await startCamera(videoRef.current!, "user");
                  setCameraOn(true);
                } catch (e) {
                  toast.error(cameraErrorMessage(e));
                }
              }}
            >
              <Camera className="h-4 w-4" /> {t("Start camera")}
            </Button>
          ) : (
            <Button
              disabled={enrol.isPending}
              onClick={async () => {
                const frame = await captureJpeg(videoRef.current!, canvasRef.current!);
                if (frame) enrol.mutate(frame);
              }}
            >
              {enrol.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {t("Take photo")}
            </Button>
          )}
          <Button variant="outline" asChild>
            <label>
              <Upload className="h-4 w-4" /> {t("Upload photo")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) enrol.mutate(file);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={close}>{t("Done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
