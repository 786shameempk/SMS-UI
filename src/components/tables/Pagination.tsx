import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { pageWindow } from "./pageWindow";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];


interface PaginationProps {
  /** Zero-based. */
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
  /** First and last row number on this page (1-based), for "Showing 101–125 of 1,248". */
  from: number;
  to: number;
  onPageChange: (pageIndex: number) => void;
  /** Shows a rows-per-page selector when given. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Extra note after the count, e.g. "(filtered from 300)". */
  note?: React.ReactNode;
  className?: string;
}

/**
 * Table footer: range summary, rows-per-page, and page buttons. Phones get a compact "Page 2 of 50" with
 * prev/next; wider screens get numbered pages with ellipses.
 */
export function Pagination({
  pageIndex,
  pageCount,
  pageSize,
  totalCount,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  note,
  className,
}: PaginationProps) {
  const current = pageIndex + 1;
  const sizes = pageSizeOptions.includes(pageSize) ? pageSizeOptions : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-muted/30 px-3 py-2.5 sm:px-4", className)}
    >
      <div className="flex items-center gap-4">
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          <span className="hidden sm:inline">Showing </span>
          <span className="font-medium text-foreground">
            {from.toLocaleString()}–{to.toLocaleString()}
          </span>{" "}
          of <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
          {note && <span className="hidden sm:inline"> {note}</span>}
        </p>
        {onPageSizeChange && (
          <label className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            Rows per page
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-7 w-[4.5rem] px-2 text-xs" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizes.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="pointer-coarse:size-10"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex <= 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-2 text-xs text-muted-foreground tabular-nums sm:hidden">
            Page {current} of {pageCount}
          </span>
          <ul className="hidden items-center gap-1 sm:flex">
            {pageWindow(current, pageCount).map((p, i) =>
              p === "gap" ? (
                <li key={`gap-${i}`} aria-hidden="true" className="w-6 text-center text-xs text-muted-foreground select-none">
                  …
                </li>
              ) : (
                <li key={p}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onPageChange(p - 1)}
                    aria-label={`Page ${p}`}
                    aria-current={p === current ? "page" : undefined}
                    className={cn(
                      "w-auto min-w-8 px-2 text-xs tabular-nums",
                      p === current && "bg-accent text-accent-foreground ring-1 ring-inset ring-primary/25 hover:bg-accent",
                    )}
                  >
                    {p}
                  </Button>
                </li>
              ),
            )}
          </ul>

          <Button
            variant="ghost"
            size="icon-sm"
            className="pointer-coarse:size-10"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}
