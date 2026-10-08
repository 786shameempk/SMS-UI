import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ActiveFilter {
  /** Stable key, e.g. "status". */
  id: string;
  /** Filter name shown before the value: "Status". */
  label: string;
  /** Human-readable value: "Active". */
  value: ReactNode;
  onRemove: () => void;
}

/** Removable "Status: Active ×" chips plus a "Clear all" link, so the current filter state is always visible. */
export function FilterChips({ filters, onClearAll, className }: { filters: ActiveFilter[]; onClearAll?: () => void; className?: string }) {
  if (filters.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Active filters">
      {filters.map((f) => (
        <span
          key={f.id}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card pl-2.5 pr-1 text-xs shadow-xs animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <span className="text-muted-foreground">{f.label}:</span>
          <span className="max-w-40 truncate font-medium text-foreground">{f.value}</span>
          <button
            type="button"
            onClick={f.onRemove}
            aria-label={`Remove ${f.label} filter`}
            className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer pointer-coarse:h-7 pointer-coarse:w-7"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="h-7 rounded-md px-2 text-xs font-medium text-primary-text transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
