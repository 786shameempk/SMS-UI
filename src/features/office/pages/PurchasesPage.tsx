import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pager } from "../components/kit";
import { ReasonDialog, StatusBadge } from "../components/salesKit";
import { approveCredit, cancelPurchase, listPurchases } from "../api/sales";
import { dateTime, day, errorText, money } from "../helpers";
import { useHasOfficePermission } from "../store";
import type { Purchase } from "../salesTypes";

const STATUSES = ["AwaitingPayment", "Ready", "Fulfilled", "Cancelled"];

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const focus = params.get("id");
  const canManage = useHasOfficePermission("purchases.manage");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ kind: "credit" | "cancel"; purchase: Purchase } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["office", "purchases", status, page], queryFn: () => listPurchases({ status, page, pageSize: 20 }), placeholderData: (prev) => prev });
  const run = useMutation({
    mutationFn: (reason: string) => (action!.kind === "credit" ? approveCredit(action!.purchase.id, reason) : cancelPurchase(action!.purchase.id, reason)),
    onSuccess: () => {
      toast.success(action!.kind === "credit" ? "Credit approved." : "Purchase cancelled.");
      setAction(null);
      void qc.invalidateQueries({ queryKey: ["office"] });
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <PageContainer>
      <PageHeader icon={ClipboardList} title="Purchases" description="Confirmed orders, their invoices, and whether the school can be set up yet." />
      <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
        <SelectTrigger className="w-52" aria-label="Filter by status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any status</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s} value={s.toLowerCase()}>{s.replace(/([a-z])([A-Z])/g, "$1 $2")}</SelectItem>)}
        </SelectContent>
      </Select>

      {list.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data!.items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No purchases" description="A purchase is created by confirming an approved quotation." />
      ) : (
        <>
          <div className="space-y-3">
            {list.data!.items.map((p) => (
              <article key={p.id} className={`rounded-xl border bg-card p-4 ${p.id === focus ? "border-primary" : "border-border"}`} aria-label={`Purchase for ${p.schoolName}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Link className="font-medium text-primary hover:underline" to={`/office/schools/${p.schoolId}`}>{p.schoolName}</Link>
                  <StatusBadge status={p.status} />
                  <Link className="text-sm text-muted-foreground hover:underline" to={`/office/quotations/${p.quotationId}`}>{p.quotationNumber}</Link>
                  <span className="ms-auto text-sm tabular-nums">{money(p.paid, p.currency)} of {money(p.totalAmount, p.currency)} paid</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirmed by {p.confirmedByName} · {dateTime(p.confirmedAt)} · set-up rule: {p.activationRule}
                  {p.paymentRuleMet ? " (met)" : " (not yet met)"}
                </p>
                {p.creditApprovedByName && <p className="mt-1 text-xs">Credit approved by {p.creditApprovedByName}: {p.creditReason}</p>}
                {p.cancelReason && <p className="mt-1 text-xs">Cancelled: {p.cancelReason}</p>}
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-end">Total</TableHead>
                      <TableHead className="text-end">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.invoices.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell><Link className="text-primary hover:underline" to={`/office/invoices?id=${i.id}`}>{i.number}</Link>{i.label ? <span className="text-xs text-muted-foreground"> · {i.label}</span> : null}</TableCell>
                        <TableCell>{day(i.dueDate)}{i.overdue ? <span className="ms-1 text-xs text-destructive-strong">{i.daysOverdue}d late</span> : null}</TableCell>
                        <TableCell><StatusBadge status={i.status} /></TableCell>
                        <TableCell className="text-end tabular-nums">{money(i.total, i.currency)}</TableCell>
                        <TableCell className="text-end tabular-nums">{money(i.outstanding, i.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {canManage && p.status === "AwaitingPayment" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!p.creditApprovedAt && <Button size="sm" variant="outline" onClick={() => setAction({ kind: "credit", purchase: p })}>Approve on credit</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setAction({ kind: "cancel", purchase: p })}>Cancel purchase</Button>
                  </div>
                )}
              </article>
            ))}
          </div>
          <Pager page={list.data!.pageNumber} totalPages={list.data!.totalPages} totalCount={list.data!.totalCount} onPage={setPage} noun="purchase" />
        </>
      )}
      <ReasonDialog
        open={!!action}
        title={action?.kind === "credit" ? "Approve on credit" : "Cancel purchase"}
        description={action?.kind === "credit" ? "Lets the school be set up before payment. Someone other than the person who confirmed the purchase must approve it." : "Unpaid invoices of this purchase are voided. Money already received is not touched."}
        confirmLabel={action?.kind === "credit" ? "Approve credit" : "Cancel purchase"}
        destructive={action?.kind === "cancel"}
        busy={run.isPending}
        error={error}
        onClose={() => { setAction(null); setError(null); }}
        onConfirm={(r) => { setError(null); run.mutate(r); }}
      />
    </PageContainer>
  );
}
