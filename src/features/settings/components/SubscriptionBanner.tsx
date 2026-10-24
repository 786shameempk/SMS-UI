import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { useTranslation } from "react-i18next";
import { getSubscription } from "../api";
import type { SubscriptionNoticeLevel } from "../types";

const TONE: Record<Exclude<SubscriptionNoticeLevel, "ok">, string> = {
  notice: "border-info/30 bg-info-soft text-info-strong",
  warning: "border-warning/40 bg-warning-soft text-warning-strong",
  critical: "border-destructive/30 bg-destructive-soft text-destructive-strong",
};

const dismissKey = (tenant: string | null, notice: string) => `subscription-notice:${tenant ?? ""}:${notice}`;

function wasDismissed(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * Tells a school administrator, on every page, that their subscription is about to end or has a payment overdue, so a lock-out
 * is never a surprise. Only the administrator sees it (the only person who can act on it), only when the office manages the
 * school, and a plain reminder can be dismissed for the session; a warning about to cut access cannot. No amounts are shown.
 */
export default function SubscriptionBanner() {
  const role = useAuthStore((s) => s.user?.role);
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const [, bump] = useState(0);
  const { t } = useTranslation("settings");
  const query = useQuery({ queryKey: ["settings", "subscription", tenantId], queryFn: getSubscription, enabled: role === "admin", staleTime: 5 * 60_000, retry: false });

  const s = query.data;
  if (role !== "admin" || !s?.managedByOffice || !s.notice || !s.noticeLevel || s.noticeLevel === "ok") return null;
  const key = dismissKey(tenantId, s.notice);
  if (s.noticeLevel === "notice" && wasDismissed(key)) return null;
  const Icon = s.noticeLevel === "notice" ? CalendarClock : AlertTriangle;

  return (
    <div role={s.noticeLevel === "critical" ? "alert" : "status"} className={cn("flex items-start gap-3 border-b px-4 py-2.5 text-sm", TONE[s.noticeLevel])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {s.notice}{" "}
        <Link to="/admin/settings?tab=subscription" className="font-medium underline underline-offset-2">
          {t("View subscription")}
        </Link>
      </p>
      {s.noticeLevel === "notice" && (
        <button
          type="button"
          aria-label={t("Dismiss")}
          className="rounded p-0.5 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            try {
              sessionStorage.setItem(key, "1");
            } catch {
              // the reminder simply comes back on the next page
            }
            bump((n) => n + 1);
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
