import * as React from "react";
import { useHorizontalOverflow } from "@/hooks/useHorizontalOverflow";
import { cn } from "@/utils/cn";
import { tableClasses } from "./table-classes";

/**
 * Plain table building blocks with the same look as DataTable, for tables DataTable can't express
 * (editable grids, matrices, day-by-day reports, small summaries inside cards).
 *
 * `density="compact"` tightens cells for small tables inside cards. `stickyHeader` keeps the header row
 * pinned to the top of the page while the table fits the width (a wider table scrolls sideways instead).
 */
type Density = "default" | "compact";
const TableContext = React.createContext<{ density: Density; sticky: boolean }>({ density: "default", sticky: false });


interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: Density;
  stickyHeader?: boolean;
  /** Classes for the scroll wrapper (e.g. a max height, or rounded borders). */
  containerClassName?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, density = "default", stickyHeader = false, ...props }, ref) => {
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const overflowing = useHorizontalOverflow(wrapperRef, stickyHeader);
    // A scroll container would trap the sticky header, so only scroll sideways when the table is too wide.
    const scrollX = !stickyHeader || overflowing;
    const ctx = React.useMemo(() => ({ density, sticky: stickyHeader && !overflowing }), [density, stickyHeader, overflowing]);
    return (
      <TableContext.Provider value={ctx}>
        <div ref={wrapperRef} className={cn("relative w-full", scrollX ? "overflow-x-auto" : "overflow-x-clip", containerClassName)}>
          <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
        </div>
      </TableContext.Provider>
    );
  },
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => {
  const { density, sticky } = React.useContext(TableContext);
  return (
    <thead
      ref={ref}
      className={cn(
        // Rows drop their last-row divider; the header row (always last in thead) keeps it.
        "[&_tr:last-child]:border-b [&_tr]:border-border",
        density !== "compact" && tableClasses.header,
        sticky && tableClasses.stickyHead,
        className,
      )}
      {...props}
    />
  );
});
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={className} {...props} />
));
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("border-t border-border bg-muted/40 font-medium [&>tr]:last:border-b-0", className)} {...props} />
));
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Highlight on hover (on by default for body rows; header rows turn it off automatically). */
  hover?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(({ className, hover = true, ...props }, ref) => {
  const { density } = React.useContext(TableContext);
  return (
    <tr
      ref={ref}
      className={cn(
        density === "compact" ? "border-b border-border/60 last:border-0" : tableClasses.row,
        hover && density !== "compact" && "[tbody_&]:hover:bg-accent/40",
        tableClasses.rowSelected,
        className,
      )}
      {...props}
    />
  );
});
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, scope, ...props }, ref) => {
  const { density } = React.useContext(TableContext);
  return <th ref={ref} scope={scope ?? "col"} className={cn(density === "compact" ? tableClasses.compactHead : tableClasses.head, className)} {...props} />;
});
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => {
  const { density } = React.useContext(TableContext);
  return <td ref={ref} className={cn(density === "compact" ? tableClasses.compactCell : tableClasses.cell, className)} {...props} />;
});
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-3 text-xs text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";
