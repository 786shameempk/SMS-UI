import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  type ColumnDef,
  type FilterFn,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, FilterX, RotateCw, SearchX, Settings2, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { tableClasses } from "@/components/ui/table-classes";
import { useHorizontalOverflow } from "@/hooks/useHorizontalOverflow";
import { downloadCsv } from "@/utils/csv";
import { cn } from "@/utils/cn";
import { FilterChips, type ActiveFilter } from "./FilterChips";
import { Pagination } from "./Pagination";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Name used in the Columns menu, phone cards and CSV export when `header` isn't a plain string. */
    label?: string;
    /** Value written to CSV for this column. Defaults to the accessor value; display-only columns are skipped. */
    exportValue?: (row: TData) => unknown;
  }
}

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
  /** Offers a rows-per-page selector. Defaults on for full-size tables (pageSize ≥ 10) with more than one page. */
  pageSizeOptions?: number[];
  /** Adds a search box that matches any text/number field of the row data. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Filters/buttons rendered on the right of the toolbar (kept for existing callers). */
  toolbar?: ReactNode;
  /** Filter controls placed next to the search box. */
  filters?: ReactNode;
  /** Primary actions (e.g. "+ Add student"), right-aligned in the toolbar. */
  actions?: ReactNode;
  /** Applied filters, shown as removable chips under the toolbar. Also drives the "no results for these filters" state. */
  activeFilters?: ActiveFilter[];
  onClearFilters?: () => void;
  /** Adds a "Columns" menu so people can hide columns they don't need. */
  columnToggle?: boolean;
  /** Adds an Export button that downloads the rows currently shown (after search/filters) as `<name>.csv`. */
  exportFileName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /**
   * Turns on row checkboxes. While rows are selected the toolbar is replaced by a bulk-action bar that
   * renders these actions; call `clear()` once an action is done.
   */
  bulkActions?: (selected: TData[], clear: () => void) => ReactNode;
  /** Row checkboxes without custom bulk actions (the bulk bar still offers Export when `exportFileName` is set). */
  selectable?: boolean;
  /** Stable row ids keep the selection attached to the right records across re-sorts and refetches. */
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
  /** Phones: `cards` stacks each row as a label/value card; `scroll` keeps the table and scrolls sideways. */
  mobileLayout?: "cards" | "scroll";
  /** Caps the body height and makes the header sticky inside it. */
  maxHeight?: number | string;
  className?: string;
  /**
   * Paging done by the API: `data` is just the current page, and the footer pages through `totalCount` rows by
   * calling `onPageChange`. Column sorting and the built-in search are off in this mode (they would only see one
   * page) - filter through the API instead.
   */
  serverPagination?: ServerPagination;
}

export interface ServerPagination {
  /** Zero-based. */
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
  /** Shows a rows-per-page selector; the caller should go back to the first page. */
  onPageSizeChange?: (pageSize: number) => void;
}

export type { ActiveFilter };

const SELECT_ID = "select";
const ACTIONS_ID = "actions";

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
  return col.meta?.label ?? (typeof col.header === "string" && col.header ? col.header : undefined);
}

