import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ControlBar, GridLayout, LiveKitRoom, ParticipantTile, RoomAudioRenderer, useParticipants, useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { ArrowLeft, Circle, Loader2, MessageSquare, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { cn } from "@/utils/cn";
import { endMeeting, getMeeting, joinMeeting, startRecording, stopRecording, listRecordings } from "../api";
import { meetingKeys, useNow } from "../hooks";
import type { JoinTicket } from "../types";
import MeetingChatPanel from "../components/MeetingChatPanel";

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} className="h-full">
      <ParticipantTile />
    </GridLayout>
  );
}

function PeopleCount() {
  const participants = useParticipants();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium">
      <Users className="h-3.5 w-3.5" aria-hidden /> {participants.length}
    </span>
  );
}

function elapsed(fromIso: string | null | undefined, now: number) {
  if (!fromIso) return "00:00";
  const s = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * The embedded classroom (design section 11). Full screen, no app chrome. The join ticket arrives in router
 * state from the Join button; after a refresh the page simply asks for a new one (tickets last 10 minutes and
 * are never put in the URL).
 */
export default function MeetingRoomPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const now = useNow(1000);
  const [ticket, setTicket] = useState<JoinTicket | null>((location.state as { ticket?: JoinTicket } | null)?.ticket ?? null);
  const [chatOpen, setChatOpen] = useState(() => window.innerWidth >= 1024);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const requested = useRef(false);

  const { data: meeting } = useQuery({ queryKey: meetingKeys.detail(id), queryFn: () => getMeeting(id), refetchInterval: 20_000 });
  const { data: recordings = [] } = useQuery({
    queryKey: meetingKeys.part(id, "recordings"),
    queryFn: () => listRecordings(id),
    enabled: !!ticket?.isHost && !!meeting?.recordingEnabled,
    refetchInterval: 10_000,
  });
  const recordingNow = recordings.some((r) => !r.isReady);

  const join = useMutation({
    mutationFn: () => joinMeeting(id),
    onSuccess: (t) => {
      if (t.mode === "External" && t.externalUrl) {
        window.open(t.externalUrl, "_blank", "noopener,noreferrer");
        navigate(`/online-classes/${id}`, { replace: true });
        return;
      }
      setTicket(t);
    },
  });

  useEffect(() => {
    if (!ticket && !requested.current) {
      requested.current = true;
      join.mutate();
    }
  }, [ticket, join]);

  // The meeting ending (host or schedule) closes the room for everyone; send them back to the class page.
  useEffect(() => {
    if (meeting && (meeting.summary.status === "Completed" || meeting.summary.status === "Cancelled")) {
      toast(meeting.summary.status === "Completed" ? "The class has ended." : "The class was cancelled.");
      navigate(`/online-classes/${id}`, { replace: true });
    }
  }, [meeting, id, navigate]);

  const end = useMutation({
    mutationFn: () => endMeeting(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      navigate(`/online-classes/${id}?tab=attendance`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const record = useMutation({
    mutationFn: () => (recordingNow ? stopRecording(id) : startRecording(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.part(id, "recordings") });
      toast.success(recordingNow ? "Recording stopped. It'll appear under Recordings shortly." : "Recording started");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leave = useMemo(() => () => navigate(`/online-classes/${id}`, { replace: true }), [id, navigate]);

  if (join.isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-white">
        <p className="text-lg font-semibold">You can't join right now</p>
        <p className="max-w-sm text-sm text-white/70">{(join.error as Error).message}</p>
        <Button asChild variant="secondary"><Link to={`/online-classes/${id}`}>Back to the class</Link></Button>
      </div>
    );
  }

  if (!ticket?.token || !ticket.serverUrl) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 bg-slate-950 text-white">
        <Loader2 className="h-5 w-5 animate-spin" /> Getting your seat ready…
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={ticket.serverUrl}
      token={ticket.token}
      connect
      audio={ticket.isHost}
      video={false}
      data-lk-theme="default"
      onDisconnected={leave}
      onError={(e) => toast.error(`Video connection problem: ${e.message}`)}
      className="bg-slate-950 text-white"
      // LiveKit's stylesheet is unlayered, so it beats Tailwind's layered utilities - size the room inline.
      style={{ height: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-4" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={leave} aria-label="Leave">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ticket.title}{meeting?.summary.classLabel && <span className="font-normal text-white/60"> · {meeting.summary.classLabel}</span>}</p>
            <p className="flex items-center gap-2 text-xs text-white/60">
              {meeting?.summary.status === "Live" ? (
                <span className="inline-flex items-center gap-1 text-green-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" /> Live</span>
              ) : (
                <span className="text-amber-300">Waiting for the host</span>
              )}
              <span className="tabular-nums">{elapsed(meeting?.actualStartUtc ?? meeting?.summary.startUtc, now)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeopleCount />
          {ticket.isHost && meeting?.recordingEnabled && (
            <Button size="sm" variant="ghost" onClick={() => record.mutate()} disabled={record.isPending}
              className={cn("text-white hover:bg-white/10 hover:text-white", recordingNow && "text-red-400")}>
              <Circle className={cn("h-3.5 w-3.5", recordingNow && "fill-red-500 text-red-500 animate-pulse")} />
              <span className="hidden sm:inline">{recordingNow ? "Stop recording" : "Record"}</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" className={cn("text-white hover:bg-white/10 hover:text-white", chatOpen && "bg-white/10")} onClick={() => setChatOpen((o) => !o)} aria-pressed={chatOpen}>
            <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Chat</span>
          </Button>
          {ticket.isHost && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmEnd(true)}>
              <Square className="h-3.5 w-3.5" /> <span className="hidden sm:inline">End class</span>
            </Button>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-2"><Stage /></div>
          <ControlBar controls={{ chat: false, leave: true, screenShare: ticket.isHost }} variation="minimal" className="justify-center border-t border-white/10 py-2" />
        </main>
        {chatOpen && (
          <div className="absolute inset-0 z-20 lg:static lg:w-80 lg:border-l lg:border-white/10">
            <MeetingChatPanel meetingId={id} isHost={ticket.isHost} canChat={ticket.canChat} onClose={() => setChatOpen(false)} />
          </div>
        )}
      </div>
      <RoomAudioRenderer />

      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="End the class for everyone?"
        description="Everyone is disconnected and attendance becomes final."
        confirmLabel="End class"
        confirmVariant="destructive"
        submitting={end.isPending}
        onConfirm={() => end.mutate()}
      />
    </LiveKitRoom>
  );
}
