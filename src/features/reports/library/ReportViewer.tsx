import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { listAcademicYears, listClasses, listSections, listSubjects, listTerms } from "@/features/academics/api";
import { listExams } from "@/features/examinations/api";
import { listBranches } from "@/features/administration/branches/api";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { downloadReportCsv, fetchAllRows, runReport, saveBlob, type AllRows } from "./api";
import { resolvePreset, toKey, validateRange, type DatePreset } from "./dateRanges";
import { formatCell, isNumericColumn, rowsToCsv } from "./format";
import ReportFilterPanel, { optionsFor, type FilterOptionLists } from "./ReportFilterPanel";
import { printReport } from "./printReport";
import { PAGE_SIZES, type ReportDescriptor, type ReportQuery } from "./types";

type Filters = Record<string, string>;

/** Starting values: required dates open on a useful range so the report can run straight away. */
export function defaultFilters(descriptor: ReportDescriptor, today = new Date()): { filters: Filters; preset: DatePreset } {
  const filters: Filters = {};
  let preset: DatePreset = "custom";
  const keys = new Set(descriptor.filters.map((f) => f.key));
  if (keys.has("dateFrom") && keys.has("dateTo")) {
    const required = descriptor.filters.find((f) => f.key === "dateFrom")?.required;
    if (required) {
      const range = resolvePreset("last30", today);
      if (range) {
        filters.dateFrom = range.from;
        filters.dateTo = range.to;
        preset = "last30";
      }
    }
  }
  if (keys.has("date") && descriptor.filters.find((f) => f.key === "date")?.required) filters.date = toKey(today);
  if (keys.has("month") && descriptor.filters.find((f) => f.key === "month")?.required) filters.month = String(today.getMonth() + 1);
  return { filters, preset };
}

/** The first thing wrong with the filters, or null when the report can be run. */
export function filterProblem(descriptor: ReportDescriptor, filters: Filters): string | null {
  for (const def of descriptor.filters) {
    if (def.required && !filters[def.key]) return `${def.label} is required.`;
  }
  return validateRange(filters.dateFrom ?? "", filters.dateTo ?? "");
}

