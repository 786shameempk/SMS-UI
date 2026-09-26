import { useMemo, useState, type ReactNode } from "react";
import {
  type ColumnDef,
  type FilterFn,
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight, SearchX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn } from "@/utils/cn";

interface EmptyConfig {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  /** Renders a friendly error block with a retry button instead of the rows. */
  isError?: boolean;
  onRetry?: () => void;
  /** Short empty message (kept for existing callers). Use `empty` for an icon/description/action. */
  emptyMessage?: string;
  empty?: EmptyConfig;
  pageSize?: number;
  /** Adds a search box that matches any text/number field of the row data. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Filters/buttons rendered next to the search box. */
  toolbar?: ReactNode;
  onRowClick?: (row: TData) => void;
  /** Phones: `cards` stacks each row as a label/value card; `scroll` keeps the table and scrolls sideways. */
  mobileLayout?: "cards" | "scroll";
  /** Caps the body height and makes the header sticky inside it. */
  maxHeight?: number | string;
  className?: string;
}

/** Shallow text match over the row's own data (not just accessor columns), so display-only columns stay searchable. */
const rowTextFilter: FilterFn<unknown> = (row, _columnId, filterValue) => {
  const needle = String(filterValue ?? "").trim().toLowerCase();
  if (!needle) return true;
  const hay: string[] = [];
  const collect = (value: unknown, depth: number) => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number") hay.push(String(value));
    else if (depth < 2 && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((v) => collect(v, depth + 1));
  };
  collect(row.original, 0);
  return hay.join(" \u0001 ").toLowerCase().includes(needle);
};

function headerText<TData>(col: ColumnDef<TData, unknown>): string | undefined {
  return typeof col.header === "string" ? col.header : undefined;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  isError,
  onRetry,
  emptyMessage = "No records found.",
  empty,
  pageSize = 10,
  searchable,
  searchPlaceholder = "Search…",
  toolbar,
  onRowClick,
  mobileLayout = "cards",
  maxHeight,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: rowTextFilter as FilterFn<TData>,
    getColumnCanGlobalFilter: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize: size } = table.getState().pagination;
  const from = filteredCount === 0 ? 0 : pageIndex * size + 1;
  const to = Math.min(filteredCount, (pageIndex + 1) * size);
  const isFiltering = globalFilter.trim().length > 0;
  const showToolbar = searchable || toolbar;
  const visibleColumns = table.getVisibleLeafColumns();

  const skeletonWidths = useMemo(() => visibleColumns.map((_, i) => ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-3/5"][i % 5]), [visibleColumns]);

  const renderEmpty = () =>
    isFiltering ? (
      <EmptyState
        bare
        size="sm"
        icon={SearchX}
        title="No matching results"
        description={`Nothing matches “${globalFilter.trim()}”. Try a different search.`}
        action={
          <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")}>
            Clear search
          </Button>
        }
      />
    ) : (
      <EmptyState bare size="sm" icon={empty?.icon} title={empty?.title ?? emptyMessage} description={empty?.description} action={empty?.action} />
    );

  const actionCell = (row: Row<TData>) => row.getVisibleCells().find((c) => c.column.id === "actions");

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-xs", className)}>
      {showToolbar && (
        <div className="flex flex-col gap-2 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          {searchable ? (
            <SearchInput value={globalFilter} onValueChange={setGlobalFilter} placeholder={searchPlaceholder} containerClassName="sm:w-72" />
          ) : (
            <span />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {isError ? (
        <ErrorState bare size="sm" onRetry={onRetry} />
      ) : (
        <>
          {/* Table: tablet and up (or always, when mobileLayout="scroll"). */}
          <div
            className={cn("overflow-auto", mobileLayout === "cards" && "hidden sm:block")}
            style={maxHeight !== undefined ? { maxHeight } : undefined}
          >
            <table className="w-full caption-bottom text-sm">
              <thead className={cn("bg-muted/70 backdrop-blur-sm", maxHeight !== undefined && "sticky top-0 z-10")}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort() && header.column.columnDef.header !== "";
                      const sortDir = header.column.getIsSorted();
                      const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : undefined}
                          className={cn(
                            "h-10 px-[var(--space-row-padding-x)] text-left align-middle text-xs font-medium text-muted-foreground whitespace-nowrap",
                            header.column.id === "actions" && "w-12",
                          )}
                        >
                          {canSort && content ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-secondary hover:text-foreground cursor-pointer"
                            >
                              {content}
                              {sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-foreground" />
                              ) : sortDir === "desc" ? (
                                <ArrowDown className="h-3 w-3 text-foreground" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          ) : (
                            content
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-border/70 last:border-0">
                      {visibleColumns.map((col, j) => (
                        <td key={col.id} className="px-[var(--space-row-padding-x)] py-[var(--space-row-padding-y)]">
                          {col.id === "actions" ? <Skeleton className="h-6 w-6 ml-auto" /> : <Skeleton className={cn("h-4", skeletonWidths[j])} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length}>{renderEmpty()}</td>
                  </tr>
                )}
                {!isLoading &&
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      className={cn(
                        "border-b border-border/70 last:border-0 transition-colors hover:bg-muted/60",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-[var(--space-row-padding-x)] py-[var(--space-row-padding-y)] align-middle text-foreground",
                            cell.column.id === "actions" && "text-right",
                          )}
                          onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Phones: each row becomes a compact card with label/value pairs. */}
          {mobileLayout === "cards" && (
            <ul className="divide-y divide-border sm:hidden">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="space-y-2 p-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-2/5" />
                  </li>
                ))}
              {!isLoading && rows.length === 0 && <li>{renderEmpty()}</li>}
              {!isLoading &&
                rows.map((row) => {
                  const cells = row.getVisibleCells().filter((c) => c.column.id !== "actions");
                  const [first, ...rest] = cells;
                  const actions = actionCell(row);
                  return (
                    <li
                      key={row.id}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      className={cn("p-4", onRowClick && "cursor-pointer active:bg-muted/60")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 text-sm font-medium">{first && flexRender(first.column.columnDef.cell, first.getContext())}</div>
                        {actions && (
                          <div className="-mr-2 -mt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {flexRender(actions.column.columnDef.cell, actions.getContext())}
                          </div>
                        )}
                      </div>
                      {rest.length > 0 && (
                        <dl className="mt-2.5 grid grid-cols-[minmax(0,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
                          {rest.map((cell) => {
                            const label = headerText(cell.column.columnDef);
                            return (
                              <div key={cell.id} className="contents">
                                <dt className="text-xs leading-6 text-muted-foreground">{label ?? ""}</dt>
                                <dd className="min-w-0 text-right [&>*]:justify-end">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </>
      )}

      {!isLoading && !isError && filteredCount > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5 sm:px-4">
          <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            <span className="hidden sm:inline">Showing </span>
            <span className="font-medium text-foreground">
              {from}–{to}
            </span>{" "}
            of <span className="font-medium text-foreground">{filteredCount}</span>
            {isFiltering && <span className="hidden sm:inline"> (filtered from {data.length})</span>}
          </p>
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="hidden text-xs text-muted-foreground sm:inline tabular-nums mr-1">
                Page {pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Row above a table: description or filters on the left, primary action on the right; stacks on phones. */
export function DataTableToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between", className)}>{children}</div>;
}
