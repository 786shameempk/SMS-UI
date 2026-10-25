import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, MessageSquareWarning } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, FormErrorBanner, Pager } from "../components/kit";
import { ReasonDialog } from "../components/salesKit";
import { listSchools } from "../api/sales";
import {
  approveProfile, bulkApproveProfiles, profileQueue, requestProfileChanges, reviewProfile,
  type ProfileDecisionResult, type ProfileQueueItem, type ProfileStatus,
} from "../api/onboardingImport";
import { ago, dateTime, errorText, useDebounced } from "../helpers";
import { useHasOfficePermission } from "../store";

const STATUS_TONE: Record<ProfileStatus, BadgeVariant> = { Incomplete: "neutral", PendingApproval: "warning", ChangesRequested: "danger", Approved: "success" };
const STATUS_LABEL: Record<ProfileStatus, string> = { Incomplete: "Not submitted", PendingApproval: "Waiting for approval", ChangesRequested: "Changes requested", Approved: "Approved" };
const FILTERS: { value: string; label: string }[] = [
  { value: "PendingApproval", label: "Waiting" },
  { value: "ChangesRequested", label: "Changes requested" },
  { value: "Approved", label: "Approved" },
  { value: "Incomplete", label: "Not submitted" },
  { value: "all", label: "Everyone" },
];

