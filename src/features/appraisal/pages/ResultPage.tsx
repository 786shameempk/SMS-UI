import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Plus, RotateCcw, Send, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CommentDialog from "../components/CommentDialog";
import {
  addGoal,
  approveParticipant,
  deleteGoal,
  finalizeParticipant,
  getResult,
  getRoster,
  listAssignments,
  listCommentReviews,
  moderateReview,
  rejectParticipant,
  releaseParticipant,
  reopenParticipant,
  returnParticipant,
  submitForApproval,
  updateGoal,
} from "../api";
import { ASSIGNMENT_STATUS, GOAL_STATUS, NS, PARTICIPANT_STATUS, SelectField, StatusBadge, categoryLabel, formatDate, formatDateTime, groupLabel, options, score, useApiMutation, useAppraisalAccess } from "../shared";
import type { AppraisalResult, GoalStatus } from "../types";

import { useTranslation } from "react-i18next";

type Step = "approve" | "return" | "reject" | "reopen" | null;

/** One person's appraisal: scores and feedback (as far as the server releases them), goals, and the approval and finalization steps. */
export default function ResultPage() {
  const { participantId = "" } = useParams();
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const query = useQuery({ queryKey: ["appraisal", "result", participantId], queryFn: () => getResult(participantId), enabled: Boolean(participantId) });
  const [step, setStep] = useState<Step>(null);
  const [finalizing, setFinalizing] = useState(false);

  const refresh = [["appraisal", "result", participantId], ["appraisal", "participants"], ["appraisal", "mine"], ["appraisal", "dashboard"]];
  const submit = useApiMutation(() => submitForApproval(participantId), { success: t("Sent for approval"), invalidate: refresh });
  const decide = useApiMutation(
    ({ kind, comment }: { kind: Exclude<Step, null>; comment: string }) =>
      kind === "approve" ? approveParticipant(participantId, comment) : kind === "return" ? returnParticipant(participantId, comment) : kind === "reject" ? rejectParticipant(participantId, comment) : reopenParticipant(participantId, comment),
    { success: t("Done"), invalidate: refresh, onSuccess: () => setStep(null) },
  );
  const release = useApiMutation((value: boolean) => releaseParticipant(participantId, value), { success: t("Visibility updated"), invalidate: refresh });

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} title={t("This appraisal can't be opened")} description={t("It may not exist, or you may not be allowed to see it.")} />;
  const r = query.data;

  const manages = access.canReviewReports || access.canApprove || access.canFinalize || access.canManageCycles;
  const decides = access.canApprove || access.canFinalize || access.canAmend;
  const underApproval = r.status === "UnderApproval";
  const canSubmitForApproval = manages && ["Collecting", "Incomplete", "ReadyForApproval", "Returned"].includes(r.status);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={access.seesCycles ? "/appraisal/cycles" : "/appraisal/mine"}>
          <ArrowLeft className="h-4 w-4" /> {t("Back")}
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{r.name}</h2>
              <p className="text-sm text-muted-foreground">
                {r.cycleName} · {t(categoryLabel(r.category))}
                {r.department ? ` · ${r.department}` : ""}
              </p>
            </div>
            <StatusBadge map={PARTICIPANT_STATUS} value={r.status} />
          </div>
          <Overall r={r} />
          {!r.scoreComplete && r.scoreStatusNote && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-strong">{r.scoreStatusNote}</p>}
          {r.finalRemarks && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Final remarks")}</h3>
              <p className="whitespace-pre-line text-sm">{r.finalRemarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {(canSubmitForApproval || (underApproval && decides) || (r.status === "Finalized" && (access.canFinalize || access.canAmend))) && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-end gap-2 p-4">
            {canSubmitForApproval && (
              <Button size="sm" loading={submit.isPending} onClick={() => submit.mutate(undefined)}>
                <Send className="h-4 w-4" /> {t("Submit for approval")}
              </Button>
            )}
            {underApproval && decides && !r.atFinalizeStep && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep("reject")}>
                  <XCircle className="h-4 w-4" /> {t("Reject")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStep("return")}>
                  <RotateCcw className="h-4 w-4" /> {t("Return for revision")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStep("approve")}>
                  <CheckCircle2 className="h-4 w-4" /> {t("Approve")}
                </Button>
              </>
            )}
            {underApproval && access.canFinalize && r.atFinalizeStep && (
              <Button size="sm" onClick={() => setFinalizing(true)}>
                <ShieldCheck className="h-4 w-4" /> {t("Finalize")}
              </Button>
            )}
            {r.status === "Finalized" && access.canFinalize && (
              <Button variant="outline" size="sm" loading={release.isPending} onClick={() => release.mutate(true)}>
                <Eye className="h-4 w-4" /> {t("Release to employee")}
              </Button>
            )}
            {r.status === "Finalized" && access.canFinalize && (
              <Button variant="outline" size="sm" loading={release.isPending} onClick={() => release.mutate(false)}>
                <EyeOff className="h-4 w-4" /> {t("Hide from employee")}
              </Button>
            )}
            {r.status === "Finalized" && access.canAmend && (
              <Button variant="outline" size="sm" onClick={() => setStep("reopen")}>
                <Lock className="h-4 w-4" /> {t("Reopen")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {r.groups && r.groups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Feedback by reviewer group")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t("Group")}</th>
                  <th className="py-2 pr-3 font-medium">{t("Status")}</th>
                  <th className="py-2 pr-3 font-medium">{t("Reviews")}</th>
                  <th className="py-2 pr-3 font-medium">{t("Score")}</th>
                  <th className="py-2 font-medium">{t("Weight")}</th>
                </tr>
              </thead>
              <tbody>
                {r.groups.map((g) => (
                  <tr key={g.group} className="border-b last:border-0">
                    <td className="py-2 pr-3">{t(groupLabel(g.group))}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={g.status === "Included" ? "success" : g.status === "BelowMinimum" ? "warning" : "neutral"}>{statusText(g.status, t)}</Badge>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{g.submitted ?? g.reviews ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.scoresVisible ? score(g.score, r.scaleMax) : "—"}</td>
                    <td className="py-2 tabular-nums">{g.appliedWeight != null ? `${g.appliedWeight}%` : g.configuredWeight != null ? `${g.configuredWeight}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">{t("Groups with too few anonymous responses are not shown, so nobody can be identified from them.")}</p>
          </CardContent>
        </Card>
      )}

      {r.scoresVisible && r.categories && r.categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Scores by category")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {r.categories.map((c, i) => (
              <div key={`${c.name ?? c.category}-${i}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{c.name ?? c.category}</span>
                <span className="font-medium tabular-nums">{score(c.score, r.scaleMax)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {r.commentsVisible && r.comments && r.comments.length > 0 && <Comments r={r} participantId={participantId} />}

      <Goals r={r} participantId={participantId} />

      {r.history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Approval history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {r.history.map((h) => (
                <li key={h.id} className="rounded-md bg-muted/40 px-3 py-2">
                  <span className="font-medium">{h.decision}</span> · {h.stage} · {h.actorName} · <span className="text-muted-foreground">{formatDateTime(h.at)}</span>
                  {h.comment && <span className="block text-muted-foreground">{h.comment}</span>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {access.canAssignReviewers || access.canViewReviewerIdentity || access.canViewTeam ? <Reviewers participantId={participantId} identities={access.canViewReviewerIdentity} /> : null}

      <CommentDialog
        open={step !== null}
        title={step === "approve" ? t("Approve this stage") : step === "return" ? t("Return for revision") : step === "reject" ? t("Reject this appraisal") : t("Reopen the finalized appraisal")}
        description={step === "reopen" ? t("It goes back to the finalize step and is recorded in the audit history.") : undefined}
        label={step === "reopen" ? t("Reason") : t("Comment")}
        confirmLabel={step === "approve" ? t("Approve") : step === "return" ? t("Return") : step === "reject" ? t("Reject") : t("Reopen")}
        required={step !== "approve"}
        pending={decide.isPending}
        onClose={() => setStep(null)}
        onConfirm={(text) => step && decide.mutate({ kind: step, comment: text })}
      />
      <FinalizeDialog open={finalizing} participantId={participantId} onClose={() => setFinalizing(false)} invalidate={refresh} />
    </div>
  );
}

function statusText(status: string, t: (k: string) => string) {
  const map: Record<string, string> = { Included: "Counted", Excluded: "Not used", NoReviews: "No reviews", BelowMinimum: "Too few responses", CommentOnly: "Comments only" };
  return t(map[status] ?? status);
}

function Overall({ r }: { r: AppraisalResult }) {
  const { t } = useTranslation(NS);
  if (r.scoringMode === "qualitative") {
    return <p className="text-sm text-muted-foreground">{t("This cycle uses qualitative feedback and development plans - there is no numeric score or ranking.")}</p>;
  }
  if (!r.scoresVisible) return <p className="text-sm text-muted-foreground">{t("Scores are not available to you for this appraisal.")}</p>;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-semibold tabular-nums">{r.overallScore !== null && r.overallScore !== undefined ? score(r.overallScore, r.scaleMax ?? undefined).split(" / ")[0] : "—"}</span>
      <span className="text-sm text-muted-foreground">{t("overall, out of {{max}}", { max: r.scaleMax })}</span>
      {!r.scoreComplete && <Badge variant="warning">{t("Incomplete")}</Badge>}
    </div>
  );
}

function Comments({ r, participantId }: { r: AppraisalResult; participantId: string }) {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const moderating = access.canViewComments && (access.canFinalize || access.canAmend);
  const reviews = useQuery({ queryKey: ["appraisal", "comment-reviews", participantId], queryFn: () => listCommentReviews(participantId), enabled: moderating });
  const [target, setTarget] = useState<{ id: string; hide: boolean } | null>(null);
  const moderate = useApiMutation(({ id, hide, note }: { id: string; hide: boolean; note: string }) => moderateReview(participantId, id, { hide, note }), {
    success: t("Comment visibility updated"),
    invalidate: [["appraisal", "result", participantId], ["appraisal", "comment-reviews", participantId]],
    onSuccess: () => setTarget(null),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Written feedback")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {r.comments?.map((c, i) => (
          <blockquote key={i} className="rounded-md border-s-2 border-primary/50 bg-muted/40 px-3 py-2 text-sm">
            <p className="whitespace-pre-line">{c.text}</p>
            <footer className="mt-1 text-xs text-muted-foreground">
              {t(groupLabel(c.reviewerGroup))}
              {c.reviewer ? ` · ${c.reviewer}` : ""} · {c.question}
            </footer>
          </blockquote>
        ))}
        {moderating && reviews.data && reviews.data.length > 0 && (
          <div className="border-t border-border pt-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Moderation")}</h4>
            <ul className="space-y-1 text-sm">
              {reviews.data.map((rv) => (
                <li key={rv.reviewId} className="flex items-center justify-between gap-2">
                  <span>
                    {t(groupLabel(rv.reviewerGroup))} · {t("{{n}} comments", { n: rv.comments.length })} {rv.hidden && <Badge variant="neutral">{t("Hidden")}</Badge>}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setTarget({ id: rv.reviewId, hide: !rv.hidden })}>
                    {rv.hidden ? t("Restore") : t("Hide")}
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">{t("Hiding a review's comments never edits what was submitted.")}</p>
          </div>
        )}
      </CardContent>
      <CommentDialog
        open={target !== null}
        title={target?.hide ? t("Hide these comments") : t("Restore these comments")}
        label={t("Reason")}
        confirmLabel={target?.hide ? t("Hide") : t("Restore")}
        required
        pending={moderate.isPending}
        onClose={() => setTarget(null)}
        onConfirm={(note) => target && moderate.mutate({ id: target.id, hide: target.hide, note })}
      />
    </Card>
  );
}

function Goals({ r, participantId }: { r: AppraisalResult; participantId: string }) {
  const { t } = useTranslation(NS);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const invalidate = [["appraisal", "result", participantId]];
  const add = useApiMutation(() => addGoal(participantId, { title: title.trim(), description: description.trim() || null, targetDate: targetDate || null, status: "Proposed", source: "appraisal" }), {
    success: t("Goal added"),
    invalidate,
    onSuccess: () => {
      setAdding(false);
      setTitle("");
      setDescription("");
      setTargetDate("");
    },
  });
  const setStatus = useApiMutation(({ id, status }: { id: string; status: GoalStatus }) => updateGoal(id, { status }), { invalidate });
  const remove = useApiMutation((id: string) => deleteGoal(id), { success: t("Goal removed"), invalidate });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{t("Development goals")}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
          <Plus className="h-4 w-4" /> {t("Add goal")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <FormField label={t("Goal")} htmlFor="goal-title" required>
              <Input id="goal-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
            </FormField>
            <FormField label={t("Details")} htmlFor="goal-desc" optional>
              <Textarea id="goal-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
            <FormField label={t("Target date")} htmlFor="goal-date" optional>
              <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-48" />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
                {t("Cancel")}
              </Button>
              <Button size="sm" loading={add.isPending} disabled={!title.trim() || add.isPending} onClick={() => add.mutate(undefined)}>
                {t("Save goal")}
              </Button>
            </div>
          </div>
        )}
        {r.goals.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">{t("No development goals have been agreed yet.")}</p>
        ) : (
          <ul className="space-y-2">
            {r.goals.map((g) => (
              <li key={g.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{g.title}</p>
                  {g.description && <p className="text-muted-foreground">{g.description}</p>}
                  {g.targetDate && <p className="text-xs text-muted-foreground">{t("Target {{date}}", { date: formatDate(g.targetDate) })}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <SelectField aria-label={t("Goal status")} className="w-36" value={g.status} onChange={(v) => v && setStatus.mutate({ id: g.id, status: v })} items={options(GOAL_STATUS).map((o) => ({ ...o, label: t(o.label) }))} />
                  <Button size="icon" variant="ghost" aria-label={t("Remove goal")} onClick={() => remove.mutate(g.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Reviewers({ participantId, identities }: { participantId: string; identities: boolean }) {
  const { t } = useTranslation(NS);
  const assignments = useQuery({ queryKey: ["appraisal", "assignments", participantId], queryFn: () => listAssignments(participantId) });
  const roster = useQuery({ queryKey: ["appraisal", "roster", participantId], queryFn: () => getRoster(participantId), enabled: false });
  const [showRoster, setShowRoster] = useState(false);
  const rows = assignments.data ?? [];
  if (assignments.isLoading || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{t("Reviewers")}</CardTitle>
        {identities && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowRoster(true);
              void roster.refetch();
            }}
          >
            <Eye className="h-4 w-4" /> {t("Show reviewer names")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border text-sm">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {t(groupLabel(a.reviewerGroup))}
                {a.contextLabel ? ` · ${a.contextLabel}` : ""}
                {a.anonymous && <Badge variant="neutral" className="ms-2">{t("Anonymous")}</Badge>}
              </span>
              <span className="flex items-center gap-2">
                {a.reviewerName && <span className="text-muted-foreground">{a.reviewerName}</span>}
                <StatusBadge map={ASSIGNMENT_STATUS} value={a.status} />
              </span>
            </li>
          ))}
        </ul>
        <Dialog open={showRoster} onOpenChange={setShowRoster}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("Reviewer roster")}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">{t("Viewing this list is recorded in the audit history.")}</p>
            {roster.isFetching ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto text-sm">
                {(roster.data ?? []).map((e) => (
                  <li key={e.assignmentId} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      {e.reviewerName} <span className="text-muted-foreground">· {t(groupLabel(e.reviewerGroup))}</span>
                    </span>
                    <StatusBadge map={ASSIGNMENT_STATUS} value={e.status} />
                  </li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRoster(false)}>
                {t("Close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function FinalizeDialog({ open, participantId, onClose, invalidate }: { open: boolean; participantId: string; onClose: () => void; invalidate: string[][] }) {
  const { t } = useTranslation(NS);
  const [remarks, setRemarks] = useState("");
  const [releaseToEmployee, setRelease] = useState(false);
  const finalize = useApiMutation(() => finalizeParticipant(participantId, { remarks: remarks.trim() || undefined, releaseToEmployee }), { success: t("Appraisal finalized"), invalidate, onSuccess: onClose });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Finalize this appraisal")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("The score is recalculated and locked. You can reopen it later with a reason.")}</p>
        <FormField label={t("Final remarks")} htmlFor="final-remarks" optional>
          <Textarea id="final-remarks" rows={4} maxLength={2000} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={releaseToEmployee} onCheckedChange={setRelease} aria-label={t("Release the result to the employee now")} />
          {t("Release the result to the employee now")}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={finalize.isPending} onClick={() => finalize.mutate(undefined)}>
            {t("Finalize")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
