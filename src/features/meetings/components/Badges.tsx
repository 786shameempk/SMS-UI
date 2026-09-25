import { cn } from "@/utils/cn";
import { ATTENDANCE_STYLE, MEETING_TYPES, STATUS_STYLE, displayStatus } from "../constants";
import type { AttendanceStatus, MeetingStatus, MeetingType } from "../types";

export function MeetingStatusBadge({ status, isRescheduled, className }: { status: MeetingStatus; isRescheduled?: boolean; className?: string }) {
  const style = STATUS_STYLE[displayStatus(status)];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", style.className)}>
        <span className={cn("h-1.5 w-1.5 rounded-full bg-current", style.pulse && "animate-pulse motion-reduce:animate-none")} aria-hidden />
        {style.label}
      </span>
      {isRescheduled && (
        <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
          Rescheduled
        </span>
      )}
    </span>
  );
}

export function MeetingTypeBadge({ type, className }: { type: MeetingType; className?: string }) {
  const config = MEETING_TYPES[type];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", config.chip, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {config.label}
    </span>
  );
}

export function TypeDot({ type, className }: { type: MeetingType; className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", MEETING_TYPES[type].dot, className)} aria-hidden />;
}

export function AttendanceBadge({ status, overridden }: { status: AttendanceStatus; overridden?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", ATTENDANCE_STYLE[status])}>
      {status}
      {overridden && <span title="Corrected by the teacher">*</span>}
    </span>
  );
}
