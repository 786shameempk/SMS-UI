import { useState, type ReactNode } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "./kit";

const VARIANT: Record<string, BadgeVariant> = {
  // quotations
  Draft: "neutral", Generated: "info", PendingApproval: "warning", Converted: "success", Approved: "success", Rejected: "danger", Cancelled: "neutral", Expired: "neutral",
  // invoices / payments / purchases
  Issued: "info", PartiallyPaid: "warning", Paid: "success", Void: "neutral", Pending: "warning", PendingVerification: "warning", Verified: "success", Credited: "success",
  AwaitingPayment: "warning", Ready: "info", Fulfilled: "success",
  // subscriptions
  Trial: "info", Active: "success", PaymentOverdue: "danger", RenewalPending: "warning", Suspended: "danger",
  // schools / tasks / alerts
  Open: "info", Completed: "success", Lost: "neutral", Blocked: "danger", Failed: "danger", Applied: "success", Sent: "success", NotSent: "neutral",
  Critical: "danger", High: "danger", Medium: "warning", Low: "info", Acknowledged: "warning", Resolved: "success",
};

/** The same status gets the same colour on every screen. */
export function StatusBadge({ status, children }: { status: string | null | undefined; children?: ReactNode }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={VARIANT[status] ?? "neutral"}>{children ?? status.replace(/([a-z])([A-Z])/g, "$1 $2")}</Badge>;
}

/** A confirmation that must carry a written reason, which the server records. */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  label = "Reason",
  destructive,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  label?: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      destructive={destructive}
      busy={busy}
      error={error}
      onClose={() => {
        setReason("");
        onClose();
      }}
      onConfirm={() => trimmed && onConfirm(trimmed)}
    >
      <div className="space-y-1.5">
        <Label htmlFor="office-reason">{label}</Label>
        <Textarea id="office-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        {!trimmed && <p className="text-xs text-muted-foreground">Required. It is kept in the audit log.</p>}
      </div>
    </ConfirmDialog>
  );
}

/** A label/value pair for read-only detail panels. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children ?? "—"}</dd>
    </div>
  );
}

/** A labelled input. The label wraps the control, so it is announced and clickable without ids. */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className ?? ""}`}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
