import { formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import { REVIEW_ACTION_CONFIG } from "../constants";
import type { TalentReviewEntry } from "../types";

/** Approval history, newest first: who did what, when, and what they said. */
export default function ReviewTimeline({ entries }: { entries: TalentReviewEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No review activity yet.</p>;
  return (
    <ol className="relative space-y-4">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
      {entries.map((e) => {
        const config = REVIEW_ACTION_CONFIG[e.action];
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={cn("relative z-10 mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] ring-4 ring-card", config.tone)} aria-hidden="true">
              {config.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{config.label}</span>
                <span className="text-muted-foreground"> · {e.actorName}</span>
                {e.actorRole && <span className="text-muted-foreground capitalize"> ({e.actorRole})</span>}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
              {e.comment && <p className="mt-1.5 rounded-xl bg-secondary/70 px-3 py-2 text-sm text-foreground whitespace-pre-line">{e.comment}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
