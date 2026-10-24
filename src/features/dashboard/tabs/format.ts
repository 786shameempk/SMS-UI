import { dashboardT, type Translate } from "./i18n";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Compact rupee amounts for tiles: ₹1.2L, ₹3.4Cr, ₹850. Indian digit grouping, as the Overview's fee cards use. */
export function compactInr(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

function trim(n: number): string {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
}

export function percent(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(digits)}%`;
}

/** Share of `part` in `whole` as a whole percent, 0 when there is no whole. */
export function share(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.round((part / whole) * 100);
}

/** "2026-07" -> "Jul 26", for chart axes. Month names follow the interface language. */
export function monthLabel(month: string, t: Translate = dashboardT): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTHS[m - 1];
  return `${name ? t(name) : month} ${String(y).slice(2)}`;
}

/** "2026-10-07" -> "7 Oct". */
export function dayLabel(day: string, t: Translate = dashboardT): string {
  const [, m, d] = day.split("-").map(Number);
  const name = MONTHS[m - 1];
  return `${d} ${name ? t(name) : ""}`.trim();
}

/** "09:05:00" -> "9:05 AM". */
export function timeLabel(time: string | null | undefined, t: Translate = dashboardT): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return t(h >= 12 ? "{{time}} PM" : "{{time}} AM", { time: `${hour}:${String(m).padStart(2, "0")}` });
}

/** Splits CamelCase from the API ("FeeCollection" -> "Fee collection"). */
export function humanize(value: string): string {
  const spaced = value.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
