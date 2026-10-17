import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";

/** "general": documents, slides, sheets, images, zip. "document": text, Word and PDF only. */
export type AttachmentKind = "general" | "document";

export interface UploadedAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** What a form holds for an attached file: the uploaded file's id and the name to show. */
export interface AttachmentRef {
  id: string;
  fileName: string;
}

export const MAX_ATTACHMENT_MB = 10;

export const toAttachmentRef = (id?: string | null, fileName?: string | null): AttachmentRef | null => (id && fileName ? { id, fileName } : null);

/**
 * What to send when saving a form that has an attachment field: a new file id when it was replaced, a removal flag when it was
 * cleared, nothing when it is unchanged (the server then leaves the stored attachment alone).
 */
export function attachmentChange(original: AttachmentRef | null, current: AttachmentRef | null): { attachmentId?: string; removeAttachment?: boolean } {
  if (current && current.id !== original?.id) return { attachmentId: current.id };
  if (!current && original) return { removeAttachment: true };
  return {};
}

const ACCEPT: Record<AttachmentKind, string> = {
  general: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip",
  document: ".pdf,.doc,.docx,.txt",
};

export const attachmentAccept = (kind: AttachmentKind) => ACCEPT[kind];

export const attachmentHint = (kind: AttachmentKind) =>
  kind === "document"
    ? `PDF, Word or text file, up to ${MAX_ATTACHMENT_MB} MB.`
    : `PDF, Word, PowerPoint, Excel, image, text or zip, up to ${MAX_ATTACHMENT_MB} MB.`;

export async function uploadAttachment(file: File, kind: AttachmentKind = "general"): Promise<UploadedAttachment> {
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) throw new Error(`The file is larger than ${MAX_ATTACHMENT_MB} MB.`);
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  try {
    // The shared client defaults to JSON; naming multipart lets axios add the boundary itself.
    const { data } = await academicHttpClient.post<UploadedAttachment>("/api/attachments", form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, "Could not upload the file."));
  }
}

/**
 * Opens an uploaded file. The download is authenticated (bearer token), so it is fetched as a blob and shown from an object URL:
 * PDFs, images and text open in a new tab, everything else is saved under its own name.
 */
export async function openAttachment(id: string, fileName: string): Promise<void> {
  let blob: Blob;
  try {
    const { data } = await academicHttpClient.get<Blob>(`/api/attachments/${id}`, { responseType: "blob" });
    blob = data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, "Could not open the file."));
  }
  const url = URL.createObjectURL(blob);
  const previewable = blob.type === "application/pdf" || blob.type.startsWith("image/") || blob.type === "text/plain";
  if (previewable) {
    window.open(url, "_blank", "noopener");
  } else {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  // Give the new tab / download time to read the blob before it is released.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
