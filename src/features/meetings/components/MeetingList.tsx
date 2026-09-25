import { Link } from "react-router-dom";
import { Repeat, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { MEETING_TYPES } from "../constants";
import type { MeetingSummary } from "../types";
import { formatDayLabel, formatDuration, formatTime } from "../utils";
import { MeetingStatusBadge } from "./Badges";
import JoinMeetingButton from "./JoinMeetingButton";

/** One scannable row: time · coloured rail + title · who · status · join. */
export function MeetingRow({ meeting, showDate }: { meeting: MeetingSummary; showDate?: boolean }) {
  const type = MEETING_TYPES[meeting.meetingType];
  const cancelled = meeting.status === "Cancelled";
  const who = meeting.myRelation === "Host" ? "You" : meeting.hostName;

  return (
    // Stretched link: the whole row opens the meeting, while the Join button stays a real, separate button
    // (a <button> inside an <a> is invalid and confuses screen readers).
    <div className="group relative grid grid-cols-[4.25rem_minmax(0,1fr)] sm:grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-secondary/60 transition-colors has-[a:focus-visible]:bg-secondary/60">
      <Link to={`/online-classes/${meeting.id}`} className="absolute inset-0 focus-visible:outline-none" aria-label={`Open ${meeting.title}`} />
      <div className="text-right tabular-nums leading-tight">
        {showDate && <div className="text-[11px] font-medium text-muted-foreground">{formatDayLabel(meeting.startUtc)}</div>}
        <div className={cn("text-sm font-semibold text-foreground", cancelled && "line-through text-muted-foreground")}>{formatTime(meeting.startUtc)}</div>
        <div className="text-[11px] text-muted-foreground">{formatDuration(meeting.durationMinutes)}</div>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("h-10 w-1 shrink-0 rounded-full", type.dot, cancelled && "opacity-40")} aria-hidden />
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold text-foreground", cancelled && "text-muted-foreground")}>
            {meeting.title}
            {meeting.classLabel && <span className="font-normal text-muted-foreground"> · {meeting.classLabel}</span>}
          </p>
          <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
            <span className="truncate">{type.label} · {who}</span>
            {meeting.participantCount > 0 && (
              <span className="inline-flex items-center gap-1 shrink-0">
                <Users className="h-3 w-3" aria-hidden /> {meeting.participantCount}
              </span>
            )}
            {meeting.isSeries && <Repeat className="h-3 w-3 shrink-0" aria-label="Repeats" />}
          </p>
        </div>
      </div>

      <div className="relative z-10 col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
        <MeetingStatusBadge status={meeting.status} isRescheduled={meeting.isRescheduled} />
        <JoinMeetingButton meeting={meeting} size="sm" />
      </div>
    </div>
  );
}

export function MeetingList({ meetings, showDate, empty }: { meetings: MeetingSummary[]; showDate?: boolean; empty?: React.ReactNode }) {
  if (meetings.length === 0) return <>{empty}</>;
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {meetings.map((m) => (
        <MeetingRow key={m.id} meeting={m} showDate={showDate} />
      ))}
    </div>
  );
}

/** Groups upcoming meetings under "Tomorrow", "Mon 28 Sep"... headings. */
export function GroupedMeetingList({ meetings, empty }: { meetings: MeetingSummary[]; empty?: React.ReactNode }) {
  if (meetings.length === 0) return <>{empty}</>;
  const groups = new Map<string, MeetingSummary[]>();
  for (const m of meetings) {
    const key = formatDayLabel(m.startUtc);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="space-y-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</h3>
          <MeetingList meetings={items} />
        </section>
      ))}
    </div>
  );
}
