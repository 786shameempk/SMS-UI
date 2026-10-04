import type { WidgetTone } from "../../types";

/** Tailwind classes per tone, shared by every widget type so a "danger" bar and a "danger" dot match. */
export const TONE: Record<WidgetTone, { bar: string; text: string; soft: string; fill: string }> = {
  brand: { bar: "bg-primary", text: "text-primary-text", soft: "bg-accent text-accent-foreground", fill: "var(--color-primary)" },
  success: { bar: "bg-success", text: "text-success-strong", soft: "bg-success-soft text-success-strong", fill: "var(--color-success)" },
  info: { bar: "bg-info", text: "text-info-strong", soft: "bg-info-soft text-info-strong", fill: "var(--color-info)" },
  warning: { bar: "bg-warning", text: "text-warning-strong", soft: "bg-warning-soft text-warning-strong", fill: "var(--color-warning)" },
  danger: { bar: "bg-destructive", text: "text-destructive-strong", soft: "bg-destructive-soft text-destructive-strong", fill: "var(--color-destructive)" },
  muted: { bar: "bg-muted-foreground/40", text: "text-muted-foreground", soft: "bg-secondary text-muted-foreground", fill: "var(--color-muted-foreground)" },
};
