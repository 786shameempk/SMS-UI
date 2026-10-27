import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExportMenu } from "@/components/ui/export-menu";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { exportPdf } from "@/utils/pdfExport";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv, fileSafe } from "@/utils/csv";
import { cn } from "@/utils/cn";
import { getMonthlyStudentSummary } from "../../api";
import { statusToggleActiveClass } from "../../constants";
import PrintRegisterButton from "./PrintRegisterButton";
import { STATUS_CODE, daysInMonth, isSunday, monthlyRegisterCsv, weekdayLetter } from "./monthlyRegister";

/**
 * One class and section's month as a register: a row per student with the roll number, a column per date (with its weekday) holding P, A, L, H or V,
 * and the month's totals at the end. Sundays are shaded; a day nobody marked stays blank. Can be downloaded as a sheet or printed.
 */
export default function MonthlyRegisterGrid({ sectionId, label, year, month, studentCount }: { sectionId: string; label: string; year: number; month: number; studentCount?: number }) {
  const { t } = useTranslation("attendance");
  const monthIndex = month - 1;
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["attendance", "report-monthly", sectionId, `${year}-${month}`],
    queryFn: () => getMonthlyStudentSummary(sectionId, year, monthIndex),
    enabled: Boolean(sectionId),
  });
  const days = Array.from({ length: daysInMonth(year, monthIndex) }, (_, i) => i + 1);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const period = new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const branding = useTenantBranding();
  const download = () => {
    const { headers, lines } = monthlyRegisterCsv(rows, year, monthIndex);
    downloadCsv(`attendance-${fileSafe(label)}-${monthKey}`, headers, lines);
  };
  /** The register as a landscape PDF: roll, name, one narrow column per date, then the totals. */
  const downloadPdf = () => {
    const { headers, lines } = monthlyRegisterCsv(rows, year, monthIndex);
    const dayHeaders = headers.map((h, i) => (i >= 2 && i < 2 + days.length ? String(days[i - 2]) : h));
    return exportPdf({ title: `Student attendance register - ${label}`, subtitle: period, headers: dayHeaders, rows: lines, orientation: "landscape", branding });
  };

  return (
    <section aria-label={label} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">
          {label} <span className="text-sm font-normal text-muted-foreground">· {period}{studentCount !== undefined ? ` · ${t("{{count}} students", { count: studentCount })}` : ""}</span>
        </h3>
        <div className="flex items-center gap-2">
          <ExportMenu label={t("Download")} onCsv={download} onPdf={downloadPdf} disabled={rows.length === 0} />
          <PrintRegisterButton
            sectionId={sectionId}
            classLabel={label}
            dateFrom={`${monthKey}-01`}
            dateTo={`${monthKey}-${String(days.length).padStart(2, "0")}`}
            period={period}
            title="Student attendance register - monthly"
          />
        </div>
      </div>
      {isLoading && <Skeleton className="h-32 w-full" />}
      {isError && (
        <p role="alert" className="text-sm text-destructive-strong">
          {t("This register could not be loaded.")}{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>{t("Try again")}</button>
        </p>
      )}
      {!isLoading && !isError && (
        <Table stickyHeader containerClassName="rounded-xl border border-border">
          <TableHeader>
            <TableRow hover={false}>
              <TableHead className="sticky start-0 bg-muted">{t("Student")}</TableHead>
              {days.map((d) => (
                <TableHead key={d} className={cn("w-7 px-1 text-center leading-tight", isSunday(year, monthIndex, d) && "bg-muted-foreground/10")}>
                  <span className="block">{d}</span>
                  <span className="block text-[10px] font-normal text-muted-foreground">{weekdayLetter(year, monthIndex, d)}</span>
                </TableHead>
              ))}
              <TableHead className="text-center">{t("P")}</TableHead>
              <TableHead className="text-center">{t("A")}</TableHead>
              <TableHead className="text-center">{t("L")}</TableHead>
              <TableHead className="text-end">{t("% Present")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rows.length && (
              <TableRow hover={false}>
                <TableCell colSpan={days.length + 4} className="py-6 text-center text-muted-foreground">
                  {t("No records for this section / month.")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.studentId}>
                <TableCell className="sticky start-0 whitespace-nowrap bg-card">
                  <p className="text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{t("Roll {{rollNumber}}", { rollNumber: row.rollNumber })}</p>
                </TableCell>
                {days.map((d) => {
                  const status = row.statusByDay[d];
                  return (
                    <TableCell key={d} className={cn("px-0.5 text-center", isSunday(year, monthIndex, d) && "bg-muted-foreground/5")}>
                      {status ? (
                        <span title={t(status)} className={cn("inline-flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-semibold", statusToggleActiveClass(status))}>
                          {STATUS_CODE[status]}
                        </span>
                      ) : (
                        <span className="inline-block h-5 w-5 rounded-sm bg-secondary" aria-label={t("Not marked")} />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center tabular-nums">{row.presentDays}</TableCell>
                <TableCell className="text-center tabular-nums">{row.absentDays}</TableCell>
                <TableCell className="text-center tabular-nums">{row.lateDays}</TableCell>
                <TableCell className="text-end font-semibold tabular-nums">{row.percentPresent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
