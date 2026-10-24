import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCsv } from "@/utils/csv";
import { parseCsv, rowsToRecords } from "@/utils/csvParse";

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  /** Shown in the downloadable template and as a hint. */
  example: string;
}

export type ParsedRow<T> = { ok: true; value: T } | { ok: false; error: string };

interface BulkImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateFileName: string;
  columns: ImportColumn[];
  /** Validates one CSV record. Cheap checks only; the server's own errors are reported per row on import. */
  parseRow: (record: Record<string, string>) => ParsedRow<T>;
  importRow: (value: T) => Promise<unknown>;
  /** Called once an import run has finished, even if some rows failed. */
  onFinished: () => void;
}

interface PreviewRow<T> {
  line: number;
  record: Record<string, string>;
  parsed: ParsedRow<T>;
}
interface Failure {
  line: number;
  record: Record<string, string>;
  error: string;
}

const MAX_ROWS = 1000;

/** Pick a CSV, check every row, then import the valid ones one by one. Rows that fail are listed and downloadable. */
export default function BulkImportDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  templateFileName,
  columns,
  parseRow,
  importRow,
  onFinished,
}: BulkImportDialogProps<T>) {
  const { t } = useTranslation("common");
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow<T>[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; failures: Failure[] } | null>(null);

  const valid = rows.filter((r) => r.parsed.ok);
  const invalid = rows.filter((r) => !r.parsed.ok);

  const reset = () => {
    setRows([]);
    setFileError(null);
    setFileName("");
    setProgress(0);
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
  };
  const close = (next: boolean) => {
    if (running) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const downloadTemplate = () => downloadCsv(templateFileName, columns.map((c) => c.label), [columns.map((c) => c.example)]);

  const onFile = async (file: File | undefined) => {
    setResult(null);
    setFileError(null);
    setRows([]);
    if (!file) return;
    setFileName(file.name);
    const { records, missing } = rowsToRecords(parseCsv(await file.text()), columns);
    const missingRequired = columns.filter((c) => c.required && missing.includes(c.label)).map((c) => c.label);
    if (missingRequired.length > 0)
      return setFileError(
        missingRequired.length > 1
          ? t("Missing columns: {{columns}}. Use the template for the right headings.", { columns: missingRequired.join(", ") })
          : t("Missing column: {{columns}}. Use the template for the right headings.", { columns: missingRequired.join(", ") }),
      );
    if (records.length === 0) return setFileError(t("The file has no data rows."));
    if (records.length > MAX_ROWS) return setFileError(t("Import up to {{max}} rows at a time; this file has {{count}}.", { max: MAX_ROWS, count: records.length }));
    // line = spreadsheet row number (header is line 1).
    setRows(records.map((record, i) => ({ line: i + 2, record, parsed: parseRow(record) })));
  };

  const run = async () => {
    setRunning(true);
    setProgress(0);
    const failures: Failure[] = invalid.map((r) => ({ line: r.line, record: r.record, error: r.parsed.ok ? "" : r.parsed.error }));
    let imported = 0;
    for (const [i, row] of valid.entries()) {
      try {
        if (row.parsed.ok) await importRow(row.parsed.value);
        imported++;
      } catch (err) {
        failures.push({ line: row.line, record: row.record, error: err instanceof Error ? err.message : t("Could not import this row") });
      }
      setProgress(i + 1);
    }
    failures.sort((a, b) => a.line - b.line);
    setResult({ imported, failures });
    setRunning(false);
    onFinished();
  };

  const downloadFailures = () =>
    result &&
    downloadCsv(`${templateFileName}-errors`, [...columns.map((c) => c.label), "Row", "Error"], result.failures.map((f) => [...columns.map((c) => f.record[c.key]), f.line, f.error]));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <p role="status" className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground">
              {result.imported === 1 ? t("Imported {{count}} row", { count: result.imported }) : t("Imported {{count}} rows", { count: result.imported })}
              {result.failures.length > 0 && <span className="text-muted-foreground">{t("; {{count}} could not be imported.", { count: result.failures.length })}</span>}
            </p>
            {result.failures.length > 0 && (
              <>
                <ul className="max-h-56 space-y-1 overflow-auto rounded-lg border border-border p-2 text-sm">
                  {result.failures.map((f) => (
                    <li key={f.line}>
                      <span className="font-medium text-foreground">{t("Row {{line}}:", { line: f.line })}</span> <span className="text-destructive-strong">{f.error}</span>
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="outline" size="sm" onClick={downloadFailures}>
                  <Download className="h-4 w-4" />
                  {t("Download failed rows")}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                {t("Download template")}
              </Button>
              <Button type="button" size="sm" onClick={() => fileInput.current?.click()} disabled={running}>
                <FileUp className="h-4 w-4" />
                {fileName ? t("Choose another file") : t("Choose CSV file")}
              </Button>
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" aria-label={t("CSV file")} onChange={(e) => void onFile(e.target.files?.[0])} />
              {fileName && <span className="truncate text-sm text-muted-foreground">{fileName}</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Columns: {{columns}}. * is required. Dates as yyyy-mm-dd or dd/mm/yyyy.", {
                columns: columns.map((c) => (c.required ? `${c.label}*` : c.label)).join(", "),
              })}
            </p>

            {fileError && (
              <p role="alert" className="text-sm text-destructive-strong">
                {fileError}
              </p>
            )}

            {rows.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="success">{t("{{count}} ready", { count: valid.length })}</Badge>
                  {invalid.length > 0 && <Badge variant="danger">{t("{{count}} with problems (skipped)", { count: invalid.length })}</Badge>}
                </div>
                {invalid.length > 0 && (
                  <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border border-border p-2 text-sm">
                    {invalid.map((r) => (
                      <li key={r.line}>
                        <span className="font-medium text-foreground">{t("Row {{line}}:", { line: r.line })}</span> <span className="text-destructive-strong">{r.parsed.ok ? "" : r.parsed.error}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {running && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {t("Importing {{progress}} of {{total}}…", { progress, total: valid.length })}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={running}>
            {result ? t("Close") : t("Cancel")}
          </Button>
          {!result && (
            <Button type="button" loading={running} disabled={valid.length === 0} onClick={() => void run()}>
              {valid.length > 0
                ? valid.length === 1
                  ? t("Import {{count}} row", { count: valid.length })
                  : t("Import {{count}} rows", { count: valid.length })
                : t("Import")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
