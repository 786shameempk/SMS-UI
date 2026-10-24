import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { openAttachment } from "./api";

/** A file name that opens (or downloads) the uploaded file when clicked. */
export default function AttachmentLink({ id, fileName, className }: { id: string; fileName: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation("attachments");

  const open = async () => {
    setBusy(true);
    try {
      await openAttachment(id, fileName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Could not open the file."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      title={t("View attachment")}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:cursor-wait",
        className,
      )}
    >
      {busy ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : <Paperclip className="h-3 w-3 shrink-0" />}
      <span className="truncate">{fileName}</span>
    </button>
  );
}
