import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ClipboardCheck, MessageSquareWarning, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/tables/DataTable";
import { approveLessonPlan, listLessonPlans, pendingApprovals, rejectLessonPlan, requestPlanRevision } from "../api";
import { APPROVAL, PLAN_TYPE_LABEL, SelectField, StatusBadge, formatDate, formatDateTime, options, useApiMutation } from "../shared";
import type { ApprovalStatus, LessonPlan } from "../types";

type Decision = "approve" | "changes" | "reject";

export default function ApprovalsPage() {
  const pending = useQuery({ queryKey: ["portions", "pending-approvals"], queryFn: pendingApprovals });
  const [decision, setDecision] = useState<{ plan: LessonPlan; kind: Decision } | null>(null);
  const [status, setStatus] = useState<ApprovalStatus>("Approved");
  const decided = useQuery({ queryKey: ["portions", "lesson-plans", "decided", status], queryFn: () => listLessonPlans({ status, pageSize: 100 }) });

  const columns: ColumnDef<LessonPlan, unknown>[] = [
    { id: "title", header: "Plan", accessorFn: (r) => r.title, cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.title}</p><p className="text-xs text-muted-foreground">{row.original.subjectName} · {row.original.className} {row.original.sectionName ?? ""}</p></div> },
    { id: "teacher", header: "Teacher", accessorFn: (r) => r.teacherName ?? "", cell: ({ row }) => <span className="text-sm">{row.original.teacherName ?? "—"}</span> },
    { id: "dates", header: "Dates", accessorFn: (r) => r.plannedStartDate ?? "", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.plannedStartDate)} – {formatDate(row.original.plannedEndDate)}</span> },
    { id: "rev", header: "Revision", accessorFn: (r) => r.revision, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.revision}</span> },
    { id: "status", header: "Status", accessorFn: (r) => r.approvalStatus, cell: ({ row }) => <StatusBadge map={APPROVAL} value={row.original.approvalStatus} /> },
  ];

  return (
    <Tabs defaultValue="waiting">
      <TabsList variant="line">
        <TabsTrigger value="waiting">Waiting for review{pending.data && pending.data.length > 0 ? ` (${pending.data.length})` : ""}</TabsTrigger>
        <TabsTrigger value="decided">Decided</TabsTrigger>
      </TabsList>

      <TabsContent value="waiting" className="space-y-3">
        {pending.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : pending.isError ? (
          <ErrorState onRetry={() => pending.refetch()} retrying={pending.isFetching} />
        ) : pending.data && pending.data.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Nothing waiting for review" description="Plans appear here when teachers submit them, or revise an approved plan, and your school requires approval." />
        ) : (
          pending.data?.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {p.teacherName ?? "Teacher"} · {p.subjectName} · {p.className} {p.sectionName ?? ""} · {PLAN_TYPE_LABEL[p.planType]} · {formatDate(p.plannedStartDate)} – {formatDate(p.plannedEndDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.revision > 1 && <Badge variant="info">Revision {p.revision}</Badge>}
                    {p.isAiGenerated && <Badge variant="brand">Drafted with AI</Badge>}
                  </div>
                </div>
                {p.description && <p className="line-clamp-4 whitespace-pre-line text-sm leading-6">{p.description}</p>}
                <div className="grid gap-4 md:grid-cols-2">
                  <section>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topics ({p.topics?.length ?? 0})</h4>
                    <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
                      {p.topics?.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 px-2.5 py-1.5">
                          <span className="min-w-0 flex-1 truncate">{t.topicTitle}</span>
                          <span className="text-xs text-muted-foreground">{t.plannedDate ? formatDate(t.plannedDate) : "no date"} · {t.plannedPeriods}p</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h4>
                    <ol className="max-h-48 space-y-1 overflow-y-auto text-xs">
                      {p.history?.map((h) => (
                        <li key={h.id} className="rounded-md bg-muted/40 px-2 py-1">
                          <span className="font-medium">{h.action === "RevisionRequested" ? "Changes requested" : h.action}</span> · rev {h.revision} · {formatDateTime(h.at)}
                          {h.comment && <span className="block text-muted-foreground">{h.comment}</span>}
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDecision({ plan: p, kind: "reject" })}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDecision({ plan: p, kind: "changes" })}>
                    <MessageSquareWarning className="h-4 w-4" /> Ask for changes
                  </Button>
                  <Button size="sm" onClick={() => setDecision({ plan: p, kind: "approve" })}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="decided">
        <DataTable
          searchable
          columns={columns}
          data={decided.data?.items ?? []}
          isLoading={decided.isLoading}
          isError={decided.isError}
          onRetry={() => decided.refetch()}
          exportFileName="lesson-plan-decisions"
          pageSize={10}
          empty={{ title: "No plans with this status" }}
          filters={<SelectField aria-label="Status" value={status} onChange={(v) => setStatus(v ?? "Approved")} items={options({ Approved: "Approved", Rejected: "Rejected", RevisionRequested: "Changes requested" })} className="w-48" />}
        />
      </TabsContent>

      <DecisionDialog decision={decision} onClose={() => setDecision(null)} />
    </Tabs>
  );
}

const COPY: Record<Decision, { title: string; verb: string; required: boolean; success: string; hint: string }> = {
  approve: { title: "Approve the plan", verb: "Approve", required: false, success: "Plan approved", hint: "Optional note to the teacher." },
  changes: { title: "Ask for changes", verb: "Send back", required: true, success: "Sent back to the teacher", hint: "Say what needs to change. The teacher can edit and submit again." },
  reject: { title: "Reject the plan", verb: "Reject", required: true, success: "Plan rejected", hint: "Say why. The teacher is told." },
};

function DecisionDialog({ decision, onClose }: { decision: { plan: LessonPlan; kind: Decision } | null; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const kind = decision?.kind ?? "approve";
  const copy = COPY[kind];
  const save = useApiMutation(
    () => {
      const p = decision!.plan;
      if (kind === "approve") return approveLessonPlan(p.id, comment.trim() || undefined, p.rowVersion);
      if (kind === "changes") return requestPlanRevision(p.id, comment.trim(), p.rowVersion);
      return rejectLessonPlan(p.id, comment.trim(), p.rowVersion);
    },
    { success: copy.success, invalidate: [["portions", "pending-approvals"], ["portions", "lesson-plans"]], onSuccess: () => { setComment(""); onClose(); } },
  );
  return (
    <Dialog open={Boolean(decision)} onOpenChange={(open) => !open && !save.isPending && (setComment(""), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{decision?.plan.title}</DialogDescription>
        </DialogHeader>
        <FormField label="Comment" htmlFor="dc-comment" required={copy.required} optional={!copy.required} hint={copy.hint}>
          <Textarea id="dc-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant={kind === "reject" ? "destructive" : "default"} onClick={() => save.mutate(undefined)} disabled={copy.required && !comment.trim()} loading={save.isPending}>
            {copy.verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
