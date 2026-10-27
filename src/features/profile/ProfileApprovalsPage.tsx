import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { approveChange, getApproval, listApprovals, rejectChange, type ChangeStatus, type InboxTab, type ProfileChange } from "./api";

const TONE: Record<ChangeStatus, BadgeVariant> = { Pending: "info", Approved: "success", Rejected: "danger", Cancelled: "neutral" };

const RULE_LABEL: Record<ProfileChange["approverRule"], string> = {
  ClassTeacher: "Class teacher",
  ReportingPerson: "Reporting person",
  DepartmentHead: "Department head",
  Administrator: "School administrators",
};

const TYPE_LABEL: Record<ProfileChange["personType"], string> = { staff: "Staff", student: "Student", guardian: "Parent / guardian", account: "Administrator" };

const TABS: { value: InboxTab; label: string; count: string }[] = [
  { value: "pending", label: "Pending", count: "Pending" },
  { value: "approved", label: "Approved", count: "Approved" },
  { value: "rejected", label: "Rejected", count: "Rejected" },
  { value: "all", label: "All requests", count: "All" },
];

/**
 * The approver's inbox for profile changes: what is waiting for me, what I decided, and (for school leaders) everything in the school.
 * Each request shows the current value beside the proposed one before anything is approved.
 */
export default function ProfileApprovalsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<InboxTab>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["profile-approvals", tab, search, page], queryFn: () => listApprovals(tab, search, page), placeholderData: (prev) => prev });
  const counts = list.data?.counts ?? {};
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / (list.data?.pageSize ?? 25)));

  return (
    <PageContainer>
      <PageHeader title={t("Profile approvals")} description={t("Review changes people asked to make to their profile. Nothing changes until you approve it.")} icon={ClipboardCheck} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v as InboxTab); setPage(1); }}>
        <TabsList variant="line">
          {TABS.map((x) => (
            <TabsTrigger key={x.value} value={x.value}>
              {t(x.label)}
              {counts[x.count] !== undefined && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{counts[x.count]}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Input aria-label={t("Search requests")} placeholder={t("Search by name")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />

      {list.isLoading && <Skeleton className="h-48 w-full" />}
      {list.isError && <ErrorState description={(list.error as Error).message} onRetry={() => void list.refetch()} />}
      {list.data && list.data.items.length === 0 && (
        <EmptyState icon={ClipboardCheck} title={tab === "pending" ? t("Nothing is waiting for you") : t("No requests here")} description={t("Requests assigned to you appear here as soon as someone submits them.")} />
      )}
      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y rounded-md border">
          {list.data.items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {r.subjectName}
                  <Badge variant="neutral">{t(TYPE_LABEL[r.personType])}</Badge>
                  <Badge variant={TONE[r.status]}>{t(r.status)}</Badge>
                </p>
                {r.subjectDetail && <p className="text-sm text-muted-foreground">{r.subjectDetail}</p>}
                <p className="text-sm">
                  {t("Wants to change")}: {r.changes.map((c) => t(c.label)).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.requesterName !== r.subjectName ? `${t("Requested by")} ${r.requesterName} · ` : ""}
                  {new Date(r.submittedAt).toLocaleString()} · {t("Approver")}: {r.approverName ?? t(RULE_LABEL[r.approverRule])}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpen(r.id)}>{t("View details")}</Button>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous")}</Button>
          <span className="text-sm">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("Next")}</Button>
        </div>
      )}
      {open && <RequestDialog id={open} onClose={() => setOpen(null)} />}
    </PageContainer>
  );
}

function RequestDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const detail = useQuery({ queryKey: ["profile-approval", id], queryFn: () => getApproval(id) });
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["profile-approvals"] });
    void qc.invalidateQueries({ queryKey: ["profile-approval", id] });
  };
  const approve = useMutation({
    mutationFn: () => approveChange(id, comment.trim()),
    onSuccess: () => { toast.success(t("Approved. The profile has been updated.")); done(); onClose(); },
    onError: (e) => setError((e as Error).message),
  });
  const reject = useMutation({
    mutationFn: () => rejectChange(id, comment.trim()),
    onSuccess: () => { toast.success(t("Rejected. The profile was not changed.")); done(); onClose(); },
    onError: (e) => setError((e as Error).message),
  });
  const r = detail.data?.request;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{r ? r.subjectName : t("Profile change")}</DialogTitle>
          <DialogDescription>{r ? `${t(TYPE_LABEL[r.personType])}${r.subjectDetail ? ` · ${r.subjectDetail}` : ""}` : ""}</DialogDescription>
        </DialogHeader>
        {detail.isLoading && <Skeleton className="h-32 w-full" />}
        {detail.isError && <ErrorState description={(detail.error as Error).message} onRetry={() => void detail.refetch()} />}
        {r && (
          <div className="space-y-4">
            <p className="text-sm">
              {t("Requested by")} <strong>{r.requesterName}</strong> · {new Date(r.submittedAt).toLocaleString()} · <Badge variant={TONE[r.status]}>{t(r.status)}</Badge>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">{t("Field")}</th>
                  <th className="py-1 pr-2 font-medium">{t("Current")}</th>
                  <th className="py-1 font-medium">{t("Proposed")}</th>
                </tr>
              </thead>
              <tbody>
                {r.changes.map((c) => (
                  <tr key={c.key} className="border-t align-top">
                    <td className="py-2 pr-2 font-medium">{t(c.label)}{c.sensitive ? <span className="ml-1 text-xs text-muted-foreground">({t("protected")})</span> : null}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{c.from || "—"}</td>
                    <td className="py-2 font-medium">{c.to || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r.status !== "Pending" && (
              <p className="rounded-md border bg-muted/40 p-3 text-sm">
                {t(r.status)}{r.reviewedByName ? ` ${t("by")} ${r.reviewedByName}` : ""}{r.reviewedAt ? ` · ${new Date(r.reviewedAt).toLocaleString()}` : ""}
                {r.reviewerComment ? <span className="block text-muted-foreground">{r.reviewerComment}</span> : null}
              </p>
            )}
            {r.canDecide && (
              <div className="space-y-1.5">
                <label htmlFor="decision-comment" className="text-sm font-medium">{t("Comment")} <span className="text-xs text-muted-foreground">({t("required to reject")})</span></label>
                <Textarea id="decision-comment" rows={2} value={comment} onChange={(e) => { setComment(e.target.value); setError(null); }} maxLength={1000} />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive-strong">{error}</p>}
            <section aria-label={t("History")} className="border-t pt-3">
              <h3 className="mb-1 text-sm font-semibold">{t("History")}</h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {detail.data!.history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString()} · {t(h.action)}{h.by ? ` · ${h.by}` : ""}{h.details ? ` — ${h.details}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Close")}</Button>
          {r?.canDecide && (
            <>
              <Button variant="destructive" loading={reject.isPending} disabled={approve.isPending || comment.trim().length === 0} onClick={() => reject.mutate()}>{t("Reject")}</Button>
              <Button loading={approve.isPending} disabled={reject.isPending} onClick={() => approve.mutate()}>{t("Approve")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
