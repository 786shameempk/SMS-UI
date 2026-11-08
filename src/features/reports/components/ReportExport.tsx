import { useTranslation } from "react-i18next";
import { ExportMenu } from "@/components/ui/export-menu";
import { csvCell, fileSafe } from "@/utils/csv";
import { exportPdf } from "@/utils/pdfExport";
import { useTenantBranding } from "@/features/tenant/TenantProvider";

export interface ExportSection {
  title: string;
  headers: string[];
  rows: unknown[][];
}

/**
 * Download control for an analytics tab. Every table the tab draws as a chart goes in one file: CSV (opens in Excel, one titled block per
 * table) or a printable PDF (one titled table after another).
 */
export default function ReportExport({ title, sections }: { title: string; sections: ExportSection[] }) {
  const { t } = useTranslation("reports");
  const branding = useTenantBranding();
  const populated = sections.filter((s) => s.rows.length > 0);

  const csv = () => {
    const lines: string[] = [csvCell(title)];
    for (const s of populated) {
      lines.push("", csvCell(s.title), s.headers.map(csvCell).join(","), ...s.rows.map((r) => r.map(csvCell).join(",")));
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSafe(title)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pdf = () => {
    const [first, ...rest] = populated;
    return exportPdf({ title, subtitle: first.title, headers: first.headers, rows: first.rows, extraTables: rest, branding });
  };

  return (
    <div className="flex justify-end">
      <ExportMenu onCsv={csv} onPdf={pdf} disabled={populated.length === 0} label={t("Export")} />
    </div>
  );
}
