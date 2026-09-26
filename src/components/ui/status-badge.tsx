import { Badge, type BadgeVariant } from "@/components/ui/badge";

/**
 * Status words used across modules, mapped to one consistent tone. Anything not listed falls back to
 * `neutral`, so a new backend status still renders sensibly. Pass `variant` to override per call.
 */
const TONE_BY_STATUS: Record<string, BadgeVariant> = {
  // positive / done
  active: "success", approved: "success", paid: "success", present: "success", completed: "success", resolved: "success",
  published: "success", issued: "success", available: "success", enrolled: "success", passed: "success", verified: "success",
  delivered: "success", open: "success", admitted: "success", confirmed: "success", checkedin: "success", returned: "success",
  // in-flight / attention
  pending: "warning", partial: "warning", partiallypaid: "warning", late: "warning", draft: "neutral", review: "warning",
  inreview: "warning", inprogress: "info", processing: "info", scheduled: "info", upcoming: "info", reserved: "info",
  onleave: "warning", leave: "warning", halfday: "warning", due: "warning", lowstock: "warning", waitlisted: "warning",
  live: "danger",
  // negative / stopped
  inactive: "neutral", absent: "danger", rejected: "danger", overdue: "danger", failed: "danger", cancelled: "neutral",
  canceled: "neutral", suspended: "danger", expired: "neutral", closed: "neutral", archived: "neutral", blocked: "danger",
  outofstock: "danger", resigned: "neutral", terminated: "danger", graduated: "info", transferred: "neutral", refunded: "info",
  unpaid: "danger", lost: "danger", checkedout: "neutral", ended: "neutral",
};

function normalize(status: string) {
  return status.toLowerCase().replace(/[\s_-]/g, "");
}

/** "partiallyPaid" / "PARTIALLY_PAID" / "partially paid" → "Partially paid" */
export function humanizeStatus(status: string) {
  const spaced = status
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function statusTone(status: string): BadgeVariant {
  return TONE_BY_STATUS[normalize(status)] ?? "neutral";
}

export function StatusBadge({
  status,
  label,
  variant,
  className,
}: {
  status: string;
  label?: string;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <Badge variant={variant ?? statusTone(status)} dot className={className}>
      {label ?? humanizeStatus(status)}
    </Badge>
  );
}
