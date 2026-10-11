import { useEffect, useState } from "react";
import { extractApiErrorMessage } from "@/lib/httpClient";

export const errorText = (error: unknown) => extractApiErrorMessage(error);

export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** "3 minutes ago" style, falling back to a date for anything older than a week. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d <= 7 ? `${d} day${d === 1 ? "" : "s"} ago` : new Date(iso).toLocaleDateString();
}

export const dateTime = (iso: string) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`).toLocaleString();

export const money = (amount: number, currency = "INR") => `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const day = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
