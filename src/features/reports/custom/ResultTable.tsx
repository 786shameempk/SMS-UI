import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCell, isNumericColumn } from "../library/format";
import { toReportColumns } from "./definition";
import { CUSTOM_PAGE_SIZES, type CustomReportPage } from "./types";

interface Props {
  data: CustomReportPage | undefined;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onRetry?: () => void;
  /** Whether to show the totals strip and the record count (report setting). */
  showTotalCount?: boolean;
  locale?: string;
}

/** The server's page of a custom report: header, rows, totals over the whole result, and paging. Nothing is held beyond this one page. */
export default function ResultTable({ data, loading, error, page, pageSize, onPage, onPageSize, onRetry, showTotalCount = true, locale }: Props) {
  const { t } = useTranslation("reports");

  if (error) return <ErrorState title={t("This report could not be run")} description={error} onRetry={onRetry} />;
  if (!data) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label={t("Loading the report")}>
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  const columns = toReportColumns(data.columns);
  const first = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const last = Math.min(data.total, data.page * data.pageSize);
  const totals = data.summary.filter((s) => s.key !== "total" || showTotalCount);

  return (
    <div className="space-y-3" aria-busy={loading}>
      {totals.length > 0 && (
        <dl className="flex flex-wrap gap-2" aria-label={t("Totals for all matching records")}>
          {totals.map((s) => (
            <div key={s.key} className="min-w-28 rounded-lg border bg-card px-3 py-1.5">
              <dt className="text-xs text-muted-foreground">{s.key === "total" ? (data.grouped ? t("Records") : t("Matching records")) : s.label}</dt>
              <dd className="text-base font-semibold tabular-nums">{formatCell(s.value as never, s.type as never, locale) || "–"}</dd>
            </div>
          ))}
        </dl>
      )}

      {data.rows.length === 0 ? (
        <EmptyState title={t("No records match")} description={t("Nothing matches the filters you set. Loosen a filter, or check the date range and academic year.")} />
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <Table>
            <TableHeader>
              <TableRow hover={false}>
                {columns.map((c) => (
                  <TableHead key={c.key} className={isNumericColumn(c.type) ? "text-right" : undefined} scope="col">{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, i) => (
                <TableRow key={`${data.page}-${i}`}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={isNumericColumn(c.type) ? "text-right tabular-nums" : undefined}>{formatCell(row[c.key], c.type, locale)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {data.grouped
            ? t("Groups {{first}}–{{last}} of {{total}}", { first, last, total: data.total.toLocaleString() })
            : t("Records {{first}}–{{last}} of {{total}}", { first, last, total: data.total.toLocaleString() })}
        </p>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-28" aria-label={t("Rows per page")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {CUSTOM_PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{t("{{n}} per page", { n })}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon-sm" disabled={page <= 1 || loading} onClick={() => onPage(1)} aria-label={t("First page")}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon-sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} aria-label={t("Previous page")}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-1 tabular-nums">{t("Page {{page}} of {{pages}}", { page: data.page, pages: data.totalPages })}</span>
          <Button type="button" variant="outline" size="icon-sm" disabled={page >= data.totalPages || loading} onClick={() => onPage(page + 1)} aria-label={t("Next page")}><ChevronRight className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon-sm" disabled={page >= data.totalPages || loading} onClick={() => onPage(data.totalPages)} aria-label={t("Last page")}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
