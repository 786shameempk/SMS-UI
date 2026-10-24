import { Archive, Download, ExternalLink, Eye, Globe2, Pencil, Pin, PinOff, RotateCcw, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/utils/format";
import { CATEGORY_CONFIG, fileKind } from "../constants";
import type { StudyMaterial } from "../types";

import { useTranslation } from "react-i18next";
export type MaterialAction = "open" | "edit" | "publish" | "archive" | "restore" | "delete" | "pin" | "unpin";

export function audienceText(m: StudyMaterial): string {
  if (m.isGlobal) return m.className ? `${m.className} · all schools` : "All schools";
  if (m.audience === "section") return `${m.className ?? "Class"} – ${m.sectionName ?? "Section"}`;
  if (m.audience === "class") return m.className ?? "One class";
  return "All students";
}

export function MaterialActionsMenu({ material: m, onAction }: { material: StudyMaterial; onAction: (a: MaterialAction) => void }) {
  const { t } = useTranslation("study-materials");
  const p = m.permissions;
  if (!p.canEdit && !p.canPublish && !p.canArchive && !p.canRestore && !p.canDelete && !p.canPin) return null;
  return (
    <RowActions label={t("Actions for {{title}}", { title: m.title })}>
      {p.canEdit && (
        <DropdownMenuItem onClick={() => onAction("edit")}>
          <Pencil /> {t("Edit")}
        </DropdownMenuItem>
      )}
      {p.canPublish && (
        <DropdownMenuItem onClick={() => onAction("publish")}>
          <Send /> {t("Publish")}
        </DropdownMenuItem>
      )}
      {p.canPin && (
        <DropdownMenuItem onClick={() => onAction(m.isPinned ? "unpin" : "pin")}>
          {m.isPinned ? <PinOff /> : <Pin />} {m.isPinned ? t("Unpin") : t("Pin to top")}
        </DropdownMenuItem>
      )}
      {p.canRestore && (
        <DropdownMenuItem onClick={() => onAction("restore")}>
          <RotateCcw /> {t("Restore as draft")}
        </DropdownMenuItem>
      )}
      {(p.canArchive || p.canDelete) && <DropdownMenuSeparator />}
      {p.canArchive && (
        <DropdownMenuItem onClick={() => onAction("archive")}>
          <Archive /> {t("Archive")}
        </DropdownMenuItem>
      )}
      {p.canDelete && (
        <DropdownMenuItem variant="destructive" onClick={() => onAction("delete")}>
          <Trash2 /> {t("Delete")}
        </DropdownMenuItem>
      )}
    </RowActions>
  );
}

export default function MaterialCard({
  material: m,
  showStatus,
  showStats,
  onAction,
}: {
  material: StudyMaterial;
  showStatus: boolean;
  showStats: boolean;
  onAction: (a: MaterialAction) => void;
}) {
  const { t } = useTranslation("study-materials");
  const Icon = CATEGORY_CONFIG[m.category].icon;
  const kind = fileKind(m);
  const subtitle = [m.subjectName, m.chapter].filter(Boolean).join(" · ");

  return (
    <Card className="group flex h-full flex-col transition-[border-color,box-shadow] duration-200 hover:border-input hover:shadow-md">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 pt-0.5">
            <Badge variant="neutral">{t(CATEGORY_CONFIG[m.category].label)}</Badge>
            {kind && <Badge variant="default">{kind}</Badge>}
            {m.isGlobal && (
              <Badge variant="info">
                <Globe2 className="h-3 w-3" aria-hidden="true" /> {t("School Sphere")}
              </Badge>
            )}
            {m.isPinned && (
              <Badge variant="brand">
                <Pin className="h-3 w-3" aria-hidden="true" /> {t("Pinned")}
              </Badge>
            )}
          </div>
          <div className="-me-1 -mt-1">
            <MaterialActionsMenu material={m} onAction={onAction} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAction("open")}
          className="min-w-0 space-y-1 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <h3 className="line-clamp-2 text-card-title group-hover:text-primary-text transition-colors">{m.title}</h3>
          {subtitle && <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p>}
        </button>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-1.5 py-0.5">{audienceText(m)}</span>
          {showStatus && <StatusBadge status={m.status} />}
          {m.isScheduled && <Badge variant="warning">{t("From {{v1}}", { v1: formatDate(m.availableFrom!) })}</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {m.uploadedByName} · {formatDate(m.publishedAt ?? m.createdAt)}
          {showStats && (
            <span className="ms-1.5 tabular-nums" aria-label={t("{{viewCount}} views, {{downloadCount}} downloads", { viewCount: m.viewCount, downloadCount: m.downloadCount })}>
              · <Eye className="inline h-3 w-3" aria-hidden="true" /> {m.viewCount} · <Download className="inline h-3 w-3" aria-hidden="true" /> {m.downloadCount}
            </span>
          )}
        </p>
        {m.downloadUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={m.downloadUrl} aria-label={t("Download {{title}}", { title: m.title })}>
              <Download className="h-3.5 w-3.5" /> {t("Download")}
            </a>
          </Button>
        ) : m.linkUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={m.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={t("Open link for {{title}} (opens in a new tab)", { title: m.title })}>
              <ExternalLink className="h-3.5 w-3.5" /> {t("Open")}
            </a>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
