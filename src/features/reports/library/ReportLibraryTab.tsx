import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { History, Lock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { listReportCatalog } from "./api";
import { categoryIcon } from "./categoryIcon";
import ReportViewer from "./ReportViewer";
import type { ReportDescriptor } from "./types";

const RECENT_KEY = "sms-recent-reports";
const MAX_RECENT = 5;
const USAGE_KEY = "sms-report-usage";
const MAX_FREQUENT = 3;
/** A report counts as frequently used after this many openings in this browser. */
const FREQUENT_AFTER = 2;

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function rememberRecent(key: string): string[] {
  const next = [key, ...readRecent().filter((k) => k !== key)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: recents just aren't kept */
  }
  return next;
}

function readUsage(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(USAGE_KEY) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "number"));
  } catch {
    return {};
  }
}

function rememberUsage(key: string): Record<string, number> {
  const next = { ...readUsage() };
  next[key] = (next[key] ?? 0) + 1;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: usage just isn't counted */
  }
  return next;
}

/** The reports opened most often (at least FREQUENT_AFTER times), most used first, only those still in the catalogue. */
export function frequentReports(reports: ReportDescriptor[], usage: Record<string, number>): ReportDescriptor[] {
  return reports
    .filter((r) => (usage[r.key] ?? 0) >= FREQUENT_AFTER)
    .sort((a, b) => (usage[b.key] ?? 0) - (usage[a.key] ?? 0) || a.title.localeCompare(b.title))
    .slice(0, MAX_FREQUENT);
}

/** Matches the search text against a report's name, description and category. */
export function matchesReport(report: ReportDescriptor, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [report.title, report.description, report.categoryTitle].some((text) => text.toLowerCase().includes(needle));
}

