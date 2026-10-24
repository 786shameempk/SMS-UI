import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pager } from "../components/kit";
import { StatusBadge } from "../components/salesKit";
import { listQuotations } from "../api/sales";
import { day, money, useDebounced } from "../helpers";
import { useHasOfficePermission } from "../store";

const STATUSES = ["Draft", "Generated", "PendingApproval", "Approved", "Converted", "Rejected", "Cancelled", "Expired"];

export default function QuotationsPage() {
  const canCreate = useHasOfficePermission("quotations.manage");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const list = useQuery({ queryKey: ["office", "quotations", q, status, page], queryFn: () => listQuotations({ search: q, status, page, pageSize: 20 }), placeholderData: (prev) => prev });

  return (
    <PageContainer>
      <PageHeader
        icon={FileText}
        title="Quotations"
        description="Standard and custom quotations, from draft to approval."
        actions={canCreate && <Button asChild><Link to="/office/plan-builder"><Plus className="h-4 w-4" aria-hidden="true" />New quotation</Link></Button>}
      />
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search quotations" placeholder="Search number or school" className="w-64" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s.toLowerCase()}>{s.replace(/([a-z])([A-Z])/g, "$1 $2")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {list.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data!.items.length === 0 ? (
        <EmptyState icon={FileText} title="No quotations" description="Create one from the school's page or with New quotation." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Total</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Prepared by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data!.items.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>
                      <Link className="font-medium text-primary hover:underline" to={`/office/quotations/${x.id}`}>{x.number}</Link>
                      <p className="text-xs text-muted-foreground">{x.schoolName}</p>
                    </TableCell>
                    <TableCell>{x.planName} v{x.planVersion}</TableCell>
                    <TableCell>
                      <StatusBadge status={x.status} />
                      {x.requiresHighDiscountApproval && <span className="ms-1 text-xs text-warning-strong">{x.discountPercent.toFixed(0)}% off</span>}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{money(x.total, x.currency)}</TableCell>
                    <TableCell>{day(x.validUntil)}</TableCell>
                    <TableCell>{x.createdByName ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pager page={list.data!.pageNumber} totalPages={list.data!.totalPages} totalCount={list.data!.totalCount} onPage={setPage} noun="quotation" />
        </>
      )}
    </PageContainer>
  );
}
