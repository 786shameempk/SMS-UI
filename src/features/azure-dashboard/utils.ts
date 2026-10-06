import type { BadgeVariant } from "@/components/ui/badge";
import type { HealthState } from "./types";

/** Money in the subscription's billing currency, exactly as Azure reports it. */
export function money(amount: number | null | undefined, currency: string, digits = 2): string {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
  } catch {
    return `${amount.toFixed(digits)} ${currency}`;
  }
}

export function gb(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(digits)} GB`;
}

export function percent(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(digits)}%`;
}

export function bytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 0-100 usage of a limit, or null when either side is unknown. */
export function usagePercent(used: number | null | undefined, limit: number | null | undefined): number | null {
  return used === null || used === undefined || !limit ? null : (used / limit) * 100;
}

export type UsageLevel = "ok" | "warning" | "critical" | "unknown";

/** Above 70% is a warning and above 90% critical - the same thresholds the backend alerts use. */
export function usageLevel(percentUsed: number | null | undefined): UsageLevel {
  if (percentUsed === null || percentUsed === undefined) return "unknown";
  if (percentUsed > 90) return "critical";
  if (percentUsed > 70) return "warning";
  return "ok";
}

export const HEALTH_VARIANT: Record<HealthState, BadgeVariant> = {
  Healthy: "success",
  Warning: "warning",
  Critical: "danger",
  Unknown: "neutral",
};

export function powerVariant(state: string | null): BadgeVariant {
  if (!state) return "neutral";
  const s = state.toLowerCase();
  if (s === "running") return "success";
  if (s === "starting" || s === "stopping" || s === "deallocating") return "warning";
  return "neutral";
}

export function relativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

/** yyyy-MM-dd for the browser's calendar date (not UTC), used for the cost date filters. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function azureResourcePath(resourceId: string): string {
  return `/admin/azure/resources/detail?id=${encodeURIComponent(resourceId)}`;
}

/** Downloads rows as a CSV file generated in the browser from data already on screen. */
export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const escape = (cell: string | number | null | undefined) => {
    const text = cell === null || cell === undefined ? "" : String(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
