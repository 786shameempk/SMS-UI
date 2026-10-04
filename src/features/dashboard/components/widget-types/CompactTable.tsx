import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { tableClasses } from "@/components/ui/table-classes";

export interface CompactColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Right-align numbers. */
  numeric?: boolean;
  /** Hide on narrow cards/phones to keep the table readable. */
  hideOnNarrow?: boolean;
}

/**
 * Table widget type: a small, read-only table in the app's table styling, scrolling sideways inside the card
 * rather than stretching the page on a phone.
 */
export default function CompactTable<T>({ columns, rows, rowKey, label }: { columns: CompactColumn<T>[]; rows: T[]; rowKey: (row: T) => string; label: string }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full text-sm" aria-label={label}>
        <thead>
          <tr className={tableClasses.headerRow}>
            {columns.map((c) => (
              <th key={c.id} scope="col" className={cn(tableClasses.compactHead, c.numeric && "text-right", c.hideOnNarrow && "hidden sm:table-cell")}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={tableClasses.row}>
              {columns.map((c) => (
                <td key={c.id} className={cn(tableClasses.compactCell, c.numeric && "text-right tabular-nums", c.hideOnNarrow && "hidden sm:table-cell")}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
