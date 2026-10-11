import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

/** Small building blocks shared by the office screens, so each page stays about its own content. */
const plural = (noun: string) => (noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`);

export function Pager({ page, totalPages, totalCount, onPage, noun = "result" }: { page: number; totalPages: number; totalCount: number; onPage: (page: number) => void; noun?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
      <span aria-live="polite">
        {totalCount.toLocaleString()} {totalCount === 1 ? noun : plural(noun)}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** A confirmation for a high-impact action: says what will happen, and the button is the only way forward. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  busy,
  error,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {error && (
          <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive-strong">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const OUTCOME: Record<string, BadgeVariant> = { Success: "success", Failure: "danger", Denied: "warning" };

export const OutcomeBadge = ({ outcome }: { outcome: string }) => <Badge variant={OUTCOME[outcome] ?? "neutral"}>{outcome}</Badge>;

export function FormErrorBanner({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive-strong", className)}>
      {message}
    </p>
  );
}
