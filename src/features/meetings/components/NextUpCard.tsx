import { Link } from "react-router-dom";
import { CalendarCheck2, Clock, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { MEETING_TYPES } from "../constants";
import { useNow } from "../hooks";
import type { MeetingSummary } from "../types";
import { countdown, formatDayLabel, formatDuration, formatTime, relativeStart } from "../utils";
import { MeetingStatusBadge } from "./Badges";
import JoinMeetingButton from "./JoinMeetingButton";

/**
 * The one thing every screen answers first: "what's next, and can I join it?" A single large card with a
 * single button; everything else on the page is secondary (design doc, "UI concept").
 */
export default function NextUpCard({ meeting }: { meeting: MeetingSummary | undefined }) {
  const now = useNow(1000);

  if (!meeting) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-5 py-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <CalendarCheck2 className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-foreground">You're all caught up</p>
          <p className="text-sm text-muted-foreground">No more classes or meetings today.</p>
        </div>
      </div>
    );
  }

  const type = MEETING_TYPES[meeting.meetingType];
  const live = meeting.status === "Live";
  const clock = countdown(meeting.startUtc, now);
  const who = meeting.myRelation === "Host" ? "You're hosting" : meeting.hostName;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
        live
          ? "border-success/30 bg-gradient-to-br from-green-50 via-card to-card dark:from-green-950/40"
          : "border-primary/30 bg-gradient-to-br from-brand-50 via-card to-card dark:border-border dark:from-brand-900/30",
      )}
    >
      <Link to={`/online-classes/${meeting.id}`} className="absolute inset-0 focus-visible:outline-none" aria-label={`Open ${meeting.title}`} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:w-40 sm:shrink-0 sm:flex-col sm:items-start sm:gap-1 sm:border-r sm:border-border sm:pr-5">
          <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">{formatTime(meeting.startUtc)}</p>
          <p className={cn("text-sm font-medium", live ? "text-success-strong" : "text-primary-text dark:text-brand-300")}>
            {live ? "Happening now" : clock ? `Starts in ${clock}` : `${formatDayLabel(meeting.startUtc)} · ${relativeStart(meeting.startUtc, now)}`}
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next up</span>
            <MeetingStatusBadge status={meeting.status} isRescheduled={meeting.isRescheduled} />
          </div>
          <h2 className="truncate text-xl font-bold text-foreground">
            {meeting.title}
            {meeting.classLabel && <span className="font-medium text-muted-foreground"> · {meeting.classLabel}</span>}
          </h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", type.dot)} aria-hidden />
              {type.label}
            </span>
            <span>{who}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {formatDuration(meeting.durationMinutes)}
            </span>
            {meeting.participantCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden /> {meeting.participantCount}
              </span>
            )}
          </p>
        </div>

        <JoinMeetingButton meeting={meeting} size="lg" showWaiting className="relative z-10 w-full sm:w-auto" />
      </div>
    </div>
  );
}
