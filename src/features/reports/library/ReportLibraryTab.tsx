import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FileText, History, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { listReportCatalog } from "./api";
import ReportViewer from "./ReportViewer";
import type { ReportDescriptor } from "./types";

const RECENT_KEY = "sms-recent-reports";
const MAX_RECENT = 5;

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

/** Matches the search text against a report's name, description and category. */
export function matchesReport(report: ReportDescriptor, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [report.title, report.description, report.categoryTitle].some((text) => text.toLowerCase().includes(needle));
}

function ReportCard({ report, onOpen }: { report: ReportDescriptor; onOpen: () => void }) {
  const { t } = useTranslation("reports");
  return (
    <button type="button" onClick={onOpen} className="group block h-full text-start focus-visible:outline-none">
      <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="flex h-full flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
            {report.sensitive && (
              <Badge variant="warning">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {t("Restricted")}
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">{report.title}</p>
          <p className="line-clamp-3 text-xs text-muted-foreground">{report.description}</p>
          <p className="mt-auto pt-1 text-xs text-muted-foreground">
            {t("{{count}} filters", { count: report.filters.length })} · {t("{{count}} columns", { count: report.columns.length })}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}

/**
 * The report library: every report this login may run, taken from the server (which applies the school's plan, the role
 * and the sensitivity rules, so a report that is not listed is not available even by URL), searchable and grouped by category.
 */
export default function ReportLibraryTab() {
  const { t } = useTranslation("reports");
  const catalog = useQuery({ queryKey: ["reports", "catalog"], queryFn: listReportCatalog, staleTime: 60_000 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);

  const reports = useMemo(() => catalog.data ?? [], [catalog.data]);
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reports) map.set(r.category, r.categoryTitle);
    return [...map.entries()].map(([key, title]) => ({ key, title }));
  }, [reports]);

  const visible = useMemo(() => reports.filter((r) => (category === "all" || r.category === category) && matchesReport(r, search)), [reports, category, search]);
  const open = reports.find((r) => r.key === openKey) ?? null;
  const recentReports = recent.map((k) => reports.find((r) => r.key === k)).filter((r): r is ReportDescriptor => Boolean(r));

  const openReport = (key: string) => {
    setRecent(rememberRecent(key));
    setOpenKey(key);
  };

  if (open) return <ReportViewer key={open.key} descriptor={open} onBack={() => setOpenKey(null)} />;

  if (catalog.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (catalog.isError) {
    return <ErrorState title={t("The report list could not be loaded")} description={catalog.error instanceof Error ? catalog.error.message : undefined} onRetry={() => catalog.refetch()} />;
  }
  if (reports.length === 0) {
    return <EmptyState title={t("No reports are available to you")} description={t("Reports appear here when your school's plan includes Reports & Analytics and your role may view them.")} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search reports by name, category or keyword…")} containerClassName="sm:w-96" />
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Report categories")}>
          {[{ key: "all", title: t("All categories") }, ...categories].map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={category === c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-secondary-foreground hover:bg-secondary",
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {!search && category === "all" && recentReports.length > 0 && (
        <section aria-label={t("Recently opened")} className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <History className="h-4 w-4" aria-hidden="true" />
            {t("Recently opened")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentReports.map((r) => (
              <ReportCard key={r.key} report={r} onOpen={() => openReport(r.key)} />
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 ? (
        <EmptyState title={t("No reports match your search")} description={t("Try a different word or choose another category.")} />
      ) : (
        categories
          .filter((c) => visible.some((r) => r.category === c.key))
          .map((c) => (
            <section key={c.key} aria-label={c.title} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visible
                  .filter((r) => r.category === c.key)
                  .map((r) => (
                    <ReportCard key={r.key} report={r} onOpen={() => openReport(r.key)} />
                  ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
