import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pager } from "../components/kit";
import { StatusBadge } from "../components/salesKit";
import { listSubscriptions } from "../api/sales";
import { day, money, useDebounced } from "../helpers";

const STATUSES = ["Pending", "Trial", "Active", "PaymentOverdue", "RenewalPending", "Expired", "Suspended", "Cancelled"];

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expiring, setExpiring] = useState("all");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const list = useQuery({
    queryKey: ["office", "subscriptions", q, status, expiring, page],
    queryFn: () => listSubscriptions({ search: q, status, expiringWithinDays: expiring === "all" ? undefined : Number(expiring), page, pageSize: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <PageContainer>
      <PageHeader icon={BadgeCheck} title="Subscriptions" description="What each school has bought, how long it runs, and whether it is in good standing." />
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search subscriptions" placeholder="Search school" className="w-64" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-48" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s.toLowerCase()}>{s.replace(/([a-z])([A-Z])/g, "$1 $2")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={expiring} onValueChange={(v) => { setExpiring(v); setPage(1); }}>
          <SelectTrigger className="w-48" aria-label="Filter by expiry"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any end date</SelectItem>
            <SelectItem value="30">Ends within 30 days</SelectItem>
            <SelectItem value="60">Ends within 60 days</SelectItem>
            <SelectItem value="90">Ends within 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data!.items.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="No subscriptions" description="A subscription is created when a school's first payment is verified." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Renews at</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data!.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link className="font-medium text-primary hover:underline" to={`/office/subscriptions/${s.id}`}>{s.schoolName}</Link>
                      <p className="text-xs text-muted-foreground">{s.maxStudents} students · {s.maxBranches} branch{s.maxBranches === 1 ? "" : "es"}</p>
                    </TableCell>
                    <TableCell>{s.planName} v{s.planVersion}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>{day(s.endDate)}<p className={`text-xs ${s.daysLeft < 0 ? "text-destructive-strong" : "text-muted-foreground"}`}>{s.daysLeft < 0 ? `${-s.daysLeft} days ago` : `${s.daysLeft} days left`}</p></TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.renewalAmount, s.currency)}{s.autoRenew ? <p className="text-xs text-muted-foreground">auto-renews</p> : null}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.overdueAmount > 0 ? <span className="text-destructive-strong">{money(s.overdueAmount, s.currency)}</span> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pager page={list.data!.pageNumber} totalPages={list.data!.totalPages} totalCount={list.data!.totalCount} onPage={setPage} noun="subscription" />
        </>
      )}
    </PageContainer>
  );
}
