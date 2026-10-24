import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadReportCsv, listReports, runReport } from "../api/ops";
import { errorText } from "../helpers";

const ISO = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsPage() {
  const reports = useQuery({ queryKey: ["office", "reports"], queryFn: listReports });
  const [key, setKey] = useState<string | null>(null);
  const [from, setFrom] = useState(() => ISO(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => ISO(new Date()));
  const selected = reports.data?.find((r) => r.key === (key ?? reports.data[0]?.key));
  const table = useQuery({
    queryKey: ["office", "report", selected?.key, selected?.usesDates ? from : "", selected?.usesDates ? to : ""],
    queryFn: () => runReport(selected!.key, selected!.usesDates ? { from, to } : {}),
    enabled: !!selected,
  });
  const csv = useMutation({
    mutationFn: async () => {
      const blob = await downloadReportCsv(selected!.key, selected!.usesDates ? { from, to } : {});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected!.key}-${ISO(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(errorText(e)),
  });

  return (
    <PageContainer>
      <PageHeader icon={BarChart3} title="Reports" description="Operational reports from the live data. Each can be downloaded as CSV." />
      {reports.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : reports.isError ? (
        <ErrorState onRetry={() => reports.refetch()} retrying={reports.isRefetching} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label="Reports" className="space-y-1">
            {reports.data!.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-current={r.key === selected?.key ? "true" : undefined}
                onClick={() => setKey(r.key)}
                className={`block w-full rounded-lg border px-3 py-2 text-start text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${r.key === selected?.key ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"}`}
              >
                <span className="font-medium">{r.title}</span>
                <span className="block text-xs text-muted-foreground">{r.description}</span>
              </button>
            ))}
          </nav>
          <section aria-label="Report" className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              {selected?.usesDates && (
                <>
                  <label className="space-y-1 text-sm"><span className="font-medium">From</span><Input type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
                  <label className="space-y-1 text-sm"><span className="font-medium">To</span><Input type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} /></label>
                </>
              )}
              <Button variant="outline" className="ms-auto" onClick={() => csv.mutate()} loading={csv.isPending} disabled={!table.data}><Download className="h-4 w-4" aria-hidden="true" />Download CSV</Button>
            </div>
            {table.isLoading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : table.isError ? (
              <ErrorState onRetry={() => table.refetch()} retrying={table.isRefetching} />
            ) : table.data!.rows.length === 0 ? (
              <EmptyState icon={BarChart3} title="Nothing to report" description="No rows match this report and period." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>{table.data!.columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.data!.rows.map((row, i) => (
                      <TableRow key={i}>{row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>
                    ))}
                    {table.data!.totals.length > 0 && (
                      <TableRow className="font-semibold">{table.data!.totals.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      )}
    </PageContainer>
  );
}
