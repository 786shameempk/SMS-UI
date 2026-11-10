import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Calculator, Lock, Pencil, Rocket, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { amendCycleDates, amendCycleScoring, cancelCycle, closeCycle, deleteCycle, getCycle, previewCycle, publishCycle, recalculateCycle } from "../api";
import AssignmentsPanel from "../components/AssignmentsPanel";
import CycleFormDialog from "../components/CycleFormDialog";
import ParticipantsPanel from "../components/ParticipantsPanel";
import { CYCLE_STATUS, NS, STAGE_LABEL, StatusBadge, categoryLabel, formatDate, groupLabel, useApiMutation, useAppraisalAccess } from "../shared";
import type { CycleDetail } from "../types";

import { useTranslation } from "react-i18next";

export default function CycleDetailPage() {
  const { cycleId = "" } = useParams();
  const { t } = useTranslation(NS);
  const query = useQuery({ queryKey: ["appraisal", "cycle", cycleId], queryFn: () => getCycle(cycleId), enabled: Boolean(cycleId) });

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} title={t("This cycle can't be opened")} />;
  return <CycleBody cycle={query.data} />;
}

function CycleBody({ cycle }: { cycle: CycleDetail }) {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const navigate = useNavigate();
  const id = cycle.summary.id;
  const status = cycle.summary.status;
  const editable = !cycle.frozen && (status === "Draft" || status === "Configured");
  const live = cycle.frozen && !["Closed", "Cancelled", "Finalized"].includes(status);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | "close" | "cancel" | "delete" | null>(null);
  const [amend, setAmend] = useState<"dates" | "scoring" | null>(null);
  const invalidate = [["appraisal", "cycle", id], ["appraisal", "cycles"], ["appraisal", "participants", id]];

  const act = useApiMutation(
    (kind: "publish" | "close" | "cancel" | "delete") => (kind === "publish" ? publishCycle(id) : kind === "close" ? closeCycle(id) : kind === "cancel" ? cancelCycle(id) : deleteCycle(id)),
    {
      success: t("Done"),
      invalidate,
      onSuccess: () => {
        if (confirm === "delete") navigate("/appraisal/cycles");
        setConfirm(null);
      },
    },
  );
  const recalc = useApiMutation(() => recalculateCycle(id), { success: (r) => t("{{n}} appraisals recalculated", { n: r.recalculated }), invalidate });

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/appraisal/cycles">
          <ArrowLeft className="h-4 w-4" /> {t("All cycles")}
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{cycle.summary.name}</h2>
              <p className="text-sm text-muted-foreground">
                {[cycle.summary.appraisalType, cycle.evaluationPeriod, `${formatDate(cycle.summary.startDate)} – ${formatDate(cycle.summary.endDate)}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {cycle.frozen && (
                <Badge variant="neutral">
                  <Lock className="h-3 w-3" aria-hidden="true" /> {t("Rules frozen")}
                </Badge>
              )}
              <StatusBadge map={CYCLE_STATUS} value={status} />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {editable && access.canManageCycles && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> {t("Edit")}
              </Button>
            )}
            {editable && access.canPublish && (
              <Button size="sm" onClick={() => setConfirm("publish")}>
                <Rocket className="h-4 w-4" /> {t("Review and publish")}
              </Button>
            )}
            {live && access.canAmend && (
              <>
                <Button variant="outline" size="sm" onClick={() => setAmend("dates")}>
                  {t("Amend dates")}
                </Button>
                {cycle.config.scoringMode === "numeric" && (
                  <Button variant="outline" size="sm" onClick={() => setAmend("scoring")}>
                    {t("Amend weights")}
                  </Button>
                )}
              </>
            )}
            {cycle.frozen && access.canFinalize && cycle.config.scoringMode === "numeric" && (
              <Button variant="outline" size="sm" loading={recalc.isPending} onClick={() => recalc.mutate(undefined)}>
                <Calculator className="h-4 w-4" /> {t("Recalculate")}
              </Button>
            )}
            {live && access.canManageCycles && (
              <>
                <Button variant="outline" size="sm" onClick={() => setConfirm("close")}>
                  {t("Close cycle")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirm("cancel")}>
                  <XCircle className="h-4 w-4" /> {t("Cancel cycle")}
                </Button>
              </>
            )}
            {status === "Draft" && access.canManageCycles && (
              <Button variant="outline" size="sm" onClick={() => setConfirm("delete")}>
                <Trash2 className="h-4 w-4" /> {t("Delete draft")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="participants">{t("Participants")}</TabsTrigger>
          <TabsTrigger value="reviewers">{t("Reviewer assignment")}</TabsTrigger>
          <TabsTrigger value="monitoring">{t("Review monitoring")}</TabsTrigger>
          <TabsTrigger value="approvals">{t("Approval & finalization")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview cycle={cycle} />
        </TabsContent>
        <TabsContent value="participants">
          <ParticipantsPanel cycle={cycle} mode="participants" />
        </TabsContent>
        <TabsContent value="reviewers">
          <AssignmentsPanel cycle={cycle} />
        </TabsContent>
        <TabsContent value="monitoring">
          <ParticipantsPanel cycle={cycle} mode="monitoring" />
        </TabsContent>
        <TabsContent value="approvals">
          <ParticipantsPanel cycle={cycle} mode="approvals" />
        </TabsContent>
      </Tabs>

      <CycleFormDialog open={editing} cycle={cycle} onClose={() => setEditing(false)} />
      <PublishDialog open={confirm === "publish"} cycleId={id} pending={act.isPending} onClose={() => setConfirm(null)} onConfirm={() => act.mutate("publish")} />
      <ConfirmCycle
        kind={confirm === "close" || confirm === "cancel" || confirm === "delete" ? confirm : null}
        pending={act.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && act.mutate(confirm)}
      />
      <AmendDialog kind={amend} cycle={cycle} onClose={() => setAmend(null)} invalidate={invalidate} />
    </div>
  );
}

function Overview({ cycle }: { cycle: CycleDetail }) {
  const { t } = useTranslation(NS);
  const c = cycle.config;
  const numeric = c.scoringMode === "numeric";
  const rules = c.reviewerRules.filter((r) => r.enabled);
  const dates: [string, string | null | undefined][] = [
    [t("Reviews open"), cycle.reviewOpenDate],
    [t("Submission deadline"), cycle.summary.submissionDeadline],
    [t("Manager review deadline"), cycle.managerDeadline],
    [t("Approval deadline"), cycle.summary.approvalDeadline],
    [t("Finalization date"), cycle.finalizationDate],
    [t("Keep records until"), cycle.retainUntil],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Plan")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label={t("Template")} value={cycle.templateName ? `${cycle.templateName}${cycle.templateVersionNo ? ` v${cycle.templateVersionNo}` : ""}` : "—"} />
          <Row label={t("Scoring")} value={numeric ? t("Weighted score") : t("Qualitative - feedback and development plans, no numeric score")} />
          <Row label={t("Categories")} value={cycle.eligibleCategories.length ? cycle.eligibleCategories.map((x) => t(categoryLabel(x))).join(", ") : t("All switched on in the configuration")} />
          <Row label={t("Anonymity minimum")} value={t("{{n}} responses", { n: c.minAnonymousResponses })} />
          <Row label={t("Approval steps")} value={c.stages.filter((s) => s.enabled).map((s) => t(STAGE_LABEL[s.key] ?? s.key)).join(" → ") || t("None")} />
          {dates.map(([l, v]) => (
            <Row key={l} label={l} value={formatDate(v)} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Who reviews")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No reviewer groups are switched on.")}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {rules.map((r, i) => (
                <li key={`${r.category}-${r.group}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {t(groupLabel(r.group))} <span className="text-muted-foreground">· {r.category === "*" ? t("all categories") : t(categoryLabel(r.category))}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {r.mandatory && <Badge variant="info">{t("Required")}</Badge>}
                    {r.anonymous && <Badge variant="neutral">{t("Anonymous")}</Badge>}
                    {numeric && <Badge variant="brand">{r.weight}%</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-end font-medium">{value}</span>
  </div>
);

function PublishDialog({ open, cycleId, pending, onClose, onConfirm }: { open: boolean; cycleId: string; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation(NS);
  const preview = useQuery({ queryKey: ["appraisal", "preview", cycleId], queryFn: () => previewCycle(cycleId), enabled: open });
  const p = preview.data;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Review before publishing")}</DialogTitle>
          <DialogDescription>{t("Publishing freezes the questions, scoring and reviewer rules, then creates the reviewer assignments. Later changes need an audited amendment.")}</DialogDescription>
        </DialogHeader>
        {preview.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : preview.isError || !p ? (
          <ErrorState bare size="sm" onRetry={() => preview.refetch()} retrying={preview.isFetching} />
        ) : (
          <div className="space-y-3 text-sm">
            <p>{t("{{people}} participants · {{questions}} questions", { people: p.participants, questions: p.questionCount })}</p>
            {p.groups.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {p.groups.map((g) => (
                  <li key={g.group} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>{t(groupLabel(g.group))}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("{{a}} reviews for {{p}} people", { a: g.assignments, p: g.participants })}
                      {g.mandatory ? ` · ${t("required")}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {p.blockers.map((b) => (
              <p key={b} className="flex gap-2 rounded-md bg-destructive-soft px-3 py-2 text-destructive-strong">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {b}
              </p>
            ))}
            {p.warnings.map((w) => (
              <p key={w} className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-warning-strong">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {w}
              </p>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={pending} disabled={pending || !p || p.blockers.length > 0} onClick={onConfirm}>
            <Rocket className="h-4 w-4" /> {t("Publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmCycle({ kind, pending, onClose, onConfirm }: { kind: "close" | "cancel" | "delete" | null; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation(NS);
  const copy = {
    close: { title: t("Close this cycle?"), body: t("No more reviews can be submitted. Finalized appraisals are kept."), cta: t("Close cycle") },
    cancel: { title: t("Cancel this cycle?"), body: t("Open review requests are cancelled. Records are kept."), cta: t("Cancel cycle") },
    delete: { title: t("Delete this draft?"), body: t("Only drafts can be deleted."), cta: t("Delete draft") },
  };
  const c = kind ? copy[kind] : copy.close;
  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>{c.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Keep it")}
          </Button>
          <Button variant="destructive" loading={pending} onClick={onConfirm}>
            {c.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AmendDialog({ kind, cycle, onClose, invalidate }: { kind: "dates" | "scoring" | null; cycle: CycleDetail; onClose: () => void; invalidate: string[][] }) {
  const { t } = useTranslation(NS);
  const [reason, setReason] = useState("");
  const [dates, setDates] = useState<Record<string, string>>({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const id = cycle.summary.id;
  const rules = cycle.config.reviewerRules.filter((r) => r.enabled);
  const keyOf = (r: { category: string; group: string }) => `${r.category}|${r.group}`;

  const run = useApiMutation(
    () =>
      kind === "dates"
        ? amendCycleDates(id, { reason: reason.trim(), ...Object.fromEntries(Object.entries(dates).filter(([, v]) => v)) })
        : amendCycleScoring(id, { reason: reason.trim(), weights: rules.map((r) => ({ category: r.category, group: r.group, weight: weights[keyOf(r)] ?? r.weight })) }),
    {
      success: t("Amendment recorded"),
      invalidate,
      onSuccess: () => {
        setReason("");
        setDates({});
        setWeights({});
        onClose();
      },
    },
  );
  const fields: [string, string][] = [
    ["reviewOpenDate", t("Reviews open")],
    ["submissionDeadline", t("Submission deadline")],
    ["managerDeadline", t("Manager review deadline")],
    ["approvalDeadline", t("Approval deadline")],
    ["finalizationDate", t("Finalization date")],
  ];
  const ready = reason.trim() && (kind === "scoring" || Object.values(dates).some(Boolean));

  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kind === "scoring" ? t("Amend reviewer weights") : t("Amend dates and deadlines")}</DialogTitle>
          <DialogDescription>{kind === "scoring" ? t("Only the weights can change. Open appraisals are recalculated; finalized ones keep their result until reopened. Before and after are written to the audit history.") : t("Only dates change. Questions and scoring stay frozen. The change is written to the audit history.")}</DialogDescription>
        </DialogHeader>
        {kind === "dates" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([k, label]) => (
              <FormField key={k} label={label} htmlFor={`am-${k}`} optional>
                <Input id={`am-${k}`} type="date" value={dates[k] ?? ""} onChange={(e) => setDates((d) => ({ ...d, [k]: e.target.value }))} />
              </FormField>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={keyOf(r)} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {t(groupLabel(r.group))} <span className="text-muted-foreground">· {r.category === "*" ? t("all") : t(categoryLabel(r.category))}</span>
                </span>
                <Input aria-label={`${groupLabel(r.group)} ${t("weight")}`} type="number" min={0} max={100} className="w-24" value={weights[keyOf(r)] ?? r.weight} onChange={(e) => setWeights((w) => ({ ...w, [keyOf(r)]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} />
              </div>
            ))}
          </div>
        )}
        <FormField label={t("Reason")} htmlFor="am-reason" required>
          <Textarea id="am-reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={run.isPending} disabled={!ready || run.isPending} onClick={() => run.mutate(undefined)}>
            {t("Record amendment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
