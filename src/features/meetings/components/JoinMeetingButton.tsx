import { Loader2, Play, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { isJoinableNow, useJoinMeeting, useNow } from "../hooks";
import type { MeetingSummary } from "../types";
import { formatTime } from "../utils";

interface JoinMeetingButtonProps {
  meeting: MeetingSummary;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Show a disabled "Opens at 9:50" button instead of nothing when it isn't joinable yet. */
  showWaiting?: boolean;
}

/**
 * One button for every role: hosts see "Start class", everyone invited sees "Join now" once the room
 * opens (10 minutes before the start). The server re-checks all of it on /join.
 */
export default function JoinMeetingButton({ meeting, size = "default", className, showWaiting }: JoinMeetingButtonProps) {
  const now = useNow(15_000);
  const join = useJoinMeeting();
  const joinable = isJoinableNow(meeting, now);
  const isHost = meeting.myRelation === "Host" || meeting.myRelation === "CoHost";
  const noun = meeting.meetingType === "OnlineClass" ? "class" : "meeting";

  if (!joinable) {
    if (!showWaiting || meeting.status !== "Scheduled" || Date.parse(meeting.endUtc) < now) return null;
    if (!["Participant", "CoHost", "Host"].includes(meeting.myRelation)) return null;
    return (
      <Button size={size} variant="outline" disabled className={className}>
        Opens at {formatTime(meeting.opensAtUtc)}
      </Button>
    );
  }

  const label = isHost && meeting.status !== "Live" ? `Start ${noun}` : "Join now";
  const Icon = isHost && meeting.status !== "Live" ? Play : Video;
  return (
    <Button
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        join.mutate(meeting.id);
      }}
      disabled={join.isPending}
      className={cn("bg-green-600 text-white hover:bg-green-700 hover:opacity-100 shadow-sm", className)}
    >
      {join.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}
