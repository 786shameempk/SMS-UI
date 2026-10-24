import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CircleDot, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { decideProctoringAppeal, decideProctoringReview, getProctoringMonitor, getProctoringSnapshot, getProctoringTimeline } from "../proctoring/api";
import type { ProctoringCandidate, ReviewOutcome } from "../proctoring/types";
import { useTranslation } from "react-i18next";

const STATE_LABEL: Record<ProctoringCandidate["state"], string> = {
  NotStarted: "Not started",
  InProgress: "Taking the exam",
  Submitted: "Submitted",
  TimedOut: "Timed out",
};

const OUTCOME_TONE: Record<ReviewOutcome, "neutral" | "warning" | "success" | "danger"> = {
  None: "neutral",
  Flagged: "warning",
  Cleared: "success",
  Warning: "warning",
  Misconduct: "danger",
};

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");

/**
 * Invigilator view: who is taking the exam, who is connected, and what each browser reported. Flags are prompts for a
 * person to look at the timeline; only the reviewer's decision is an outcome, and students can appeal it.
 */
export default function ProctoringMonitorPage() {
  const { t } = useTranslation("online-exams");
  const { id = "" } = useParams();
  const monitor = useQuery({ queryKey: ["online-exams", "monitor", id], queryFn: () => getProctoringMonitor(id), refetchInterval: 10_000 });
  const [selected, setSelected] = useState<ProctoringCandidate | null>(null);

  if (monitor.isLoading) return <PageSkeleton />;
  if (monitor.isError || !monitor.data) return <ErrorState onRetry={() => monitor.refetch()} />;
  const m = monitor.data;

  return (
    <PageContainer>
      <PageHeader title={t("Monitor: {{exam}}", { exam: m.examName })} description={m.mode === "Off" ? t("This exam is not proctored; only progress is shown.") : t("Live candidates and recorded proctoring events. Refreshes every 10 seconds.")} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("Taking the exam")} value={m.inProgress} />
        <StatCard label={t("Submitted")} value={m.submitted} />
        <StatCard label={t("Not started")} value={m.notStarted} />
        <StatCard label={t("Flagged for review")} value={m.flagged} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("Candidates")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!m.candidates.length ? (
            <EmptyState bare title={t("No students are assigned to this exam")} />
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {m.candidates.map((c) => (
                <div key={c.studentId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <CircleDot className={c.online ? "h-3.5 w-3.5 text-success" : "h-3.5 w-3.5 text-muted-foreground"} aria-label={c.online ? t("Connected") : t("Not connected")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {c.studentName} {c.rollNumber && <span className="text-xs font-normal text-muted-foreground">· {t("Roll {{roll}}", { roll: c.rollNumber })}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(STATE_LABEL[c.state])}
                      {c.state === "InProgress" ? ` · ${t("last seen {{time}}", { time: time(c.lastSeenAt) })}` : ""}
                      {c.lastEvent ? ` · ${t("last: {{event}}", { event: c.lastEvent })}` : ""}
                      {m.mode !== "Off" && !c.consentGiven && c.state === "NotStarted" ? ` · ${t("has not accepted the notice")}` : ""}
                    </p>
                  </div>
                  {c.incidents > 0 && <Badge variant="warning">{c.incidents === 1 ? t("{{n}} incident", { n: c.incidents }) : t("{{n}} incidents", { n: c.incidents })}</Badge>}
                  {c.outcome !== "None" && <Badge variant={OUTCOME_TONE[c.outcome]}>{t(c.outcome)}</Badge>}
                  {c.appealStatus === "Open" && <Badge variant="info">{t("Appeal open")}</Badge>}
                  {c.attemptId && (
                    <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                      {t("Timeline")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {selected?.attemptId && <TimelineDialog examId={id} candidate={selected} onClose={() => setSelected(null)} />}
    </PageContainer>
  );
}

function TimelineDialog({ examId, candidate, onClose }: { examId: string; candidate: ProctoringCandidate; onClose: () => void }) {
  const { t } = useTranslation("online-exams");
  const queryClient = useQueryClient();
  const attemptId = candidate.attemptId!;
  const timeline = useQuery({ queryKey: ["online-exams", "timeline", attemptId], queryFn: () => getProctoringTimeline(examId, attemptId) });
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["online-exams"] });
  const decide = useMutation({
    mutationFn: (outcome: ReviewOutcome) => decideProctoringReview(examId, attemptId, outcome, note),
    onSuccess: () => {
      toast.success(t("Decision saved"));
      setNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const appeal = useMutation({
    mutationFn: (upheld: boolean) => decideProctoringAppeal(examId, attemptId, upheld, note),
    onSuccess: () => {
      toast.success(t("Appeal decided"));
      setNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const show = async (eventId: string) => {
    try {
      setPhoto(URL.createObjectURL(await getProctoringSnapshot(examId, attemptId, eventId)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const tl = timeline.data;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{candidate.studentName}</DialogTitle>
          <DialogDescription>
            {tl ? `${t("Accepted the notice {{time}}", { time: tl.consentGivenAt ? new Date(tl.consentGivenAt).toLocaleString() : "—" })} · ${t("{{incidents}} incidents, {{warnings}} warnings", { incidents: tl.review.incidents, warnings: tl.review.warnings })}${tl.review.autoSubmitted ? ` · ${t("auto-submitted")}` : ""}` : t("Loading…")}
          </DialogDescription>
        </DialogHeader>
        {tl && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {t("Events show what the browser reported (for example a tab switch could be a notification or a power-saving prompt). Treat them as reasons to look, not as proof.")}
            </p>
            <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {tl.events.map((e) => (
                <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{time(e.occurredAt)}</span>
                  <span className="flex-1">
                    {e.type}
                    {e.detail ? <span className="text-muted-foreground"> · {e.detail}</span> : null}
                  </span>
                  {e.severity !== "Info" && <Badge variant={e.severity === "Incident" ? "danger" : "warning"}>{t(e.severity)}</Badge>}
                  {e.hasSnapshot && (
                    <Button size="sm" variant="ghost" aria-label={t("Show photo")} onClick={() => void show(e.id)}>
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {photo && <img src={photo} alt={t("Camera snapshot")} className="max-h-64 rounded-lg border border-border" />}

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("Decision:")} <Badge variant={OUTCOME_TONE[tl.review.outcome]}>{t(tl.review.outcome)}</Badge>
                {tl.review.reviewNote && <span className="ms-2 text-xs text-muted-foreground">“{tl.review.reviewNote}”</span>}
              </p>
              {tl.review.appealStatus !== "None" && (
                <p className="rounded-md border border-border px-3 py-2 text-sm">
                  {t("Appeal ({{status}}):", { status: t(tl.review.appealStatus) })} “{tl.review.appealText}”{tl.review.appealDecisionNote ? ` · ${t("reply: {{note}}", { note: tl.review.appealDecisionNote })}` : ""}
                </p>
              )}
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Note for the student (required for a warning, misconduct or appeal reply)")} rows={2} aria-label={t("Decision note")} />
            </div>
          </div>
        )}
        <DialogFooter className="flex-wrap gap-2">
          {tl?.review.appealStatus === "Open" ? (
            <>
              <Button variant="outline" onClick={() => appeal.mutate(false)} disabled={!note.trim() || appeal.isPending}>
                {t("Keep decision")}
              </Button>
              <Button onClick={() => appeal.mutate(true)} disabled={!note.trim() || appeal.isPending}>
                {t("Accept appeal")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => decide.mutate("Cleared")} disabled={decide.isPending}>
                {t("Clear")}
              </Button>
              <Button variant="outline" onClick={() => decide.mutate("Warning")} disabled={!note.trim() || decide.isPending}>
                {t("Warning")}
              </Button>
              <Button variant="destructive" onClick={() => decide.mutate("Misconduct")} disabled={!note.trim() || decide.isPending}>
                {t("Misconduct")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
