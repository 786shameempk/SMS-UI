import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Globe2, School, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { searchTalents } from "../api";
import { CATEGORY_ORDER, SORT_OPTIONS } from "../constants";
import { CategoryChip, EmptyState } from "../components/Bits";
import { TalentGrid } from "../components/TalentCard";
import type { TalentCategory, TalentCreatorType, TalentSort, TalentVisibility } from "../types";

const PAGE_SIZE = 24;

/** Search & categories. Every filter lives in the URL, so results are shareable and back-button friendly. */
export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = (params.get("category") as TalentCategory | null) ?? undefined;
  const creatorType = (params.get("creator") as TalentCreatorType | null) ?? undefined;
  const visibility = (params.get("visibility") as TalentVisibility | null) ?? undefined;
  const scope = params.get("scope") === "school" ? "school" : "all";
  const sort = (params.get("sort") as TalentSort | null) ?? "trending";
  const page = Number(params.get("page") ?? 1);

  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // Debounce typing into the URL.
  useEffect(() => {
    if (draft === q) return;
    const t = window.setTimeout(() => update({ q: draft || null, page: null }), 350);
    return () => window.clearTimeout(t);
  }, [draft, q, update]);

  const filters = { search: q, category, creatorType, visibility, mySchool: scope === "school", sort, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["talents", "search", filters],
    queryFn: () => searchTalents(filters),
    placeholderData: keepPreviousData,
  });

  const activeCount = [category, creatorType, visibility, scope === "school" ? "s" : undefined].filter(Boolean).length;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="cc-display text-3xl sm:text-4xl font-extrabold text-foreground">
            Explore <span className="cc-gradient-text-strong">talents</span>
          </h1>
          <p className="text-muted-foreground mt-1">Search by title, creator or school - then narrow it down.</p>
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 h-12 shadow-sm focus-within:ring-2 focus-within:ring-violet-400">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Try “guitar”, “robotics”, a name or a school…"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            aria-label="Search talents"
          />
          {draft && (
            <button type="button" onClick={() => setDraft("")} className="p-1 rounded-full hover:bg-secondary cursor-pointer" aria-label="Clear search">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </label>

        {/* Category chips */}
        <div className="cc-rail -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => update({ category: null, page: null })}
            className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap cursor-pointer", !category ? "cc-gradient-bg text-white shadow-md" : "bg-secondary text-secondary-foreground hover:bg-muted")}
          >
            ✨ All talents
          </button>
          {CATEGORY_ORDER.map((c) => (
            <CategoryChip key={c} category={c} active={category === c} onClick={() => update({ category: category === c ? null : c, page: null })} />
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
            <SlidersHorizontal className="w-4 h-4" /> Filters{activeCount > 0 && ` (${activeCount})`}
          </span>
          <Segmented
            value={scope}
            onChange={(v) => update({ scope: v === "all" ? null : v, page: null })}
            options={[
              { value: "all", label: "All schools", icon: Globe2 },
              { value: "school", label: "My school", icon: School },
            ]}
          />
          <Segmented
            value={creatorType ?? "any"}
            onChange={(v) => update({ creator: v === "any" ? null : v, page: null })}
            options={[
              { value: "any", label: "Everyone" },
              { value: "student", label: "Students" },
              { value: "teacher", label: "Teachers" },
              { value: "parent", label: "Parents" },
            ]}
          />
          <Segmented
            value={visibility ?? "any"}
            onChange={(v) => update({ visibility: v === "any" ? null : v, page: null })}
            options={[
              { value: "any", label: "Any visibility" },
              { value: "school_only", label: "School only" },
              { value: "public", label: "Public" },
            ]}
          />
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value, page: null })}
            className="ml-auto h-9 rounded-full border border-border bg-card px-3 text-sm text-foreground cursor-pointer"
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data ? `${data.total.toLocaleString()} showcase${data.total === 1 ? "" : "s"}` : "Searching…"}</span>
        {isFetching && !isLoading && <span className="animate-pulse">Updating…</span>}
      </div>

      {data && data.total === 0 ? (
        <EmptyState emoji="🔭" title="No talents match yet" body="Try another category or clear a filter - new work is published every day." />
      ) : (
        <TalentGrid talents={data?.items} loading={isLoading} />
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="rounded-full border border-border bg-card px-4 py-2 text-sm disabled:opacity-40 cursor-pointer">
            Previous
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })} className="rounded-full border border-border bg-card px-4 py-2 text-sm disabled:opacity-40 cursor-pointer">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; icon?: typeof Globe2 }> }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
            value === o.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon && <o.icon className="w-3.5 h-3.5" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
