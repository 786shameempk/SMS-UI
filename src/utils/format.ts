import { currentLocale } from "@/i18n";

/**
 * Dates, numbers and money in the interface language's locale (en-IN, ml-IN, hi-IN, ta-IN, ar). Digits stay Latin
 * ("latn") in every language: school records, receipts and phone numbers are read and typed in Latin digits.
 */
const locale = () => `${currentLocale()}-u-nu-latn`;

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat(locale(), { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale(), options).format(value);
}

export function formatRelativeDay(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const diffDays = Math.round((date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

  if (diffDays > -7 && diffDays < 7) {
    // "today", "tomorrow", "in 3 days", "2 days ago" in the interface language.
    const text = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" }).format(diffDays, "day");
    return text.charAt(0).toLocaleUpperCase(currentLocale()) + text.slice(1);
  }
  return new Date(isoDate).toLocaleDateString(locale(), { month: "short", day: "numeric" });
}

export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(locale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "26 Sep 2026". Date-only strings ("2026-09-26") are read as local calendar dates, not UTC midnight. */
export function formatDate(isoDate: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
  return date.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
}
