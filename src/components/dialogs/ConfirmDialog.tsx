import { AlertTriangle, HelpCircle } from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"];
  onConfirm: () => void | Promise<void>;
  submitting?: boolean;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  onConfirm,
  submitting,
}: ConfirmDialogProps) {
  const destructive = confirmVariant === "destructive";
  const Icon = destructive ? AlertTriangle : HelpCircle;
  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 pt-1">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              destructive ? "bg-destructive-soft text-destructive-strong" : "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="pt-2 text-sm leading-6 text-secondary-foreground">{description}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} loading={submitting} autoFocus={!destructive}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
