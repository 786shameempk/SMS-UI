import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import axios from "axios";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { useAuthStore } from "@/store/authStore";
import { printReport } from "../library/printReport";
import type { ReportSummaryItem } from "../library/types";
import { downloadCustomExport, fetchPrintRows, type CustomExportFormat } from "./api";
import { describeFilters, toReportColumns } from "./definition";
import type { CustomReportDefinition, CustomReportPage, DatasetField, ReportService } from "./types";

type Source = { kind: "draft"; datasetKey: string; definition: CustomReportDefinition; service?: ReportService; recordId?: string } | { kind: "saved"; id: string };

interface Props {
  source: Source;
  title: string;
  definition: CustomReportDefinition;
  fields: DatasetField[];
  yearName?: string | null;
  canExport: boolean;
  canPrint: boolean;
  /** One page of the report in print mode (the server checks the print permission). */
  fetchPage: (page: number, pageSize: number) => Promise<CustomReportPage>;
  disabled?: boolean;
}

/**
 * Export (CSV, Excel), PDF and Print for a custom report. CSV and Excel are built on the server from every matching row,
 * streamed so a large report never fills the browser; PDF and Print open the report's print layout, which is limited to a
 * size a browser can hold (larger reports are pointed to CSV or Excel).
 */
export default function OutputActions({ source, title, definition, fields, yearName, canExport, canPrint, fetchPage, disabled }: Props) {
  const { t } = useTranslation("reports");
  const branding = useTenantBranding();
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState<{ title: string; loaded: number; total: number } | null>(null);
  const abort = useRef<AbortController | null>(null);

  const cancel = () => abort.current?.abort();

  async function exportFile(format: CustomExportFormat) {
    abort.current = new AbortController();
    setBusy({ title: format === "xlsx" ? t("Preparing the Excel file") : t("Preparing the CSV file"), loaded: 0, total: 0 });
    try {
      const name = await downloadCustomExport(source, format, abort.current.signal);
      toast.success(t("Saved {{name}}", { name }));
    } catch (err) {
      if (!axios.isCancel(err)) toast.error(err instanceof Error ? err.message : t("The export failed."));
    } finally {
      setBusy(null);
    }
  }

  async function print(kind: "print" | "pdf") {
    abort.current = new AbortController();
    setBusy({ title: kind === "pdf" ? t("Preparing the PDF") : t("Preparing the printout"), loaded: 0, total: 0 });
    try {
      const { first, rows } = await fetchPrintRows(fetchPage, (loaded, total) => setBusy((b) => (b ? { ...b, loaded, total } : b)));
      const settings = definition.settings;
      const opened = printReport({
        descriptor: { title: title || t("Custom report"), columns: toReportColumns(first.columns), orientation: settings.orientation, sensitive: fields.some((f) => f.sensitive && (definition.columns.some((c) => c.field === f.key) || definition.groupBy.includes(f.key))) },
        rows,
        summary: first.summary
          .filter((s) => s.key !== "total")
          .map((s) => ({ ...s, value: typeof s.value === "boolean" ? (s.value ? "Yes" : "No") : s.value, type: s.type as ReportSummaryItem["type"] })),
        filterLines: describeFilters(definition, fields, yearName),
        scopeLabel: settings.showTotalCount ? `${first.total.toLocaleString()}` : t("All matching"),
        branding: branding ? { ...branding, logoUrl: settings.logoUrl === "school" ? branding.logoUrl : undefined } : undefined,
        generatedBy: user?.name,
        layout: {
          pageSize: settings.pageSize,
          description: settings.description || undefined,
          header: settings.header || undefined,
          footer: settings.footer || undefined,
          showGeneratedAt: settings.showGeneratedAt,
          showPageNumbers: settings.showPageNumbers,
        },
      });
      if (!opened) toast.error(t("Allow pop-ups for this site to open the printout."));
    } catch (err) {
      if (!axios.isCancel(err)) toast.error(err instanceof Error ? err.message : t("The printout could not be prepared."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={disabled}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void exportFile("xlsx")}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {t("Excel (.xlsx)")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportFile("csv")}>
                <FileText className="h-4 w-4" aria-hidden="true" />
                {t("CSV (raw data)")}
              </DropdownMenuItem>
              {canPrint && (
                <DropdownMenuItem onSelect={() => void print("pdf")}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t("PDF (choose Save as PDF)")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canPrint && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void print("print")}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            {t("Print")}
          </Button>
        )}
      </div>

      <Dialog open={busy !== null} onOpenChange={(open) => !open && cancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{busy?.title}</DialogTitle>
            <DialogDescription>
              {busy && busy.total > 0 ? t("{{loaded}} of {{total}} records", { loaded: busy.loaded.toLocaleString(), total: busy.total.toLocaleString() }) : t("This can take a moment for a large report.")}
            </DialogDescription>
          </DialogHeader>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={busy && busy.total > 0 ? Math.round((busy.loaded / busy.total) * 100) : undefined} className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${busy && busy.total > 0 ? Math.min(100, Math.round((busy.loaded / busy.total) * 100)) : 8}%` }} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancel}>{t("Cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