function ReportCard({ report, onOpen }: { report: ReportDescriptor; onOpen: () => void }) {
  const { t } = useTranslation("reports");
  const Icon = categoryIcon(report.category);
  const id = `report-card-${report.key}`;
  return (
    <button type="button" id={id} data-report-key={report.key} onClick={onOpen} aria-describedby={`${id}-info`} className="group block h-full text-start focus-visible:outline-none">
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
        <CardContent className="flex h-full flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text" aria-hidden="true">
              <Icon className="h-4.5 w-4.5" />
            </span>
            {report.sensitive && (
              <Badge variant="warning">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {t("Restricted")}
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold leading-snug text-foreground">{report.title}</p>
          <p id={`${id}-info`} className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {report.description}
          </p>
          <p className="mt-auto pt-1 text-xs text-muted-foreground">
            {t("{{count}} filters", { count: report.filters.length })} · {t("{{count}} columns", { count: report.columns.length })}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

/**
 * The report library: every report this login may run, taken from the server (which applies the school's plan, the role
 * and the sensitivity rules, so a report that is not listed is not available even by URL). A category rail on the left (a
 * scrolling row of chips on phones) with counts, a search that announces how many reports match, and cards grouped by category.
 * Opening a report moves focus to its heading, and closing it returns focus to the card it came from.
 */
export default function ReportLibraryTab() {
  const { t } = useTranslation("reports");
  const catalog = useQuery({ queryKey: ["reports", "catalog"], queryFn: listReportCatalog, staleTime: 60_000 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const returnTo = useRef<string | null>(null);

  const [usage, setUsage] = useState<Record<string, number>>(readUsage);

  const reports = useMemo(() => catalog.data?.reports ?? [], [catalog.data]);
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reports) map.set(r.category, r.categoryTitle);
    return [...map.entries()].map(([key, title]) => ({ key, title, count: reports.filter((r) => r.category === key).length }));
  }, [reports]);

  const visible = useMemo(() => reports.filter((r) => (category === "all" || r.category === category) && matchesReport(r, search)), [reports, category, search]);
  const open = reports.find((r) => r.key === openKey) ?? null;
  const recentReports = recent.map((k) => reports.find((r) => r.key === k)).filter((r): r is ReportDescriptor => Boolean(r));

  const frequent = useMemo(() => frequentReports(reports, usage), [reports, usage]);

  const openReport = (key: string) => {
    returnTo.current = key;
    setUsage(rememberUsage(key));
    setRecent(rememberRecent(key));
    setOpenKey(key);
  };

  // Back from a report: put the keyboard focus back on the card that opened it, not at the top of the page.
  useEffect(() => {
    if (open || !returnTo.current) return;
    const key = returnTo.current;
    returnTo.current = null;
    document.querySelector<HTMLElement>(`[data-report-key="${CSS.escape(key)}"]`)?.focus();
  }, [open]);

  if (open) return <ReportViewer key={open.key} descriptor={open} access={catalog.data?.access[open.service ?? "academic"]} onBack={() => setOpenKey(null)} />;

  if (catalog.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]" role="status" aria-busy="true" aria-label={t("Loading reports")}>
        <Skeleton className="hidden h-72 w-full lg:block" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (catalog.isError) {
    return <ErrorState title={t("The report list could not be loaded")} description={catalog.error instanceof Error ? catalog.error.message : undefined} onRetry={() => catalog.refetch()} />;
  }
  if (reports.length === 0) {
    return <EmptyState title={t("No reports are available to you")} description={t("Reports appear here when your school's plan includes Reports & Analytics and your role may view them.")} />;
  }

  const chips = [{ key: "all", title: t("All categories"), count: reports.length }, ...categories];

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label={t("Report categories")} className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">{t("Categories")}</p>
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
          {chips.map((c) => {
            const Icon = c.key === "all" ? null : categoryIcon(c.key);
            const current = category === c.key;
            return (
              <li key={c.key} className="shrink-0">
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-full border px-3 py-1.5 text-start text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-lg lg:border-transparent",
                    current ? "border-primary bg-primary text-primary-foreground lg:bg-accent lg:text-accent-foreground" : "border-border bg-card text-secondary-foreground hover:bg-secondary lg:bg-transparent",
                  )}
                >
                  {Icon && <Icon className="hidden h-4 w-4 shrink-0 lg:block" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 whitespace-nowrap lg:whitespace-normal">{c.title}</span>
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", current ? "bg-primary-foreground/20 lg:bg-primary/15" : "bg-muted text-muted-foreground")}>{c.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 space-y-6">
        <div role="search" className="space-y-2">
          <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search reports by name, category or keyword…")} aria-label={t("Search reports")} containerClassName="sm:max-w-lg" />
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {t("{{count}} reports", { count: visible.length })}
            {category !== "all" ? ` · ${categories.find((c) => c.key === category)?.title ?? ""}` : ""}
            {search.trim() ? ` · “${search.trim()}”` : ""}
          </p>
        </div>

        {!search && category === "all" && frequent.length > 0 && (
          <section aria-labelledby="reports-frequent" className="space-y-2">
            <h3 id="reports-frequent" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Star className="h-4 w-4" aria-hidden="true" />
              {t("Frequently used")}
            </h3>
            <CardGrid>
              {frequent.map((r) => (
                <ReportCard key={r.key} report={r} onOpen={() => openReport(r.key)} />
              ))}
            </CardGrid>
          </section>
        )}

        {!search && category === "all" && recentReports.length > 0 && (
          <section aria-labelledby="reports-recent" className="space-y-2">
            <h3 id="reports-recent" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <History className="h-4 w-4" aria-hidden="true" />
              {t("Recently opened")}
            </h3>
            <CardGrid>
              {recentReports.map((r) => (
                <ReportCard key={r.key} report={r} onOpen={() => openReport(r.key)} />
              ))}
            </CardGrid>
          </section>
        )}

        {visible.length === 0 ? (
          <EmptyState title={t("No reports match your search")} description={t("Try a different word or choose another category.")} />
        ) : (
          categories
            .filter((c) => visible.some((r) => r.category === c.key))
            .map((c) => (
              <section key={c.key} aria-labelledby={`reports-cat-${c.key}`} className="space-y-2">
                <h3 id={`reports-cat-${c.key}`} className="text-sm font-semibold text-foreground">
                  {c.title} <span className="font-normal text-muted-foreground">({visible.filter((r) => r.category === c.key).length})</span>
                </h3>
                <CardGrid>
                  {visible
                    .filter((r) => r.category === c.key)
                    .map((r) => (
                      <ReportCard key={r.key} report={r} onOpen={() => openReport(r.key)} />
                    ))}
                </CardGrid>
              </section>
            ))
        )}
      </div>
    </div>
  );
}