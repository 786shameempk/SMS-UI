import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { NS } from "../shared";

import { useTranslation } from "react-i18next";

/** Asks for a short note (a reason or a comment) before an irreversible or audited step. */
export default function CommentDialog({
  open,
  title,
  description,
  label,
  confirmLabel,
  required,
  pending,
  blocked: extraBlocked,
  children,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  confirmLabel: string;
  required?: boolean;
  pending?: boolean;
  /** Other input the parent collects (children) is still missing. */
  blocked?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: (text: string) => void;
}) {
  const { t } = useTranslation(NS);
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) setText("");
  }, [open]);
  const blocked = (Boolean(required) && !text.trim()) || Boolean(extraBlocked);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <FormField label={label ?? t("Comment")} htmlFor="appraisal-comment" required={required} optional={!required}>
          <Textarea id="appraisal-comment" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={pending} disabled={blocked || pending} onClick={() => onConfirm(text.trim())}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