export default function ProfileApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const schoolId = params.get("school");
  const schools = useQuery({ queryKey: ["office", "import-schools"], queryFn: () => listSchools({ pageSize: 200 }) });
  const provisioned = (schools.data?.items ?? []).filter((s) => s.tenantId);

  return (
    <PageContainer>
      <PageHeader icon={ClipboardCheck} title="Profile approvals" description="People the school imported complete their own details. Check what they changed, then approve or send it back with a reason." />
      <div className="max-w-md">
        <Select value={schoolId ?? ""} onValueChange={(v) => setParams({ school: v })}>
          <SelectTrigger aria-label="School">
            <SelectValue placeholder={schools.isLoading ? "Loading schools…" : "Choose a school"} />
          </SelectTrigger>
          <SelectContent>
            {provisioned.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.schoolName} ({s.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {schoolId ? <Queue key={schoolId} schoolId={schoolId} /> : <EmptyState title="Choose a school" description="Pick the school whose profiles you are reviewing." />}
    </PageContainer>
  );
}

function Queue({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const canApprove = useHasOfficePermission("onboarding.profiles.approve");
  const [status, setStatus] = useState("PendingApproval");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<ProfileDecisionResult[] | null>(null);
  const q = useDebounced(search);
  const queue = useQuery({ queryKey: ["office", "profile-queue", schoolId, status, q, page], queryFn: () => profileQueue(schoolId, { status, search: q, page, pageSize: 25 }), placeholderData: (prev) => prev });
  const refresh = () => qc.invalidateQueries({ queryKey: ["office", "profile-queue", schoolId] });
  const bulk = useMutation({
    mutationFn: () => bulkApproveProfiles(schoolId, [...picked]),
    onSuccess: (r) => { setBulkResults(r); setPicked(new Set()); setConfirmBulk(false); void refresh(); toast.success(`${r.filter((x) => x.outcome === "Approved").length} approved.`); },
    onError: (e) => { toast.error(errorText(e)); setConfirmBulk(false); },
  });

  const items = queue.data?.items ?? [];
  const selectable = items.filter((i) => i.status === "PendingApproval" && !i.hasProtectedChange);
  const counts = queue.data?.counts ?? {};
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <Button key={f.value} size="sm" variant={status === f.value ? "default" : "outline"} onClick={() => { setStatus(f.value); setPage(1); setPicked(new Set()); }}>
            {f.label}{f.value !== "all" && counts[f.value] ? ` (${counts[f.value]})` : ""}
          </Button>
        ))}
        <SearchInput value={search} onValueChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name" containerClassName="sm:ms-auto" />
      </div>

      {canApprove && selectable.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          <span>{picked.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setPicked(new Set(selectable.map((i) => i.profileId)))}>Select all without name or date-of-birth changes</Button>
          <Button size="sm" disabled={picked.size === 0} onClick={() => setConfirmBulk(true)}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Approve selected</Button>
        </div>
      )}

      {bulkResults && bulkResults.some((r) => r.outcome === "Skipped") && (
        <div role="status" className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
          <p className="font-medium">Not approved:</p>
          <ul className="list-disc ps-5">{bulkResults.filter((r) => r.outcome === "Skipped").map((r) => <li key={r.profileId}>{r.message}</li>)}</ul>
        </div>
      )}

      {queue.isLoading && <Skeleton className="h-40 w-full" />}
      {queue.isError && <ErrorState description={errorText(queue.error)} onRetry={() => void queue.refetch()} />}
      {queue.data && items.length === 0 && <EmptyState title="Nothing here" description="No profiles match this view." />}
      {items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {canApprove && <TableHead className="w-10"><span className="sr-only">Select</span></TableHead>}
                <TableHead>Person</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Changes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i: ProfileQueueItem) => (
                <TableRow key={i.profileId}>
                  {canApprove && (
                    <TableCell>
                      {i.status === "PendingApproval" && !i.hasProtectedChange && (
                        <input type="checkbox" aria-label={`Select ${i.name}`} checked={picked.has(i.profileId)} onChange={() => toggle(i.profileId)} />
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {i.name}
                    <div className="text-xs text-muted-foreground">{i.personType === "staff" ? "Staff" : "Student"} · {i.subtitle}</div>
                  </TableCell>
                  <TableCell><Badge variant={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge></TableCell>
                  <TableCell>{i.submittedAt ? ago(i.submittedAt) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.changeCount}
                    {i.hasProtectedChange && <Badge variant="warning" className="ms-2">Name / DOB</Badge>}
                  </TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setReviewing(i.profileId)}>Review</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={queue.data!.page} totalPages={Math.max(1, Math.ceil(queue.data!.total / queue.data!.pageSize))} totalCount={queue.data!.total} onPage={setPage} noun="profile" />
        </>
      )}

      {reviewing && <ReviewDialog schoolId={schoolId} profileId={reviewing} onClose={() => setReviewing(null)} onDecided={() => { setReviewing(null); void refresh(); }} />}
      <ConfirmDialog open={confirmBulk} title={`Approve ${picked.size} profile(s)?`} confirmLabel="Approve" busy={bulk.isPending}
        description="Each approved profile becomes final until the person changes it again. Anything with a name or date-of-birth change is skipped." onConfirm={() => bulk.mutate()} onClose={() => setConfirmBulk(false)} />
    </div>
  );
}

function ReviewDialog({ schoolId, profileId, onClose, onDecided }: { schoolId: string; profileId: string; onClose: () => void; onDecided: () => void }) {
  const canApprove = useHasOfficePermission("onboarding.profiles.approve");
  const canRequest = useHasOfficePermission("onboarding.profiles.request-changes");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const review = useQuery({ queryKey: ["office", "profile-review", schoolId, profileId], queryFn: () => reviewProfile(schoolId, profileId) });
  const approve = useMutation({
    mutationFn: () => approveProfile(schoolId, profileId, review.data!.summary.version),
    onSuccess: () => { toast.success("Approved."); onDecided(); },
    onError: (e) => setError(errorText(e)),
  });
  const request = useMutation({
    mutationFn: (reason: string) => requestProfileChanges(schoolId, profileId, reason, review.data!.summary.version),
    onSuccess: () => { toast.success("Sent back for changes."); setAsking(false); onDecided(); },
    onError: (e) => setError(errorText(e)),
  });
  const s = review.data?.summary;
  const pending = s?.status === "PendingApproval";

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{s?.name ?? "Profile"}</DialogTitle>
            <DialogDescription>{s ? `${s.personType === "staff" ? "Staff" : "Student"} · ${s.subtitle}` : "Loading…"}</DialogDescription>
          </DialogHeader>
          {review.isLoading && <Skeleton className="h-40 w-full" />}
          {review.isError && <ErrorState description={errorText(review.error)} onRetry={() => void review.refetch()} />}
          {review.data && (
            <div className="space-y-5">
              <Badge variant={STATUS_TONE[review.data.summary.status]}>{STATUS_LABEL[review.data.summary.status]}</Badge>
              <section aria-labelledby="changes">
                <h3 id="changes" className="mb-2 text-sm font-semibold">What changed</h3>
                {review.data.changes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing differs from the import.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Field</TableHead><TableHead>Imported</TableHead><TableHead>Last approved</TableHead><TableHead>Now</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {review.data.changes.map((c) => (
                        <TableRow key={c.key}>
                          <TableCell>{c.label}{c.protected && <Badge variant="warning" className="ms-2">Protected</Badge>}</TableCell>
                          <TableCell>{c.imported ?? "—"}</TableCell>
                          <TableCell>{c.approved ?? "—"}</TableCell>
                          <TableCell className="font-medium">{c.current ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
              <section aria-labelledby="details">
                <h3 id="details" className="mb-2 text-sm font-semibold">All details</h3>
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {review.data.details.map((d) => (
                    <div key={d.label} className="flex justify-between gap-3 border-b py-1"><dt className="text-muted-foreground">{d.label}</dt><dd>{d.value ?? "—"}</dd></div>
                  ))}
                </dl>
              </section>
              <section aria-labelledby="history">
                <h3 id="history" className="mb-2 text-sm font-semibold">History</h3>
                <ol className="space-y-1 text-sm">
                  {review.data.history.map((h, i) => (
                    <li key={i}>
                      <span className="font-medium">{h.kind === "ChangesRequested" ? "Changes requested" : h.kind}</span> · {dateTime(h.at)}{h.by ? ` · ${h.by}` : ""}
                      {h.reason && <div className="text-muted-foreground">{h.reason}</div>}
                    </li>
                  ))}
                </ol>
              </section>
              <FormErrorBanner message={error} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {pending && canRequest && <Button variant="outline" onClick={() => { setError(null); setAsking(true); }}><MessageSquareWarning className="h-4 w-4" aria-hidden="true" />Request changes</Button>}
            {pending && canApprove && <Button onClick={() => { setError(null); approve.mutate(); }} loading={approve.isPending}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Approve</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReasonDialog open={asking} title="Request changes" description="The person sees this reason in their profile and can edit and resubmit." confirmLabel="Send back" label="What needs to change?"
        busy={request.isPending} error={error} onConfirm={(r) => request.mutate(r)} onClose={() => setAsking(false)} />
    </>
  );
}
