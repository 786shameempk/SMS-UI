/** Shared table styling, used by the Table primitives and DataTable so every table looks the same. */
export const tableClasses = {
  /** Sticky only while the page (not this table) is the scroller; `--thead-position` lets a container opt out. */
  stickyHead: "top-0 z-10 [position:var(--thead-position,sticky)]",
  header: "bg-muted/95 backdrop-blur-sm",
  headerRow: "border-b border-border",
  row: "border-b border-border/70 last:border-0 transition-colors duration-150",
  rowHover: "hover:bg-accent/40",
  rowSelected: "data-[state=selected]:bg-accent/70 data-[state=selected]:hover:bg-accent",
  head: "h-10 px-[var(--space-row-padding-x)] text-left align-middle text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground whitespace-nowrap",
  cell: "px-[var(--space-row-padding-x)] py-[var(--space-row-padding-y)] align-middle text-foreground",
  compactHead: "h-8 px-2 first:pl-0 last:pr-0 text-left align-middle text-xs font-medium text-muted-foreground",
  compactCell: "px-2 py-1.5 first:pl-0 last:pr-0 align-middle",
};
