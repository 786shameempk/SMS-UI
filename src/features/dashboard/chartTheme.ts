/** Shared Recharts styling for dashboard charts, built on theme tokens so charts follow dark mode and brand presets. */
export const CHART_GRID = { strokeDasharray: "3 3", vertical: false, stroke: "var(--color-border)" } as const;

export const CHART_TICK = { fontSize: 12, fill: "var(--color-muted-foreground)" } as const;

export const CHART_TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
  boxShadow: "0 8px 24px -12px rgb(15 23 42 / 0.25)",
} as const;

export const CHART_LEGEND_STYLE = { fontSize: 12, paddingTop: 8 } as const;
