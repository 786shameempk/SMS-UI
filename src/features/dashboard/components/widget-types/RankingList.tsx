import { cn } from "@/utils/cn";
import type { RankedItem } from "../../types";
import { TONE } from "./tones";

/**
 * Ranking widget type: numbered rows with a 0-100 bar - class-wise attendance, top performers, anything "who's
 * highest". Rows with no value (nothing to measure yet) show an empty track.
 */
export default function RankingList({ items, numbered = true, label }: { items: RankedItem[]; numbered?: boolean; label: string }) {
  return (
    <ol aria-label={label} className="space-y-2.5">
      {items.map((item, i) => {
        const tone = TONE[item.tone ?? "brand"];
        return (
          <li key={item.id} className="flex items-center gap-3">
            {numbered && (
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                  i < 3 && item.value !== null ? tone.soft : "bg-secondary text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {i + 1}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                <span className={cn("shrink-0 text-xs font-semibold tabular-nums", item.value === null ? "text-muted-foreground" : tone.text)}>{item.display}</span>
              </div>
              {item.sublabel && <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>}
              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                role="meter"
                aria-label={item.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.value ?? undefined}
                aria-valuetext={item.display}
              >
                <div className={cn("h-full rounded-full transition-[width] duration-500", tone.bar)} style={{ width: `${Math.max(0, Math.min(100, item.value ?? 0))}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
