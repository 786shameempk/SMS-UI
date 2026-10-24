import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pager } from "../components/kit";
import { ReasonDialog, StatusBadge } from "../components/salesKit";
import { listInvoices, listPayments, rejectPayment, verifyPayment } from "../api/sales";
import { ago, day, errorText, money } from "../helpers";
import { useHasOfficePermission } from "../store";
import type { Payment } from "../salesTypes";

/** Payments waiting to be checked against the bank, and the money still owed. */
export default function BillingPage() {
  const qc = useQueryClient();
  const canVerify = useHasOfficePermission("payments.verify");
  const [status, setStatus] = useState("pendingverification");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const payments = useQuery({ queryKey: ["office", "payments", status, page], queryFn: () => listPayments({ status, page, pageSize: 20 }), placeholderData: (prev) => prev });
  const overdue = useQuery({ queryKey: ["office", "invoices", "overdue-summary"], queryFn: () => listInvoices({ status: "overdue", pageSize: 5 }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["office"] });
  const verify = useMutation({ mutationFn: (id: string) => verifyPayment(id), onSuccess: () => { toast.success("Payment verified."); void refresh(); }, onError: (e) => toast.error(errorText(e)) });
  const reject = useMutation({
    mutationFn: (reason: string) => rejectPayment(rejecting!.id, reason),
    onSuccess: () => { toast.success("Payment rejected."); setRejecting(null); void refresh(); },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <PageContainer>
      <PageHeader icon={Wallet} title="Billing & payments" description="A payment counts only after a different person has checked it against the bank statement." />
      {overdue.data && overdue.data.totalCount > 0 && (
        <div role="status" className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
          <p className="font-medium">{overdue.data.totalCount} overdue invoice{overdue.data.totalCount === 1 ? "" : "s"}</p>
          <ul className="mt-1 space-y-0.5">
            {overdue.data.items.map((i) => (
              <li key={i.id}><Link className="text-primary hover:underline" to={`/office/invoices?id=${i.id}`}>{i.number}</Link> · {i.schoolName} · {money(i.outstanding, i.currency)} · {i.daysOverdue} days late</li>
            ))}
          </ul>
        </div>
      )}
      <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
        <SelectTrigger className="w-52" aria-label="Filter by status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pendingverification">Awaiting verification</SelectItem>
          <SelectItem value="verified">Verified</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="all">All payments</SelectItem>
        </SelectContent>
      </Select>

      {payments.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : payments.isError ? (
        <ErrorState onRetry={() => payments.refetch()} retrying={payments.isRefetching} />
      ) : payments.data!.items.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments here" description={status === "pendingverification" ? "Nothing is waiting for verification." : "No payments match."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                  <TableHead className="w-48" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.data!.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link className="font-medium text-primary hover:underline" to={`/office/invoices?id=${p.invoiceId}`}>{p.invoiceNumber}</Link>
                      <p className="text-xs text-muted-foreground">{p.schoolName}</p>
                    </TableCell>
                    <TableCell>{day(p.receivedOn)}<p className="text-xs text-muted-foreground">{p.method}{p.reference ? ` · ${p.reference}` : ""}</p></TableCell>
                    <TableCell>{p.recordedByName ?? "Gateway"}<p className="text-xs text-muted-foreground">{ago(p.recordedAt)}</p></TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                      {p.verifiedByName && <p className="text-xs text-muted-foreground">by {p.verifiedByName}</p>}
                      {p.rejectionReason && <p className="text-xs text-muted-foreground">{p.rejectionReason}</p>}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{money(p.amount, p.currency)}</TableCell>
                    <TableCell className="text-end">
                      {p.status === "PendingVerification" && canVerify && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => verify.mutate(p.id)} loading={verify.isPending && verify.variables === p.id} disabled={!p.canVerify} title={p.canVerify ? undefined : "You recorded this payment, so someone else must verify it."}>Verify</Button>
                          <Button size="sm" variant="outline" onClick={() => setRejecting(p)}>Reject</Button>
                        </div>
                      )}
                      {p.status === "PendingVerification" && !p.canVerify && canVerify && <p className="mt-1 text-xs text-muted-foreground">Recorded by you</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pager page={payments.data!.pageNumber} totalPages={payments.data!.totalPages} totalCount={payments.data!.totalCount} onPage={setPage} noun="payment" />
        </>
      )}
      <ReasonDialog open={!!rejecting} title="Reject payment" description="Use this when the money is not on the bank statement. The recorder is told why." confirmLabel="Reject payment" destructive busy={reject.isPending} error={error} onClose={() => { setRejecting(null); setError(null); }} onConfirm={(r) => { setError(null); reject.mutate(r); }} />
    </PageContainer>
  );
}
