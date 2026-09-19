/** Mirrors the color language already established by dashboard's PerformanceChart/RevenueChart. */
export const CHART_GRID_COLOR = "#eef0f3";
export const CHART_AXIS_TICK = { fontSize: 12, fill: "#94a3b8" };
export const CHART_TOOLTIP_STYLE = { borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 };

export const CHART_PRIMARY = "var(--color-brand-500)";
export const CHART_SUCCESS = "#22c55e";
export const CHART_WARNING = "#eab308";
export const CHART_DANGER = "#ef4444";
export const CHART_INFO = "#3b82f6";
export const CHART_NEUTRAL = "#9ca3af";

/** Categorical palette for pie/donut breakdowns, drawn from the same success/warning/danger/info/neutral language as Badge variants. */
export const CATEGORICAL_COLORS = [CHART_PRIMARY, CHART_SUCCESS, CHART_WARNING, CHART_DANGER, CHART_INFO, CHART_NEUTRAL, "#a855f7", "#f97316"];
