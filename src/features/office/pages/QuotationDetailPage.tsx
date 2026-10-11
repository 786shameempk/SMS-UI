import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, Printer, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { BreakdownView } from "../components/BreakdownView";
import { FormErrorBanner } from "../components/kit";
import { QuotationForm } from "../components/QuotationForm";
import { Fact, ReasonDialog, StatusBadge } from "../components/salesKit";
import { confirmPurchase, fetchDocument, getQuotation, quotationAction, updateQuotation } from "../api/sales";
import { dateTime, day, errorText } from "../helpers";
import { useHasOfficePermission } from "../store";
import type { QuotationRequest } from "../salesTypes";

const DONE = { generate: "generated", submit: "submitted for approval", approve: "approved", reject: "rejected", cancel: "cancelled" } as const;

type Mode = "view" | "edit" | "approve" | "reject" | "cancel" | "purchase" | "document";

export default function QuotationDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("quotations.manage");
  const canPurchase = useHasOfficePermission("purchases.manage");
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const quote = useQuery({ queryKey: ["office", "quotation", id], queryFn: () => getQuotation(id) });
  const done = (msg: string) => {
    toast.success(msg);
    setMode("view");
    setError(null);
    void qc.invalidateQueries({ queryKey: ["office"] });
  };
  const fail = (e: unknown) => setError(errorText(e));

  const step = useMutation({ mutationFn: (v: { action: Parameters<typeof quotationAction>[1]; text?: string }) => quotationAction(id, v.action, v.text), onSuccess: (_q, v) => done(`Quotation ${DONE[v.action]}.`), onError: fail });
  const save = useMutation({ mutationFn: (r: QuotationRequest) => updateQuotation(id, r), onSuccess: () => done("Draft updated."), onError: fail });
  const purchase = useMutation({ mutationFn: (notes: string | null) => confirmPurchase(id, notes), onSuccess: (p) => { toast.success("Purchase confirmed and invoiced."); navigate(`/office/purchases?id=${p.id}`); }, onError: fail });

  if (quote.isLoading) return <PageContainer><Skeleton className="h-64 rounded-xl" /></PageContainer>;
  if (quote.isError || !quote.data) return <PageContainer><ErrorState onRetry={() => quote.refetch()} retrying={quote.isRefetching} /></PageContainer>;
  const q = quote.data;
  const close = () => { setMode("view"); setError(null); };

  return (
    <PageContainer>
      <Link to="/office/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All quotations
      </Link>
      <PageHeader
        icon={FileText}
        title={q.number}
        description={`${q.schoolName} · ${q.planName} v${q.planVersion}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {q.breakdown && <Button variant="outline" onClick={() => setMode("document")}><Printer className="h-4 w-4" aria-hidden="true" />Document</Button>}
            {canManage && q.status === "Draft" && <Button variant="outline" onClick={() => setMode(mode === "edit" ? "view" : "edit")}>{mode === "edit" ? "Stop editing" : "Edit"}</Button>}
            {canManage && q.status === "Draft" && <Button onClick={() => step.mutate({ action: "generate" })} loading={step.isPending}>Generate</Button>}
            {canManage && q.status === "Generated" && <Button onClick={() => step.mutate({ action: "submit" })} loading={step.isPending}><Send className="h-4 w-4" aria-hidden="true" />Submit for approval</Button>}
            {q.status === "PendingApproval" && q.canApprove && (
              <>
                <Button onClick={() => setMode("approve")}><Check className="h-4 w-4" aria-hidden="true" />Approve</Button>
                <Button variant="outline" onClick={() => setMode("reject")}><X className="h-4 w-4" aria-hidden="true" />Reject</Button>
              </>
            )}
            {canPurchase && q.status === "Approved" && !q.purchaseExists && <Button onClick={() => setMode("purchase")}>Confirm purchase</Button>}
            {canManage && ["Draft", "Generated", "PendingApproval", "Approved"].includes(q.status) && !q.purchaseExists && <Button variant="ghost" onClick={() => setMode("cancel")}>Cancel quotation</Button>}
          </div>
        }
      />
      <FormErrorBanner message={mode === "view" ? error : null} />

      {mode === "edit" ? (
        <QuotationForm
          initial={{ schoolId: q.schoolId, planId: q.planId, ...q.input, validUntil: q.validUntil, internalNotes: q.internalNotes, customerTerms: q.customerTerms }}
          lockSchool
          submitLabel="Save changes"
          busy={save.isPending}
          error={error}
          onSubmit={(r) => { setError(null); save.mutate(r); }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="space-y-4">
            <dl className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
              <Fact label="Status"><StatusBadge status={q.status} /></Fact>
              <Fact label="Valid until">{day(q.validUntil)}</Fact>
              <Fact label="Prepared by">{q.createdByName} · {dateTime(q.createdAt)}</Fact>
              <Fact label="Decision">{q.decidedByName ? `${q.decidedByName} · ${dateTime(q.decidedAt!)}` : "Not decided"}</Fact>
              <Fact label="Term">{q.input.contractMonths} months · {q.input.students} students · {q.input.branches} branch{q.input.branches === 1 ? "" : "es"}</Fact>
              <Fact label="Add-ons">{q.input.addons.length ? q.input.addons.map((a) => a.code).join(", ") : "None"}</Fact>
              {q.decisionNote && <Fact label="Decision note">{q.decisionNote}</Fact>}
              {q.requiresHighDiscountApproval && <Fact label="Approval"><StatusBadge status="High">High discount: needs a senior approver</StatusBadge></Fact>}
            </dl>
            {q.customerTerms && <div className="rounded-xl border border-border bg-card p-4 text-sm"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Terms shown to the school</p><p className="whitespace-pre-wrap">{q.customerTerms}</p></div>}
            {q.internalNotes && <div className="rounded-xl border border-dashed border-border p-4 text-sm"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal notes</p><p className="whitespace-pre-wrap">{q.internalNotes}</p></div>}
          </div>
          <aside aria-label="Price breakdown" className="h-fit rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">{q.status === "Draft" ? "Draft price (generate to freeze it)" : "Frozen price"}</h2>
            {q.breakdown ? <BreakdownView breakdown={q.breakdown} /> : <p className="text-sm text-muted-foreground">Not priced yet. Generate the quotation to calculate and freeze the price.</p>}
          </aside>
        </div>
      )}

      <ReasonDialog open={mode === "reject"} title="Reject quotation" description="The preparer is told why, and can prepare a new one." confirmLabel="Reject" destructive busy={step.isPending} error={error} onClose={close} onConfirm={(r) => step.mutate({ action: "reject", text: r })} />
      <ReasonDialog open={mode === "cancel"} title="Cancel quotation" description="A cancelled quotation cannot be used for a purchase." confirmLabel="Cancel quotation" label="Why is it cancelled?" destructive busy={step.isPending} error={error} onClose={close} onConfirm={(r) => step.mutate({ action: "cancel", text: r })} />
      {mode === "approve" && <NoteDialog title="Approve quotation" confirm="Approve" busy={step.isPending} error={error} onClose={close} onConfirm={(n) => step.mutate({ action: "approve", text: n })} description="You cannot approve a quotation you prepared. Approving freezes it for purchase." />}
      {mode === "purchase" && <NoteDialog title="Confirm purchase" confirm="Confirm purchase" busy={purchase.isPending} error={error} onClose={close} onConfirm={(n) => purchase.mutate(n || null)} description="Creates the purchase and issues its invoices at the frozen price. The school's workspace is created once payment is verified." />}
      {mode === "document" && <DocumentDialog path={`quotations/${id}/document`} title={`Quotation ${q.number}`} onClose={close} />}
    </PageContainer>
  );
}

function NoteDialog({ title, description, confirm, busy, error, onClose, onConfirm }: { title: string; description: string; confirm: string; busy: boolean; error: string | null; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <Textarea aria-label="Note (optional)" placeholder="Note (optional)" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onConfirm(note.trim())} loading={busy}>{confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shows a server-rendered document in a sandboxed frame (no scripts), with a button to open it for printing. */
export function DocumentDialog({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const doc = useQuery({ queryKey: ["office", "document", path], queryFn: () => fetchDocument(path) });
  const print = () => {
    if (!doc.data) return;
    const url = URL.createObjectURL(new Blob([doc.data], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>A print-ready copy for the school.</DialogDescription></DialogHeader>
        {doc.isLoading ? <Skeleton className="h-96 rounded-lg" /> : doc.isError ? <ErrorState onRetry={() => doc.refetch()} retrying={doc.isRefetching} /> : <iframe title={title} sandbox="" srcDoc={doc.data} className="h-[60vh] w-full rounded-lg border border-border bg-white" />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={print} disabled={!doc.data}><Printer className="h-4 w-4" aria-hidden="true" />Open to print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
