import { useId, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AttachmentLink from "./AttachmentLink";
import { attachmentAccept, attachmentHint, uploadAttachment, type AttachmentKind, type AttachmentRef } from "./api";

/**
 * Upload, view and remove one file. The file is uploaded as soon as it is chosen and the form keeps only its id and name
 * (`value`), so saving the form is a normal JSON request. `onChange(null)` means the file was removed.
 */
export default function AttachmentField({
  label = "Attachment",
  kind = "general",
  value,
  onChange,
  disabled,
}: {
  label?: string;
  kind?: AttachmentKind;
  value: AttachmentRef | null;
  onChange: (value: AttachmentRef | null) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file, kind);
      onChange({ id: uploaded.id, fileName: uploaded.fileName });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload the file.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} optional>{label}</Label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={attachmentAccept(kind)}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        {value && (
          <span className="inline-flex max-w-full items-center rounded-md border border-border bg-muted/40 px-2 py-1 text-sm">
            <AttachmentLink id={value.id} fileName={value.fileName} />
          </span>
        )}
        <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : value ? "Replace file" : "Upload file"}
        </Button>
        {value && !uploading && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive-strong" disabled={disabled} onClick={() => onChange(null)}>
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </Button>
        )}
      </div>
      {error ? (
        <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{attachmentHint(kind)}</p>
      )}
    </div>
  );
}
