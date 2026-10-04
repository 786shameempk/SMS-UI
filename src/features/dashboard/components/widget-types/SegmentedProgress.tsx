import { cn } from "@/utils/cn";
import type { WidgetTone } from "../../types";
import { TONE } from "./tones";

export interface ProgressSegment {
  id: string;
  label: string;
  value: number;
  tone: WidgetTone;
}

/**
 * Progress widget type: one bar split into coloured segments (present / late / absent / leave) with a legend.
 * The headline percent sits above it so the number reads first.
 */
export default function SegmentedProgress({
  title,
  subtitle,
  percent,
  segments,
}: {
  title: string;
  subtitle?: string;
  /** Null = nothing measured yet. */
  percent: number | null;
  segments: ProgressSegment[];
}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className={cn("shrink-0 text-2xl font-semibold tabular-nums", percent === null ? "text-muted-foreground" : percent >= 90 ? TONE.success.text : percent >= 75 ? TONE.warning.text : TONE.danger.text)}>
          {percent === null ? "—" : `${percent}%`}
        </span>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={`${title}: ${segments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(", ")}`}
      >
        {total > 0 &&
          segments.map((s) => (s.value > 0 ? <div key={s.id} className={TONE[s.tone].bar} style={{ width: `${(s.value / total) * 100}%` }} /> : null))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
        {segments.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", TONE[s.tone].bar)} />
            <span className="tabular-nums">{s.value}</span> {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
