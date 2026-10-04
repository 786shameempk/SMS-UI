import { Link } from "react-router-dom";
import { AlertOctagon, AlertTriangle, ChevronRight, Info } from "lucide-react";
import { cn } from "@/utils/cn";
import type { AlertItem } from "../../types";

const SEVERITY = {
  critical: { icon: AlertOctagon, className: "border-destructive/30 bg-destructive-soft text-destructive-strong", label: "Critical" },
  warning: { icon: AlertTriangle, className: "border-warning/30 bg-warning-soft text-warning-strong", label: "Warning" },
  info: { icon: Info, className: "border-info/30 bg-info-soft text-info-strong", label: "Info" },
} as const;

/** Alert widget type: severity-coloured rows, each linking to the page where it can be dealt with. */
export default function AlertList({ items, label }: { items: AlertItem[]; label: string }) {
  return (
    <ul aria-label={label} className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const s = SEVERITY[item.severity];
        const body = (
          <>
            <s.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="sr-only">{s.label}: </span>
              <span className="block truncate text-sm font-semibold">{item.title}</span>
              <span className="block truncate text-xs opacity-85">{item.detail}</span>
            </span>
            {item.href && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />}
          </>
        );
        const className = cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5", s.className);
        return (
          <li key={item.id}>
            {item.href ? (
              <Link to={item.href} className={cn(className, "transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
