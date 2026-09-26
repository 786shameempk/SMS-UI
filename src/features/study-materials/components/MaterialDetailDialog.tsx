import { Download, ExternalLink, FileText, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/utils/format";
import { CATEGORY_CONFIG, fileKind, formatBytes } from "../constants";
import type { StudyMaterial } from "../types";
import { audienceText, MaterialActionsMenu, type MaterialAction } from "./MaterialCard";

/** YouTube links become an embedded player; anything else is opened in a new tab. */
function youTubeEmbed(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export default function MaterialDetailDialog({
  material: m,
  onOpenChange,
  onAction,
  showStats,
}: {
  material: StudyMaterial | null;
  onOpenChange: (open: boolean) => void;
  onAction: (a: MaterialAction, m: StudyMaterial) => void;
  showStats: boolean;
}) {
  const embed = youTubeEmbed(m?.linkUrl);
  const isImage = m?.contentType?.startsWith("image/");
  return (
    <Dialog open={Boolean(m)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {m && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="neutral">{CATEGORY_CONFIG[m.category].label}</Badge>
                {m.isGlobal && (
                  <Badge variant="info">
                    <Globe2 className="h-3 w-3" aria-hidden="true" /> Shared by EduCore
                  </Badge>
                )}
                {m.status !== "published" && <StatusBadge status={m.status} />}
                {m.isScheduled && <Badge variant="warning">Visible to students from {formatDate(m.availableFrom!)}</Badge>}
              </div>
              <DialogTitle className="pr-8">{m.title}</DialogTitle>
              <DialogDescription>{[m.subjectName, m.chapter, audienceText(m)].filter(Boolean).join(" · ")}</DialogDescription>
            </DialogHeader>

            {/* Preview: PDFs, images and YouTube inline; other formats download. */}
            {m.isPreviewable && m.viewUrl ? (
              isImage ? (
                <img src={m.viewUrl} alt={m.title} className="max-h-[60vh] w-full rounded-lg border border-border bg-muted object-contain" />
              ) : (
                <iframe title={`Preview of ${m.title}`} src={m.viewUrl} className="h-[60vh] w-full rounded-lg border border-border bg-muted" />
              )
            ) : embed ? (
              <iframe
                title={`Video: ${m.title}`}
                src={embed}
                className="aspect-video w-full rounded-lg border border-border"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : m.fileName ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <FileText className="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{m.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {fileKind(m)} · {formatBytes(m.sizeBytes)} · download to open
                  </p>
                </div>
              </div>
            ) : null}

            {m.description && <p className="whitespace-pre-line text-sm leading-6 text-secondary-foreground">{m.description}</p>}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
              {(
                [
                  ["Uploaded by", m.uploadedByName],
                  ["Published", m.publishedAt ? formatDate(m.publishedAt) : "Not yet"],
                  ["Class", audienceText(m)],
                  ["Subject", m.subjectName ?? "Any"],
                  ...(m.availableFrom || m.availableUntil
                    ? [["Available", `${m.availableFrom ? formatDate(m.availableFrom) : "Now"} – ${m.availableUntil ? formatDate(m.availableUntil) : "No end date"}`]]
                    : []),
                  ...(showStats ? [["Engagement", `${m.viewCount} views · ${m.downloadCount} downloads`]] : []),
                ] as Array<[string, string]>
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>

            <DialogFooter className="sm:justify-between">
              <MaterialActionsMenu material={m} onAction={(a) => onAction(a, m)} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {m.linkUrl && (
                  <Button asChild variant="outline">
                    <a href={m.linkUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> Open link
                    </a>
                  </Button>
                )}
                {m.downloadUrl && (
                  <Button asChild>
                    <a href={m.downloadUrl}>
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