function useOptionLists(descriptor: ReportDescriptor): FilterOptionLists {
  const uses = (source: string) => descriptor.filters.some((f) => f.source === source);
  const years = useQuery({ queryKey: ["reports", "lists", "academicYears"], queryFn: listAcademicYears, enabled: true, staleTime: 5 * 60_000 });
  const classes = useQuery({ queryKey: ["reports", "lists", "classes"], queryFn: listClasses, enabled: uses("classes") || uses("sections"), staleTime: 5 * 60_000 });
  const sections = useQuery({ queryKey: ["reports", "lists", "sections"], queryFn: listSections, enabled: uses("sections"), staleTime: 5 * 60_000 });
  const branches = useQuery({ queryKey: ["reports", "lists", "branches"], queryFn: listBranches, enabled: uses("branches"), staleTime: 5 * 60_000 });
  const terms = useQuery({ queryKey: ["reports", "lists", "terms"], queryFn: listTerms, enabled: uses("terms"), staleTime: 5 * 60_000 });
  const exams = useQuery({ queryKey: ["reports", "lists", "exams"], queryFn: listExams, enabled: uses("exams"), staleTime: 5 * 60_000 });
  const subjects = useQuery({ queryKey: ["reports", "lists", "subjects"], queryFn: listSubjects, enabled: uses("subjects"), staleTime: 5 * 60_000 });
  return useMemo(
    () => ({
      academicYears: (years.data ?? []).map((y) => ({ value: y.id, label: y.name, startDate: y.startDate, endDate: y.endDate, isCurrent: y.isCurrent })),
      classes: [...(classes.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((c) => ({ value: c.id, label: c.name })),
      sections: (sections.data ?? []).map((s) => ({ value: s.id, label: `${classes.data?.find((c) => c.id === s.classId)?.name ?? ""} · ${s.name}`.replace(/^ · /, ""), classId: s.classId })),
      branches: (branches.data ?? []).map((b) => ({ value: b.id, label: b.name })),
      terms: (terms.data ?? []).map((x) => ({ value: x.id, label: x.name })),
      exams: (exams.data ?? []).map((x) => ({ value: x.id, label: x.name, classId: x.classId })),
      subjects: (subjects.data ?? []).map((x) => ({ value: x.id, label: x.name })),
    }),
    [years.data, classes.data, sections.data, branches.data, terms.data, exams.data, subjects.data],
  );
}

interface ProgressState {
  title: string;
  loaded: number;
  total: number;
}

function ExportProgressDialog({ progress, onCancel }: { progress: ProgressState | null; onCancel: () => void }) {
  const { t } = useTranslation("reports");
  const percent = progress && progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;
  return (
    <Dialog open={progress !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{progress?.title}</DialogTitle>
          <DialogDescription>
            {progress && progress.total > 0
              ? t("{{loaded}} of {{total}} records", { loaded: progress.loaded.toLocaleString(), total: progress.total.toLocaleString() })
              : t("Preparing…")}
          </DialogDescription>
        </DialogHeader>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress && progress.total > 0 ? percent : 8}%` }} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("Cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  descriptor: ReportDescriptor;
  onBack: () => void;
}

export default function ReportViewer({ descriptor, onBack }: Props) {
  const { t, i18n } = useTranslation("reports");
  const branding = useTenantBranding();
  const user = useAuthStore((s) => s.user);
  const lists = useOptionLists(descriptor);

  const initial = useMemo(() => defaultFilters(descriptor), [descriptor]);
  const [draft, setDraft] = useState<Filters>(initial.filters);
  const [applied, setApplied] = useState<Filters>(initial.filters);
  const [preset, setPreset] = useState<DatePreset>(initial.preset);
  const [monthValue, setMonthValue] = useState(toKey(new Date()).slice(0, 7));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState(descriptor.defaultSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(descriptor.defaultSortDescending ? "desc" : "asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [all, setAll] = useState<AllRows | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const draftProblem = filterProblem(descriptor, draft);
  const runnable = filterProblem(descriptor, applied) === null;

  const baseQuery = useMemo(
    () => ({ filters: applied, sortBy, sortDirection: sortDir, search: debouncedSearch }),
    [applied, sortBy, sortDir, debouncedSearch],
  );
  const query: ReportQuery = { ...baseQuery, page, pageSize };

  // The full set belongs to one filter/sort/search combination; any change makes it stale.
  useEffect(() => setAll(null), [baseQuery]);

  const result = useQuery({
    queryKey: ["reports", "run", descriptor.key, query],
    queryFn: ({ signal }) => runReport(descriptor.key, query, signal),
    enabled: runnable,
    placeholderData: (previous) => previous,
  });
  const data = result.data;
  const rows = all ? all.rows : (data?.rows ?? []);
  const total = all ? all.total : (data?.total ?? 0);
  const summary = all ? all.summary : (data?.summary ?? []);

  const apply = () => {
    setApplied(draft);
    setPage(1);
  };
  const reset = () => {
    const fresh = defaultFilters(descriptor);
    setDraft(fresh.filters);
    setApplied(fresh.filters);
    setPreset(fresh.preset);
    setSearch("");
    setSortBy(descriptor.defaultSort);
    setSortDir(descriptor.defaultSortDescending ? "desc" : "asc");
    setPage(1);
  };

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProgress(null);
  }, []);
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Every matching row, from memory if already loaded, otherwise from the server with a progress dialog. */
  const loadEverything = useCallback(
    async (title: string, show = false): Promise<AllRows | null> => {
      if (all) return all;
      const controller = new AbortController();
      abortRef.current = controller;
      setProgress({ title, loaded: 0, total: 0 });
      try {
        const loaded = await fetchAllRows(
          descriptor.key,
          baseQuery,
          (done, of) => setProgress({ title, loaded: done, total: of }),
          controller.signal,
        );
        // Only the Load all button changes what the screen shows; printing just uses the rows.
        if (show) setAll(loaded);
        return loaded;
      } catch (err) {
        if (!axios.isCancel(err) && !controller.signal.aborted) toast.error(err instanceof Error ? err.message : t("Could not load the records."));
        return null;
      } finally {
        abortRef.current = null;
        setProgress(null);
      }
    },
    [all, baseQuery, descriptor.key, t],
  );

  const filterLines = useMemo(() => {
    const lines: { label: string; text: string }[] = [];
    const used = new Set<string>();
    if (applied.dateFrom || applied.dateTo) {
      lines.push({ label: t("Period"), text: [applied.dateFrom, applied.dateTo].filter(Boolean).join(" – ") });
      used.add("dateFrom").add("dateTo");
    }
    for (const def of descriptor.filters) {
      const value = applied[def.key];
      if (!value || used.has(def.key)) continue;
      const label = def.type === "select" ? (optionsFor(def, lists, applied).find((o) => o.value === value)?.label ?? value) : value;
      lines.push({ label: t(def.label), text: label });
    }
    if (debouncedSearch) lines.push({ label: t("Search"), text: debouncedSearch });
    return lines;
  }, [applied, debouncedSearch, descriptor.filters, lists, t]);

  const print = async (scope: "page" | "all") => {
    let printRows = rows;
    let printSummary = summary;
    let scopeLabel = t("Current page ({{count}} records)", { count: rows.length });
    if (scope === "all") {
      const everything = await loadEverything(t("Preparing all records for print"));
      if (!everything) return;
      printRows = everything.rows;
      printSummary = everything.summary;
      scopeLabel = t("All filtered records ({{count}})", { count: everything.total });
    }
    const ok = printReport({
      descriptor,
      rows: printRows,
      summary: printSummary,
      filterLines,
      scopeLabel,
      branding,
      generatedBy: user?.name,
      locale: i18n.language,
    });
    if (!ok) toast.error(t("Allow pop-ups for this site to print the report."));
  };

  const exportPage = () => {
    saveBlob(new Blob([rowsToCsv(descriptor.columns, rows)], { type: "text/csv;charset=utf-8" }), `${descriptor.key}-page-${page}.csv`);
  };

  const exportAll = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ title: t("Exporting all filtered records"), loaded: 0, total: data?.total ?? 0 });
    try {
      await downloadReportCsv(descriptor.key, baseQuery, controller.signal);
      toast.success(t("Export downloaded."));
    } catch (err) {
      if (!axios.isCancel(err) && !controller.signal.aborted) toast.error(err instanceof Error ? err.message : t("The export failed."));
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const pagesTotal = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="-ms-2 mb-1">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("All reports")}
          </Button>
          <h2 className="text-lg font-semibold text-foreground">{descriptor.title}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{descriptor.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => result.refetch()} disabled={!runnable || result.isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5", result.isFetching && "animate-spin")} aria-hidden="true" />
            {t("Refresh")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={!runnable || total === 0}>
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Print")}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("Opens a print preview; choose Save as PDF there to download")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void print("page")}>{t("Current page ({{count}} records)", { count: rows.length })}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void print("all")}>{t("All filtered records ({{count}})", { count: total })}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={!runnable || total === 0}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Export CSV")}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportPage}>{t("Current page ({{count}} records)", { count: rows.length })}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportAll()}>{t("All filtered records ({{count}})", { count: total })}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ReportFilterPanel
        descriptor={descriptor}
        values={draft}
        onChange={setDraft}
        lists={lists}
        datePreset={preset}
        onDatePresetChange={setPreset}
        monthValue={monthValue}
        onMonthChange={setMonthValue}
        onApply={apply}
        onReset={reset}
        problem={draftProblem}
        applying={result.isFetching && !result.isPlaceholderData}
      />

      {runnable && summary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label={t("Summary of all filtered records")}>
          {summary.map((s) => (
            <StatCard key={s.key} label={s.label} value={formatCell(s.value, s.type, i18n.language) || "0"} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput value={search} onValueChange={(v) => { setSearch(v); setPage(1); }} placeholder={t("Search within this report…")} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {all ? (
            <>
              <span>{t("Showing all {{count}} records", { count: all.total })}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setAll(null)}>
                {t("Back to pages")}
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled={!runnable || total === 0} onClick={() => void loadEverything(t("Loading all records"), true)}>
              {t("Load all records")}
            </Button>
          )}
        </div>
      </div>

      {!runnable ? (
        <EmptyState title={t("Choose the filters above")} description={t(filterProblem(descriptor, applied) ?? "")} />
      ) : result.isError && !data ? (
        <ErrorState title={t("This report could not be loaded")} description={result.error instanceof Error ? result.error.message : undefined} onRetry={() => result.refetch()} retrying={result.isFetching} />
      ) : result.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState title={t("No records match these filters")} description={t("Change or reset the filters to see more.")} />
      ) : (
        <>
          <Table stickyHeader containerClassName="rounded-xl border border-border">
            <TableHeader>
              <TableRow hover={false}>
                {descriptor.columns.map((c) => {
                  const active = sortBy === c.key;
                  return (
                    <TableHead key={c.key} className={cn(isNumericColumn(c.type) && "text-end")} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      {c.sortable ? (
                        <button type="button" className="inline-flex items-center gap-1 font-semibold hover:text-foreground" onClick={() => toggleSort(c.key)}>
                          {c.label}
                          {active && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                        </button>
                      ) : (
                        c.label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={`${page}-${i}`}>
                  {descriptor.columns.map((c) => (
                    <TableCell key={c.key} className={cn("text-sm", isNumericColumn(c.type) && "text-end tabular-nums")}>
                      {formatCell(row[c.key], c.type, i18n.language)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!all && (
            <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label={t("Pagination")}>
              <p className="text-muted-foreground">
                {t("{{count}} records · page {{page}} of {{pages}}", { count: total, page, pages: pagesTotal })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-muted-foreground">
                  {t("Rows per page")}
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-8 w-20" aria-label={t("Rows per page")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button type="button" size="icon-sm" variant="outline" aria-label={t("First page")} disabled={page <= 1} onClick={() => setPage(1)}>
                  <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" size="icon-sm" variant="outline" aria-label={t("Previous page")} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" size="icon-sm" variant="outline" aria-label={t("Next page")} disabled={page >= pagesTotal} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" size="icon-sm" variant="outline" aria-label={t("Last page")} disabled={page >= pagesTotal} onClick={() => setPage(pagesTotal)}>
                  <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <ExportProgressDialog progress={progress} onCancel={cancel} />
    </div>
  );
}
