import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCell, isNumericColumn } from "../../library/format";
import { previewReport } from "../api";
import { sendableDefinition, toReportColumns } from "../definition";
import type { CustomReportDefinition, DatasetField, ReportService } from "../types";

/** A few real rows for the columns chosen so far, refreshed shortly after each change. */
export default function SamplePreview({ datasetKey, service, definition, fields, rows = 5 }: { datasetKey: string; service?: ReportService; definition: CustomReportDefinition; fields: DatasetField[]; rows?: number }) {
  const { t } = useTranslation("reports");
  const send = sendableDefinition(definition, fields);
  const key = JSON.stringify(send);
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    const handle = window.setTimeout(() => setSettled(key), 500);
    return () => window.clearTimeout(handle);
  }, [key]);

  // The request uses the debounced definition, so "is there anything to show" must be judged on that one too.
  const settledDefinition = JSON.parse(settled) as CustomReportDefinition;
  const ready = settledDefinition.columns.some((c) => c.visible) || settledDefinition.groupBy.length > 0;
  const hasContent = send.columns.some((c) => c.visible) || send.groupBy.length > 0;
  const query = useQuery({
    queryKey: ["custom-report-sample", service, datasetKey, settled],
    queryFn: ({ signal }) => previewReport(datasetKey, JSON.parse(settled) as CustomReportDefinition, 1, 10, signal, undefined, service),
    enabled: ready,
    staleTime: 30_000,
    retry: false,
  });

  if (!hasContent) return <p className="text-sm text-muted-foreground">{t("Pick columns to see a preview.")}</p>;
  if (!ready) return <Skeleton className="h-24 w-full" />;
  if (query.isError) return <p role="alert" className="text-sm text-destructive-strong">{query.error instanceof Error ? query.error.message : t("The preview could not be loaded.")}</p>;
  if (!query.data) return <Skeleton className="h-24 w-full" />;

  const columns = toReportColumns(query.data.columns);
  return (
    <div className="space-y-1">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow hover={false}>{columns.map((c) => <TableHead key={c.key} scope="col" className={isNumericColumn(c.type) ? "text-right" : undefined}>{c.label}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {query.data.rows.slice(0, rows).map((r, i) => (
              <TableRow key={i}>{columns.map((c) => <TableCell key={c.key} className={isNumericColumn(c.type) ? "text-right tabular-nums" : undefined}>{formatCell(r[c.key], c.type)}</TableCell>)}</TableRow>
            ))}
            {query.data.rows.length === 0 && <TableRow hover={false}><TableCell colSpan={columns.length} className="text-center text-muted-foreground">{t("No records yet.")}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{t("{{total}} matching records. Sample of the first {{n}}.", { total: query.data.total.toLocaleString(), n: Math.min(rows, query.data.rows.length) })}</p>
    </div>
  );
}
