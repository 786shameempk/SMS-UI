import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { subjectDrillDown } from "../api";
import { CHAPTER_STATUS, PROGRESS_STATUS, ProgressBar, RiskBadge, StatusBadge, formatDate, formatDay, pct } from "../shared";
import { Detail } from "./bits";

/** Delayed subject -> its class and section, teacher, chapters, pending topics, the same subject in other sections, and a catch-up schedule. */
export default function DrillDownDialog({ target, onClose }: { target: { planId: string; sectionId: string } | null; onClose: () => void }) {
  const query = useQuery({
    queryKey: ["portions", "drill-down", target?.planId, target?.sectionId],
    queryFn: () => subjectDrillDown(target!.planId, target!.sectionId),
    enabled: Boolean(target),
  });
  const d = query.data;

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d ? `${d.status.subjectName} · ${d.status.className} ${d.status.sectionName}` : "Subject progress"}</DialogTitle>
          <DialogDescription>{d?.status.syllabusTitle ?? "Loading the chapters, topics and teacher for this subject."}</DialogDescription>
        </DialogHeader>

        {query.isLoading && <Skeleton className="h-48 w-full" />}
        {query.isError && <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />}
        {d && (
          <div className="space-y-5 overflow-y-auto">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Detail label="Teacher">{d.status.teacherName ?? "Not assigned"}</Detail>
              <Detail label="Status">
                <RiskBadge risk={d.status.risk} />
              </Detail>
              <Detail label="Deadline">{formatDate(d.status.deadline)}</Detail>
              <Detail label="Forecast finish">{d.status.forecast ? formatDate(d.status.forecast) : "Not enough data"}</Detail>
            </dl>
            <ProgressBar percent={d.status.percent} planned={d.status.plannedPercent} risk={d.status.risk} />
            <p className="text-xs text-muted-foreground">
              {d.status.completedChapters} of {d.status.totalChapters} chapters done · {d.status.remainingPeriods} periods to teach
              {d.status.availablePeriods !== null && d.status.availablePeriods !== undefined ? ` · ${d.status.availablePeriods} periods left before the deadline` : ""}.
            </p>

            <section aria-labelledby="dd-chapters" className="space-y-2">
              <h3 id="dd-chapters" className="text-sm font-semibold">
                Chapters
              </h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {d.chapters.map((c) => (
                  <li key={c.chapterId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 font-medium">{c.chapterTitle}</span>
                    {c.overdue && (
                      <Badge variant="danger">
                        <CircleAlert className="mr-1 h-3 w-3" aria-hidden="true" />
                        Overdue
                      </Badge>
                    )}
                    <StatusBadge map={CHAPTER_STATUS} value={c.status} />
                    <span className="text-xs text-muted-foreground">{c.deadline ? `Due ${formatDate(c.deadline)}` : "No deadline"}</span>
                    <span className="w-14 text-right text-xs tabular-nums">{pct(c.percent)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {d.pendingTopics.length > 0 && (
              <section aria-labelledby="dd-topics" className="space-y-2">
                <h3 id="dd-topics" className="text-sm font-semibold">
                  Pending topics ({d.pendingTopics.length})
                </h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {d.pendingTopics.slice(0, 40).map((t) => (
                    <li key={t.topicId} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        {t.title}
                        <span className="block text-xs text-muted-foreground">{t.chapterTitle}</span>
                      </span>
                      <StatusBadge map={PROGRESS_STATUS} value={t.status} />
                      <span className="text-xs text-muted-foreground">{t.plannedPeriods} periods</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {d.catchUp && (
              <section aria-labelledby="dd-catchup" className="space-y-2">
                <h3 id="dd-catchup" className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Suggested catch-up schedule
                </h3>
                <p className="text-sm text-muted-foreground">{d.catchUp.summary}</p>
                {d.catchUp.items.length > 0 && (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {d.catchUp.items.slice(0, 60).map((i, idx) => (
                      <li key={`${i.topicId}-${idx}`} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                        <span className="w-28 shrink-0 text-xs text-muted-foreground">{formatDay(i.date)}</span>
                        <span className="min-w-0 flex-1 truncate">{i.topicTitle}</span>
                        <span className="text-xs text-muted-foreground">{i.periods} period{i.periods === 1 ? "" : "s"}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {d.catchUp.unscheduled.length > 0 && (
                  <p className="text-xs text-destructive-strong">Does not fit: {d.catchUp.unscheduled.slice(0, 8).join(", ")}{d.catchUp.unscheduled.length > 8 ? "…" : ""}</p>
                )}
                <p className="text-xs text-muted-foreground">This is a suggestion for the teacher to review. It does not change any plan or teaching record.</p>
              </section>
            )}

            {d.otherSections.length > 0 && (
              <section aria-labelledby="dd-sections" className="space-y-2">
                <h3 id="dd-sections" className="text-sm font-semibold">
                  Other sections of {d.status.className}
                </h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {d.otherSections.map((s) => (
                    <li key={s.sectionId} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-20 shrink-0 font-medium">{s.sectionName}</span>
                      <span className="min-w-0 flex-1 text-xs text-muted-foreground">{s.teacherName ?? "No teacher"}</span>
                      <ProgressBar percent={s.percent} planned={s.plannedPercent} risk={s.risk} className="w-44" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
