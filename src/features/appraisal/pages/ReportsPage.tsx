import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Download, FileBarChart, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { listDepartments } from "@/features/academics/api";
import { cn } from "@/utils/cn";
import { downloadReportCsv, getReport, listCycles, listReportKeys } from "../api";
import { EMPLOYEE_CATEGORY_LABEL, NS, REPORT_LABEL, SelectField, categoryLabel, formatDateTime, saveBlob, toastApiError, useAppraisalAccess } from "../shared";
import type { ReportFilters } from "../types";

import { useTranslation } from "react-i18next";

const CUSTOM_COLUMNS = ["cycle", "employee", "employeeId", "category", "department", "status", "reviewsDone", "reviewsTotal", "overallScore", "scoreComplete", "finalizedAt", "stage"];
const COLUMN_LABEL: Record<string, string> = {
  cycle: "Cycle",
  employee: "Employee",
  employeeId: "Employee ID",
  category: "Category",
  department: "Department",
  status: "Status",
  reviewsDone: "Reviews done",
  reviewsTotal: "Reviews total",
  overallScore: "Overall score",
  scoreComplete: "Score complete",
  finalizedAt: "Finalized",
  stage: "Approval step",
};

/** The twelve appraisal reports: on screen, printable, and (with the Export right) downloadable as CSV. */
export default function ReportsPage() {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const [key, setKey] = useState("cycle-summary");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [columns, setColumns] = useState<string[]>(CUSTOM_COLUMNS.slice(0, 8));
  const [downloading, setDownloading] = useState(false);

  const keys = useQuery({ queryKey: ["appraisal", "report-keys"], queryFn: listReportKeys });
  const cycles = useQuery({ queryKey: ["appraisal", "cycles", "all"], queryFn: () => listCycles() });
  const departments = useQuery({ queryKey: ["appraisal", "ref", "departments"], queryFn: listDepartments, staleTime: 300_000 });
  const effective: ReportFilters = { ...filters, columns: key === "custom" ? columns.join(",") : undefined };
  const report = useQuery({ queryKey: ["appraisal", "report", key, effective], queryFn: () => getReport(key, effective) });

  const available = (keys.data?.length ? keys.data : Object.keys(REPORT_LABEL)).filter((k) => k in REPORT_LABEL);
  const set = (patch: Partial<ReportFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const download = async () => {
    setDownloading(true);
    try {
      saveBlob(await downloadReportCsv(key, effective), `appraisal-${key}.csv`);
      toast.success(t("Report downloaded"));
    } catch (e) {
      toastApiError(e);
    } finally {
      setDownloading(false);
    }
  };

  const r = report.data;
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <nav aria-label={t("Reports")} className="print:hidden">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {available.map((k) => (
            <li key={k} className="shrink-0">
              <button
                type="button"
                onClick={() => setKey(k)}
                aria-current={k === key ? "page" : undefined}
                className={cn("w-full rounded-md px-3 py-2 text-left text-sm", k === key ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted")}
              >
                {t(REPORT_LABEL[k])}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <SelectField aria-label={t("Appraisal cycle")} className="w-56" allLabel={t("All cycles")} value={filters.cycleId} onChange={(v) => set({ cycleId: v })} items={(cycles.data ?? []).filter((c) => c.status !== "Cancelled" && c.status !== "Draft").map((c) => ({ value: c.id, label: c.name }))} />
          <SelectField aria-label={t("Department")} className="w-48" allLabel={t("All departments")} value={filters.departmentId} onChange={(v) => set({ departmentId: v })} items={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} />
          <SelectField aria-label={t("Employee category")} className="w-48" allLabel={t("All categories")} value={filters.category} onChange={(v) => set({ category: v })} items={Object.keys(EMPLOYEE_CATEGORY_LABEL).map((c) => ({ value: c, label: t(categoryLabel(c)) }))} />
          <Input aria-label={t("From")} type="date" className="w-40" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} />
          <Input aria-label={t("To")} type="date" className="w-40" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} />
          <div className="ms-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!r}>
              <Printer className="h-4 w-4" /> {t("Print")}
            </Button>
            {access.canExport && (
              <Button size="sm" variant="outline" loading={downloading} disabled={!r || downloading} onClick={download}>
                <Download className="h-4 w-4" /> {t("Download CSV")}
              </Button>
            )}
          </div>
        </div>

        {key === "custom" && (
          <fieldset className="rounded-lg border border-border p-3 print:hidden">
            <legend className="px-1 text-xs font-medium text-muted-foreground">{t("Columns")}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {CUSTOM_COLUMNS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={columns.includes(c)} onChange={(e) => setColumns((cols) => (e.target.checked ? CUSTOM_COLUMNS.filter((x) => cols.includes(x) || x === c) : cols.filter((x) => x !== c)))} />
                  {t(COLUMN_LABEL[c])}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {report.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : report.isError || !r ? (
          <ErrorState onRetry={() => report.refetch()} retrying={report.isFetching} title={t("This report can't be shown")} description={t("You may not have access to it.")} />
        ) : (
          <Card className="print:border-0 print:shadow-none">
            <CardContent className="space-y-3 p-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{r.title}</h2>
                <p className="text-xs text-muted-foreground">{t("Generated {{date}}", { date: formatDateTime(r.generatedAt) })}</p>
              </header>
              {r.rows.length === 0 ? (
                <EmptyState icon={FileBarChart} title={t("Nothing to report")} description={t("No records match these filters.")} size="sm" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm print:text-xs">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        {r.columns.map((c) => (
                          <th key={c.key} className="py-2 pe-3 font-medium">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 print:break-inside-avoid">
                          {r.columns.map((c) => (
                            <td key={c.key} className="py-2 pe-3 align-top">
                              {row[c.key] === null || row[c.key] === undefined || row[c.key] === "" ? "—" : String(row[c.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {r.notes.length > 0 && (
                <ul className="list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">
                  {r.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
              <footer className="hidden border-t pt-2 text-xs text-muted-foreground print:block">{t("Confidential - appraisal records. Scores and comments appear only as far as your access allows.")}</footer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
