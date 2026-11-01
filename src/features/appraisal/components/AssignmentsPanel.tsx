import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Repeat, Undo2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { listStaff } from "@/features/staff/api";
import { addAssignment, cancelAssignment, generateAssignments, getSettings, listAssignments, listParticipants, reassignAssignment, reopenAssignment } from "../api";
import { ASSIGNMENT_STATUS, NS, REVIEWER_GROUP_LABEL, SelectField, StatusBadge, formatDate, groupLabel, useApiMutation, useAppraisalAccess } from "../shared";
import type { Assignment, CycleDetail } from "../types";
import CommentDialog from "./CommentDialog";

import { useTranslation } from "react-i18next";

/** Who reviews whom: generate assignments from real relationships, add a reviewer by hand, or cancel and reassign one. */
export default function AssignmentsPanel({ cycle }: { cycle: CycleDetail }) {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const cycleId = cycle.summary.id;
  const [participantId, setParticipantId] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [acting, setActing] = useState<{ kind: "cancel" | "reopen" | "reassign"; a: Assignment } | null>(null);

  const participants = useQuery({ queryKey: ["appraisal", "participants", cycleId], queryFn: () => listParticipants(cycleId) });
  const assignments = useQuery({ queryKey: ["appraisal", "assignments", participantId], queryFn: () => listAssignments(participantId!), enabled: Boolean(participantId) });
  const published = cycle.frozen;
  const canAssign = access.canAssignReviewers && published && !["Closed", "Cancelled"].includes(cycle.summary.status);

  const generate = useApiMutation((id?: string) => generateAssignments(cycleId, id), {
    success: (r) => t("{{created}} created, {{skipped}} already existed", { created: r.created, skipped: r.skipped }),
    invalidate: [["appraisal", "assignments"], ["appraisal", "participants", cycleId]],
  });

  return (
    <div className="space-y-4">
      {!published && <p className="rounded-md bg-muted px-3 py-2 text-sm">{t("Reviewer assignments are created when the cycle is published.")}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <SelectField
          aria-label={t("Employee")}
          className="w-72"
          placeholder={t("Choose an employee")}
          value={participantId}
          onChange={setParticipantId}
          items={(participants.data ?? []).filter((p) => p.status !== "Withdrawn").map((p) => ({ value: p.id, label: `${p.name} (${p.assignmentsSubmitted}/${p.assignmentsTotal})` }))}
        />
        {canAssign && (
          <>
            <Button size="sm" variant="outline" loading={generate.isPending} onClick={() => generate.mutate(undefined)}>
              <RefreshCw className="h-4 w-4" /> {t("Generate for everyone")}
            </Button>
            {participantId && (
              <Button size="sm" variant="outline" loading={generate.isPending} onClick={() => generate.mutate(participantId)}>
                <RefreshCw className="h-4 w-4" /> {t("Generate for this person")}
              </Button>
            )}
            {participantId && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> {t("Add reviewer")}
              </Button>
            )}
          </>
        )}
      </div>
      {generate.data && generate.data.notes.length > 0 && (
        <ul className="list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">
          {generate.data.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      {!participantId ? (
        <EmptyState title={t("Choose an employee")} description={t("See who has been asked to review them.")} size="sm" />
      ) : assignments.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (assignments.data ?? []).length === 0 ? (
        <EmptyState title={t("No reviewers assigned")} description={published ? t("Generate assignments or add a reviewer by hand.") : t("Publish the cycle first.")} size="sm" />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {assignments.data!.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {t(groupLabel(a.reviewerGroup))}
                    {a.contextLabel ? <span className="font-normal text-muted-foreground"> · {a.contextLabel}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.reviewerName ?? (a.anonymous ? t("Reviewer hidden (anonymous group)") : t("Reviewer hidden"))} · {a.source === "Manual" ? t("Added by hand") : t("Automatic")}
                    {a.deadline ? ` · ${t("due {{date}}", { date: formatDate(a.deadline) })}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {a.anonymous && <Badge variant="neutral">{t("Anonymous")}</Badge>}
                  <StatusBadge map={ASSIGNMENT_STATUS} value={a.status} />
                  {canAssign && a.status !== "Submitted" && a.status !== "Cancelled" && (
                    <>
                      <Button size="icon" variant="ghost" aria-label={t("Reassign")} onClick={() => setActing({ kind: "reassign", a })}>
                        <Repeat className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={t("Cancel review request")} onClick={() => setActing({ kind: "cancel", a })}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {access.canAmend && a.status === "Submitted" && !a.anonymous && (
                    <Button size="icon" variant="ghost" aria-label={t("Reopen review")} onClick={() => setActing({ kind: "reopen", a })}>
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {participantId && <AddReviewerDialog open={adding} cycleId={cycleId} participantId={participantId} onClose={() => setAdding(false)} />}
      <ActionDialog action={acting} onClose={() => setActing(null)} />
    </div>
  );
}

function ActionDialog({ action, onClose }: { action: { kind: "cancel" | "reopen" | "reassign"; a: Assignment } | null; onClose: () => void }) {
  const { t } = useTranslation(NS);
  const [staffId, setStaffId] = useState<string | undefined>();
  const staff = useQuery({ queryKey: ["appraisal", "ref", "staff"], queryFn: listStaff, enabled: action?.kind === "reassign", staleTime: 300_000 });
  const run = useApiMutation(
    ({ kind, a, reason }: { kind: "cancel" | "reopen" | "reassign"; a: Assignment; reason: string }) =>
      kind === "cancel" ? cancelAssignment(a.id, reason) : kind === "reopen" ? reopenAssignment(a.id, reason) : reassignAssignment(a.id, { reviewerStaffId: staffId, reason }).then(() => undefined),
    { success: t("Done"), invalidate: [["appraisal", "assignments"], ["appraisal", "participants"], ["appraisal", "my-reviews"]], onSuccess: onClose },
  );
  const kind = action?.kind;
  return (
    <CommentDialog
      open={action !== null}
      title={kind === "cancel" ? t("Cancel this review request?") : kind === "reopen" ? t("Reopen this review?") : t("Reassign this review")}
      description={kind === "reopen" ? t("The earlier answers stop counting but are kept in the audit history.") : kind === "reassign" ? t("The old request is kept, cancelled. Choose who reviews instead.") : undefined}
      label={t("Reason")}
      confirmLabel={kind === "cancel" ? t("Cancel request") : kind === "reopen" ? t("Reopen") : t("Reassign")}
      required={kind !== "reopen"}
      pending={run.isPending}
      blocked={kind === "reassign" && !staffId}
      onClose={onClose}
      onConfirm={(reason) => action && run.mutate({ kind: action.kind, a: action.a, reason })}
    >
      {kind === "reassign" && (
        <FormField label={t("New reviewer")} htmlFor="reassign-staff" required>
          <SelectField id="reassign-staff" value={staffId} onChange={setStaffId} items={(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}`.trim() }))} />
        </FormField>
      )}
    </CommentDialog>
  );
}

function AddReviewerDialog({ open, cycleId, participantId, onClose }: { open: boolean; cycleId: string; participantId: string; onClose: () => void }) {
  const { t } = useTranslation(NS);
  const [group, setGroup] = useState<string | undefined>();
  const [staffId, setStaffId] = useState<string | undefined>();
  const [context, setContext] = useState("");
  const settings = useQuery({ queryKey: ["appraisal", "settings"], queryFn: getSettings, enabled: open });
  const staff = useQuery({ queryKey: ["appraisal", "ref", "staff"], queryFn: listStaff, enabled: open, staleTime: 300_000 });
  const add = useApiMutation(() => addAssignment(cycleId, { participantId, reviewerGroup: group!, reviewerStaffId: staffId, contextLabel: context.trim() || undefined }), {
    success: t("Reviewer added"),
    invalidate: [["appraisal", "assignments"], ["appraisal", "participants", cycleId]],
    onSuccess: () => {
      setGroup(undefined);
      setStaffId(undefined);
      setContext("");
      onClose();
    },
  });
  const groups = [...Object.keys(REVIEWER_GROUP_LABEL), ...(settings.data?.custom.reviewerGroups ?? [])].filter((g) => g !== "student" && g !== "parent");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Add a reviewer")}</DialogTitle>
          <DialogDescription>{t("Students and parents come from the classes and children the teacher is linked to, so they are assigned automatically.")}</DialogDescription>
        </DialogHeader>
        <FormField label={t("Reviewer group")} htmlFor="add-group" required>
          <SelectField id="add-group" value={group} onChange={setGroup} items={groups.map((g) => ({ value: g, label: t(groupLabel(g)) }))} />
        </FormField>
        <FormField label={t("Reviewer")} htmlFor="add-staff" required hint={t("Must be an active staff member with a login.")}>
          <SelectField id="add-staff" value={staffId} onChange={setStaffId} items={(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}`.trim() }))} />
        </FormField>
        <FormField label={t("Note")} htmlFor="add-context" optional>
          <Input id="add-context" value={context} maxLength={200} onChange={(e) => setContext(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={add.isPending} disabled={!group || !staffId || add.isPending} onClick={() => add.mutate(undefined)}>
            {t("Add reviewer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
