import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_TOOLTIP_STYLE } from "../../chartTheme";
import type { StatusSlice } from "../../types";
import { TONE } from "./tones";

/**
 * Doughnut widget type: a ring of slices with the total in the middle and a legend that doubles as the
 * accessible description (the chart itself is decorative to screen readers).
 */
export default function DoughnutChart({
  slices,
  centerLabel,
  centerValue,
  label,
}: {
  slices: StatusSlice[];
  centerLabel: string;
  centerValue: string;
  label: string;
}) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  return (
    // Laid out by the card's own width (container query), not the screen's: side by side only when the card is wide.
    <div className="@container">
      <div className="flex flex-col items-center gap-4 @md:flex-row">
        <div className="relative h-36 w-36 shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="label" innerRadius="68%" outerRadius="100%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
                {slices.map((s) => (
                  <Cell key={s.id} fill={TONE[s.tone].fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(_v, _n, item) => (item.payload as StatusSlice).detail} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-semibold tabular-nums text-foreground">{centerValue}</span>
            <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
          </div>
        </div>
        <ul aria-label={label} className="w-full min-w-0 flex-1 space-y-2">
          {slices.map((s) => (
            <li key={s.id} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TONE[s.tone].fill }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{s.label}</span>
                <span className="block truncate text-xs tabular-nums text-muted-foreground">{s.detail}</span>
              </span>
              {total > 0 && <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{Math.round((s.value / total) * 100)}%</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
