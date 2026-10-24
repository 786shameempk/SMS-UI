import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormErrorBanner, Pager } from "../components/kit";
import { Field, ReasonDialog, StatusBadge } from "../components/salesKit";
import { getInvoice, issueCreditNote, listInvoices, recordPayment, voidInvoice } from "../api/sales";
import { day, errorText, money, useDebounced } from "../helpers";
import { useHasOfficePermission } from "../store";
import { PAYMENT_METHODS } from "../onboarding";
import { DocumentDialog } from "./QuotationDetailPage";
import type { Invoice } from "../salesTypes";

const STATUSES = ["Issued", "PartiallyPaid", "Paid", "Void", "overdue"];

export default function InvoicesPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const list = useQuery({ queryKey: ["office", "invoices", q, status, page], queryFn: () => listInvoices({ search: q, status, page, pageSize: 20 }), placeholderData: (prev) => prev });
  const openId = params.get("id");

  return (
    <PageContainer>
      <PageHeader icon={Receipt} title="Invoices" description="Issued invoices are never edited: a mistake is corrected with a credit note, or the invoice is voided." />
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search invoices" placeholder="Search number or school" className="w-64" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s.toLowerCase()}>{s === "overdue" ? "Overdue" : s.replace(/([a-z])([A-Z])/g, "$1 $2")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {list.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data!.items.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" description="Invoices are issued when a purchase is confirmed or a subscription renews." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Total</TableHead>
                  <TableHead className="text-end">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data!.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <button type="button" className="font-medium text-primary hover:underline" onClick={() => setParams({ id: i.id })}>{i.number}</button>
                      <p className="text-xs text-muted-foreground">{i.schoolName}</p>
                    </TableCell>
                    <TableCell>{i.kind}{i.label ? <span className="text-xs text-muted-foreground"> · {i.label}</span> : null}</TableCell>
                    <TableCell>{day(i.dueDate)}{i.overdue ? <span className="ms-1 text-xs text-destructive-strong">{i.daysOverdue}d late</span> : null}</TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-end tabular-nums">{money(i.total, i.currency)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(i.outstanding, i.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pager page={list.data!.pageNumber} totalPages={list.data!.totalPages} totalCount={list.data!.totalCount} onPage={setPage} noun="invoice" />
        </>
      )}
      {openId && <InvoiceDialog id={openId} onClose={() => setParams({})} />}
    </PageContainer>
  );
}

function InvoiceDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const canRecord = useHasOfficePermission("payments.record");
  const canManage = useHasOfficePermission("invoices.manage");
  const [mode, setMode] = useState<"view" | "pay" | "void" | "credit" | "print">("view");
  const [error, setError] = useState<string | null>(null);
  const inv = useQuery({ queryKey: ["office", "invoice", id], queryFn: () => getInvoice(id) });
  const after = (msg: string) => {
    toast.success(msg);
    setMode("view");
    setError(null);
    void qc.invalidateQueries({ queryKey: ["office"] });
  };
  const doVoid = useMutation({ mutationFn: (r: string) => voidInvoice(id, r), onSuccess: () => after("Invoice voided."), onError: (e) => setError(errorText(e)) });
  const doCredit = useMutation({ mutationFn: (v: { amount: number; reason: string }) => issueCreditNote(id, v.amount, v.reason), onSuccess: () => after("Credit note issued."), onError: (e) => setError(errorText(e)) });
  const x = inv.data;
  const open = !!x && (x.status === "Issued" || x.status === "PartiallyPaid");

  return (
    <>
      <Dialog open={mode === "view"} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{x ? `Invoice ${x.number}` : "Invoice"}</DialogTitle>
            <DialogDescription>{x ? `${x.schoolName} · due ${day(x.dueDate)}` : ""}</DialogDescription>
          </DialogHeader>
          {!x ? (
            inv.isError ? <ErrorState onRetry={() => inv.refetch()} retrying={inv.isRefetching} /> : <Skeleton className="h-48 rounded-lg" />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2"><StatusBadge status={x.status} />{x.overdue && <StatusBadge status="Failed">Overdue</StatusBadge>}<Link className="ms-auto text-primary hover:underline" to={`/office/schools/${x.schoolId}`}>Open school</Link></div>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {x.lines.map((l) => (<li key={l.description} className="flex justify-between px-3 py-1.5"><span>{l.description}</span><span className="tabular-nums">{money(l.amount, x.currency)}</span></li>))}
              </ul>
              <dl className="space-y-1">
                <Line label="Subtotal" value={money(x.subtotal, x.currency)} />
                <Line label="Tax" value={money(x.taxAmount, x.currency)} />
                <Line label="Total" value={money(x.total, x.currency)} strong />
                <Line label="Paid" value={money(x.amountPaid, x.currency)} />
                {x.amountCredited > 0 && <Line label="Credited" value={money(x.amountCredited, x.currency)} />}
                {x.pendingVerification > 0 && <Line label="Awaiting verification" value={money(x.pendingVerification, x.currency)} />}
                <Line label="Balance due" value={money(x.outstanding, x.currency)} strong />
              </dl>
              {x.voidReason && <p>Voided: {x.voidReason}</p>}
              {x.payments.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">Payments</p>
                  <ul className="space-y-1">
                    {x.payments.map((p) => (<li key={p.id} className="flex items-center justify-between gap-2"><span>{day(p.receivedOn)} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</span><span className="flex items-center gap-2"><StatusBadge status={p.status} /><span className="tabular-nums">{money(p.amount, p.currency)}</span></span></li>))}
                  </ul>
                </div>
              )}
              {x.creditNotes.length > 0 && <div><p className="mb-1 font-medium">Credit notes</p><ul>{x.creditNotes.map((c) => <li key={c.id}>{c.number} · {money(c.amount, x.currency)} · {c.reason}</li>)}</ul></div>}
            </div>
          )}
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={() => setMode("print")} disabled={!x}>Document</Button>
            {x && open && canRecord && <Button onClick={() => setMode("pay")}>Record payment</Button>}
            {x && canManage && x.amountPaid > 0 && x.status !== "Void" && <Button variant="outline" onClick={() => setMode("credit")}>Credit note</Button>}
            {x && open && canManage && x.amountPaid === 0 && <Button variant="ghost" onClick={() => setMode("void")}>Void</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {x && mode === "pay" && <PaymentDialog invoice={x} onClose={() => setMode("view")} onDone={() => after("Payment recorded. It counts once someone else verifies it.")} />}
      <ReasonDialog open={mode === "void"} title="Void invoice" description="A voided invoice stays on record but can no longer be paid." confirmLabel="Void invoice" destructive busy={doVoid.isPending} error={error} onClose={() => { setMode("view"); setError(null); }} onConfirm={(r) => doVoid.mutate(r)} />
      {x && mode === "credit" && <CreditDialog invoice={x} busy={doCredit.isPending} error={error} onClose={() => { setMode("view"); setError(null); }} onConfirm={(v) => doCredit.mutate(v)} />}
      {mode === "print" && x && <DocumentDialog path={`invoices/${id}/document`} title={`Invoice ${x.number}`} onClose={() => setMode("view")} />}
    </>
  );
}

const Line = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex justify-between ${strong ? "font-semibold" : ""}`}>
    <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
);

/** One idempotency key per open dialog: pressing the button twice, or a retried request, records the payment once. */
function PaymentDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const [key] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState(String(invoice.outstanding));
  const [method, setMethod] = useState("BankTransfer");
  const [reference, setReference] = useState("");
  const [received, setReceived] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pay = useMutation({
    mutationFn: () => recordPayment({ invoiceId: invoice.id, amount: Number(amount), method, reference: reference.trim() || null, receivedOn: received, notes: notes.trim() || null }, key),
    onSuccess: onDone,
    onError: (e) => setError(errorText(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !pay.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record a payment</DialogTitle><DialogDescription>{invoice.number} · balance {money(invoice.outstanding, invoice.currency)}. A different person must verify it before it counts.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount"><Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Received on"><Input type="date" value={received} onChange={(e) => setReceived(e.target.value)} /></Field>
          <Field label="Method">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger aria-label="Method"><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/([a-z])([A-Z])/g, "$1 $2")}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Reference (UTR, cheque no.)"><Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} /></Field>
        </div>
        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pay.isPending}>Cancel</Button>
          <Button onClick={() => { setError(null); pay.mutate(); }} loading={pay.isPending} disabled={!(Number(amount) > 0)}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditDialog({ invoice, busy, error, onClose, onConfirm }: { invoice: Invoice; busy: boolean; error: string | null; onClose: () => void; onConfirm: (v: { amount: number; reason: string }) => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Issue a credit note</DialogTitle><DialogDescription>Reduces what the school owes on {invoice.number}. The invoice itself is not changed.</DialogDescription></DialogHeader>
        <Field label="Amount"><Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onConfirm({ amount: Number(amount), reason: reason.trim() })} loading={busy} disabled={!(Number(amount) > 0) || !reason.trim()}>Issue credit note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