/** Header + rows for the CSV export: every accessor (or `meta.exportValue`) column that has a name. */
function exportRows<TData>(rows: Row<TData>[], visible: { id: string; columnDef: ColumnDef<TData, unknown>; accessorFn?: unknown }[]) {
  const cols = visible.filter((c) => headerText(c.columnDef) && (c.columnDef.meta?.exportValue || c.accessorFn));
  return {
    headers: cols.map((c) => headerText(c.columnDef)!),
    rows: rows.map((r) => cols.map((c) => (c.columnDef.meta?.exportValue ? c.columnDef.meta.exportValue(r.original) : r.getValue(c.id)))),
  };
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
  pageSizeOptions,
  searchable,
  searchPlaceholder = "Search…",
  toolbar,
  filters,
  actions,
  activeFilters = [],
  onClearFilters,
  columnToggle,
  exportFileName,
  onRefresh,
  isRefreshing,
  bulkActions,
  selectable: selectableProp,
  getRowId,
  onRowClick,
  mobileLayout = "cards",
  maxHeight,
  className,
  serverPagination: server,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const selectable = Boolean(bulkActions) || Boolean(selectableProp);

  const allColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!selectable) return columns;
    const select: ColumnDef<TData, unknown> = {
      id: SELECT_ID,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows on this page"
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(v) => row.toggleSelected(v === true)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    };
    return [select, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: server
      ? { sorting, globalFilter, rowSelection, columnVisibility, pagination: { pageIndex: server.pageIndex, pageSize: server.pageSize } }
      : { sorting, globalFilter, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: selectable,
    globalFilterFn: rowTextFilter as FilterFn<TData>,
    getColumnCanGlobalFilter: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: server ? undefined : getPaginationRowModel(),
    enableSorting: !server,
    manualPagination: Boolean(server),
    pageCount: server ? Math.max(1, Math.ceil(server.totalCount / server.pageSize)) : undefined,
    // Only in server mode: passing `undefined` would replace TanStack's own pagination state updater and leave
    // client-paged tables stuck on the first page.
    ...(server && {
      onPaginationChange: (updater) => {
        const current = { pageIndex: server.pageIndex, pageSize: server.pageSize };
        server.onPageChange((typeof updater === "function" ? updater(current) : updater).pageIndex);
      },
    }),
    autoResetPageIndex: !server,
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const filteredCount = server ? server.totalCount : filteredRows.length;
  const { pageIndex, pageSize: size } = table.getState().pagination;
  const from = filteredCount === 0 ? 0 : pageIndex * size + 1;
  const to = server ? pageIndex * size + rows.length : Math.min(filteredCount, (pageIndex + 1) * size);
  const isSearching = globalFilter.trim().length > 0;
  const hasFilters = activeFilters.length > 0;
  const visibleColumns = table.getVisibleLeafColumns();

  // Only rows still in view count as selected, so a bulk action never touches records hidden by a search.
  const selectedRows = selectable ? filteredRows.filter((r) => r.getIsSelected()) : [];
  const clearSelection = () => setRowSelection({});

  const hideableColumns = table.getAllLeafColumns().filter((c) => c.getCanHide() && c.id !== ACTIONS_ID && headerText(c.columnDef));
  const showColumnMenu = columnToggle && hideableColumns.length > 1;
  const showSearch = searchable && !server;
  const bulkActive = selectedRows.length > 0;
  const hasToolbarContent = Boolean(showSearch || toolbar || filters || actions || showColumnMenu || exportFileName || onRefresh || hasFilters);
  const showPageSize = server ? Boolean(server.onPageSizeChange) : Boolean(pageSizeOptions) || (pageSize >= 10 && filteredCount > pageSize);

  const exportCsv = (source: Row<TData>[]) => {
    const { headers, rows: lines } = exportRows(source, table.getVisibleLeafColumns());
    downloadCsv(exportFileName ?? "export", headers, lines);
  };

  // Without a maxHeight the header sticks to the page while scrolling - possible only while this table isn't
  // itself a horizontal scroller, so it switches to sideways scrolling just when the columns don't fit.
  const scrollRef = useRef<HTMLDivElement>(null);
  const capped = maxHeight !== undefined;
  const overflowingX = useHorizontalOverflow(scrollRef, !capped);

  const skeletonWidths = useMemo(() => visibleColumns.map((_, i) => ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-3/5"][i % 5]), [visibleColumns]);

  const renderEmpty = () => {
    if (isSearching || hasFilters) {
      return (
        <EmptyState
          bare
          size="sm"
          icon={isSearching ? SearchX : FilterX}
          title={isSearching ? "No matching results" : "No results for these filters"}
          description={
            isSearching
              ? `Nothing matches “${globalFilter.trim()}”${hasFilters ? " with the current filters" : ""}. Try a different search.`
              : "Try removing a filter or two to widen the results."
          }
          action={
            <>
              {isSearching && (
                <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")}>
                  Clear search
                </Button>
              )}
              {hasFilters && onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )}
            </>
          }
        />
      );
    }
    return <EmptyState bare size="sm" icon={empty?.icon} title={empty?.title ?? emptyMessage} description={empty?.description} action={empty?.action} />;
  };

  const actionCell = (row: Row<TData>) => row.getVisibleCells().find((c) => c.column.id === ACTIONS_ID);
  const selectCell = (row: Row<TData>) => row.getVisibleCells().find((c) => c.column.id === SELECT_ID);

  const rowInteraction = (row: Row<TData>) =>
    onRowClick
      ? {
          onClick: () => onRowClick(row.original),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onRowClick(row.original);
            }
          },
          tabIndex: 0,
        }
      : {};

  const toolButtons = (
    <>
      {onRefresh && (
        <Button variant="ghost" size="icon-sm" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh" title="Refresh">
          <RotateCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      )}
      {showColumnMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Choose columns">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Show columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hideableColumns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(v === true)}
                onSelect={(e) => e.preventDefault()}
              >
                {headerText(col.columnDef)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {exportFileName && (
        <Button variant="outline" size="sm" onClick={() => exportCsv(filteredRows)} disabled={filteredRows.length === 0}>
          <Download className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Export</span>
          <span className="sr-only lg:hidden">Export</span>
        </Button>
      )}
    </>
  );

  return (
    <div className={cn("overflow-clip rounded-xl border border-border/80 bg-card shadow-sm", className)}>
      {(hasToolbarContent || bulkActive) && (
        <div className="relative">
          {hasToolbarContent && (
            <div className="space-y-2.5 border-b border-border bg-card px-3 py-3 sm:px-4" inert={bulkActive}>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {showSearch && (
                    <SearchInput value={globalFilter} onValueChange={setGlobalFilter} placeholder={searchPlaceholder} containerClassName="sm:w-72" />
                  )}
                  {/* Phones: a search box in `filters` gets its own row; the selects share the next one. */}
                  {filters && (
                    <div className="flex flex-wrap items-center gap-2 [&>*]:min-w-0 max-sm:[&>*]:flex-1 max-sm:[&>:has(input[type=search])]:basis-full">{filters}</div>
                  )}
                </div>
                {(toolbar || actions || showColumnMenu || exportFileName || onRefresh) && (
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {toolbar}
                    {toolButtons}
                    {actions}
                  </div>
                )}
              </div>
              <FilterChips filters={activeFilters} onClearAll={onClearFilters} />
            </div>
          )}
          {bulkActive && (
            <div
              role="toolbar"
              aria-label="Bulk actions"
              className={cn(
                "flex flex-wrap items-center gap-2 border-b border-primary/20 bg-accent px-3 py-3 animate-in fade-in-0 duration-150 sm:px-4",
                // Laid over the toolbar (which keeps its space) so the rows below never shift.
                hasToolbarContent && "absolute inset-0 z-20",
              )}
            >
              <div className="flex items-center gap-1 mr-auto">
                <Button variant="ghost" size="icon-sm" onClick={clearSelection} aria-label="Clear selection" className="text-accent-foreground hover:bg-primary/10">
                  <X className="h-4 w-4" />
                </Button>
                <p className="text-sm font-medium text-accent-foreground tabular-nums" aria-live="polite">
                  {selectedRows.length.toLocaleString()} selected
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {exportFileName && (
                  <Button variant="outline" size="sm" onClick={() => exportCsv(selectedRows)}>
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                )}
                {bulkActions?.(
                  selectedRows.map((r) => r.original),
                  clearSelection,
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isError ? (
        <ErrorState bare size="sm" onRetry={onRetry} />
      ) : (
        <>
          {/* Table: tablet and up (or always, when mobileLayout="scroll"). */}
          <div
            ref={scrollRef}
            className={cn(capped ? "overflow-auto" : overflowingX ? "overflow-x-auto" : "overflow-x-clip", mobileLayout === "cards" && "hidden sm:block")}
            style={maxHeight !== undefined ? { maxHeight } : undefined}
          >
            <table className="w-full caption-bottom text-sm" aria-busy={isLoading || undefined}>
              <thead className={cn(tableClasses.header, capped ? "sticky top-0 z-10" : !overflowingX && tableClasses.stickyHead)}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className={tableClasses.headerRow}>
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
                            tableClasses.head,
                            header.column.id === ACTIONS_ID && "w-12",
                            header.column.id === SELECT_ID && "w-10 pr-0 [&>button]:align-middle",
                          )}
                        >
                          {canSort && content ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "group/sort -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 uppercase tracking-[inherit] transition-colors hover:bg-secondary hover:text-foreground cursor-pointer",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                sortDir && "text-foreground",
                              )}
                            >
                              {content}
                              {sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" aria-hidden="true" />
                              ) : sortDir === "desc" ? (
                                <ArrowDown className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-30 transition-opacity group-hover/sort:opacity-70 group-focus-visible/sort:opacity-70" aria-hidden="true" />
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
                    <tr key={`skeleton-${i}`} className={tableClasses.row}>
                      {visibleColumns.map((col, j) => (
                        <td key={col.id} className="px-[var(--space-row-padding-x)] py-[var(--space-row-padding-y)]">
                          {col.id === ACTIONS_ID ? (
                            <Skeleton className="h-6 w-6 ml-auto" />
                          ) : col.id === SELECT_ID ? (
                            <Skeleton className="h-4 w-4 rounded-[4px]" />
                          ) : (
                            <Skeleton className={cn("h-4", skeletonWidths[j])} />
                          )}
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
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      {...rowInteraction(row)}
                      className={cn(
                        tableClasses.row,
                        tableClasses.rowHover,
                        tableClasses.rowSelected,
                        onRowClick && "cursor-pointer focus-visible:outline-none focus-visible:bg-accent/50 focus-visible:shadow-[inset_2px_0_0_var(--color-primary)]",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            tableClasses.cell,
                            cell.column.id === ACTIONS_ID && "text-right",
                            cell.column.id === SELECT_ID && "w-10 pr-0 [&>button]:align-middle",
                          )}
                          onClick={cell.column.id === ACTIONS_ID || cell.column.id === SELECT_ID ? (e) => e.stopPropagation() : undefined}
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
            <ul className="divide-y divide-border sm:hidden" aria-busy={isLoading || undefined}>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex gap-3 p-4">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </li>
                ))}
              {!isLoading && rows.length === 0 && <li>{renderEmpty()}</li>}
              {!isLoading &&
                rows.map((row) => {
                  const cells = row.getVisibleCells().filter((c) => c.column.id !== ACTIONS_ID && c.column.id !== SELECT_ID);
                  const [first, ...rest] = cells;
                  const actions = actionCell(row);
                  const select = selectCell(row);
                  return (
                    <li
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      {...rowInteraction(row)}
                      className={cn(
                        "p-4 transition-colors data-[state=selected]:bg-accent/70",
                        onRowClick && "cursor-pointer active:bg-accent/60 focus-visible:outline-none focus-visible:bg-accent/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {select && (
                          // Generous hit area around the small checkbox for touch.
                          <div className="-m-2 flex h-10 w-10 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {flexRender(select.column.columnDef.cell, select.getContext())}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 text-sm font-medium">{first && flexRender(first.column.columnDef.cell, first.getContext())}</div>
                        {actions && (
                          <div className="-mr-2 -mt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {flexRender(actions.column.columnDef.cell, actions.getContext())}
                          </div>
                        )}
                      </div>
                      {rest.length > 0 && (
                        <dl className={cn("mt-2.5 grid grid-cols-[minmax(0,auto)_1fr] gap-x-4 gap-y-1.5 text-sm", select && "ml-8")}>
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
        <Pagination
          pageIndex={pageIndex}
          pageCount={table.getPageCount()}
          pageSize={size}
          totalCount={filteredCount}
          from={from}
          to={to}
          onPageChange={(i) => table.setPageIndex(i)}
          onPageSizeChange={
            showPageSize
              ? server
                ? server.onPageSizeChange
                : (n) => {
                    table.setPageSize(n);
                    table.setPageIndex(0);
                  }
              : undefined
          }
          pageSizeOptions={pageSizeOptions}
          note={isSearching && !server ? `(filtered from ${data.length.toLocaleString()})` : undefined}
        />
      )}
    </div>
  );
}

/** Row above a table: description or filters on the left, primary action on the right; stacks on phones. */
export function DataTableToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between", className)}>{children}</div>;
}
