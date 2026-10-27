import { ExportMenu } from "@/components/ui/export-menu";
import { exportPdf } from "@/utils/pdfExport";
import { downloadCsv } from "../utils";

/** Export for the Azure screens: the same rows (the first row is the header) as CSV or PDF. */
export default function AzureExport({ fileName, title, rows, disabled }: { fileName: string; title: string; rows: Array<Array<string | number | null | undefined>>; disabled?: boolean }) {
  return (
    <ExportMenu
      disabled={disabled}
      onCsv={() => downloadCsv(fileName, rows)}
      onPdf={() => exportPdf({ title, headers: (rows[0] ?? []).map(String), rows: rows.slice(1) })}
    />
  );
}
