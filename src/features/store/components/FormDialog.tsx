import type { FormEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** A dialog around a form: Cancel and a submit button that shows progress and cannot be pressed twice. */
export default function FormDialog({
  open, onOpenChange, title, description, submitLabel, submitting, onSubmit, children, size = "md", submitDisabled, extraActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: () => void;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
  submitDisabled?: boolean;
  extraActions?: ReactNode;
}) {
  const { t } = useTranslation("store");
  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!submitting) onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className={size === "xl" ? "max-w-5xl" : size === "lg" ? "max-w-3xl" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : "sr-only"}>{description ?? title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-4">
          <div className="space-y-4 px-0.5 py-0.5">{children}</div>
          <DialogFooter>
            {extraActions}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>{t("Cancel")}</Button>
            <Button type="submit" disabled={submitting || submitDisabled}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** First error message, for showing validation under a field. */
export const firstError = (errors: Record<string, string>, key: string) => errors[key];
