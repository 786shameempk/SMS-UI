import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle, ArrowLeft, CalendarClock, CalendarX2, Clock, Loader2, MoreHorizontal, Repeat, Send, Square, Trash2, User, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { deleteMeeting, endMeeting, endSeries, getMeeting, publishMeeting } from "../api";
import { MEETING_TYPES } from "../constants";
import { meetingKeys } from "../hooks";
import { formatDayLabel, formatDuration, formatTime, formatTimeRange } from "../utils";
import { MeetingStatusBadge, MeetingTypeBadge } from "../components/Badges";
import JoinMeetingButton from "../components/JoinMeetingButton";
import { CancelMeetingDialog, RescheduleDialog } from "../components/MeetingActionDialogs";
import { ActivityTab, AttendanceTab, MaterialsTab, NotesTab, ParticipantsTab, RecordingsTab } from "../components/DetailTabs";

function Fact({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold text-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function MeetingDetailsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<null | "reschedule" | "cancel" | "delete" | "end" | "endSeries">(null);

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: () => getMeeting(id),
    refetchInterval: (q) => (q.state.data?.summary.status === "Live" ? 15_000 : 60_000),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
  const publish = useMutation({ mutationFn: () => publishMeeting(id), onSuccess: () => { refresh(); toast.success("Published. Everyone invited has been notified."); }, onError: (e: Error) => toast.error(e.message) });
  const end = useMutation({ mutationFn: () => endMeeting(id), onSuccess: () => { refresh(); setDialog(null); toast.success("Ended. Attendance is final."); }, onError: (e: Error) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: () => deleteMeeting(id), onSuccess: () => { refresh(); toast.success("Deleted"); navigate("/online-classes"); }, onError: (e: Error) => toast.error(e.message) });
  const stopSeries = useMutation({
    mutationFn: () => endSeries(meeting!.recurrence!.id),
    onSuccess: () => { refresh(); setDialog(null); toast.success("Series ended. Upcoming sessions are cancelled."); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (error || !meeting) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">This class isn't available</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or you aren't invited to it.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/online-classes">Back to Online Classes</Link></Button>
      </div>
    );
  }

  const s = meeting.summary;
  const type = MEETING_TYPES[s.meetingType];
  const tab = params.get("tab") ?? "participants";
  const hasMore = meeting.can.reschedule || meeting.can.cancel || meeting.can.delete || (meeting.recurrence && !meeting.recurrence.isEnded && meeting.can.edit);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <Link to="/online-classes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Online Classes
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MeetingTypeBadge type={s.meetingType} />
            <MeetingStatusBadge status={s.status} isRescheduled={s.isRescheduled} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {s.title}
            {s.classLabel && <span className="font-medium text-muted-foreground"> · {s.classLabel}</span>}
          </h1>
          {meeting.description && <p className="max-w-2xl whitespace-pre-line text-sm text-muted-foreground">{meeting.description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {s.status === "Draft" && meeting.can.edit && (
            <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
              {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
            </Button>
          )}
          <JoinMeetingButton meeting={s} showWaiting />
          {meeting.can.end && (
            <Button variant="outline" onClick={() => setDialog("end")}>
              <Square className="h-4 w-4" /> End for everyone
            </Button>
          )}
          {hasMore && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {meeting.can.reschedule && <DropdownMenuItem onSelect={() => setDialog("reschedule")}><CalendarClock className="h-4 w-4" /> Reschedule</DropdownMenuItem>}
                {meeting.can.cancel && <DropdownMenuItem onSelect={() => setDialog("cancel")}><CalendarX2 className="h-4 w-4" /> Cancel {type.noun}</DropdownMenuItem>}
                {meeting.recurrence && !meeting.recurrence.isEnded && meeting.can.edit && (
                  <DropdownMenuItem onSelect={() => setDialog("endSeries")}><Repeat className="h-4 w-4" /> End the whole series</DropdownMenuItem>
                )}
                {meeting.can.delete && <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-destructive-strong focus:text-destructive-strong" variant="destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {s.status === "Cancelled" && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-red-800 dark:text-red-200">
          <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>This {type.noun} was cancelled.{meeting.cancelReason && <> Reason: {meeting.cancelReason}</>}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fact icon={CalendarClock} label="Date">{new Date(s.startUtc).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</Fact>
        <Fact icon={Clock} label="Time">
          {formatTimeRange(s.startUtc, s.endUtc)} <span className="block text-xs font-normal text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
        </Fact>
        <Fact icon={User} label="Host">{s.myRelation === "Host" ? "You" : s.hostName}</Fact>
        <Fact icon={Users} label="Invited">{s.participantCount} {s.participantCount === 1 ? "person" : "people"}</Fact>
      </div>

      {meeting.recurrence && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Repeat className="h-4 w-4" aria-hidden />
          {meeting.recurrence.isEnded ? "Part of a series that has ended." : meeting.recurrence.description}
          {meeting.rescheduledFromUtc && <span>· Moved from {formatDayLabel(meeting.rescheduledFromUtc)} {formatTime(meeting.rescheduledFromUtc)}</span>}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setParams((p) => { p.set("tab", v); return p; }, { replace: true })}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="participants">People</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="materials">Materials{meeting.materialCount > 0 && ` · ${meeting.materialCount}`}</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="recordings">Recordings{meeting.recordingCount > 0 && ` · ${meeting.recordingCount}`}</TabsTrigger>
          {meeting.can.viewAttendance && <TabsTrigger value="activity">Activity</TabsTrigger>}
        </TabsList>
        <TabsContent value="participants" className="mt-4"><ParticipantsTab meeting={meeting} /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab meeting={meeting} /></TabsContent>
        <TabsContent value="materials" className="mt-4"><MaterialsTab meeting={meeting} /></TabsContent>
        <TabsContent value="notes" className="mt-4"><NotesTab meeting={meeting} /></TabsContent>
        <TabsContent value="recordings" className="mt-4"><RecordingsTab meeting={meeting} /></TabsContent>
        {meeting.can.viewAttendance && <TabsContent value="activity" className="mt-4"><ActivityTab meeting={meeting} /></TabsContent>}
      </Tabs>

      <RescheduleDialog meeting={meeting} open={dialog === "reschedule"} onOpenChange={(o) => setDialog(o ? "reschedule" : null)} />
      <CancelMeetingDialog meeting={meeting} open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)} />
      <ConfirmDialog
        open={dialog === "end"}
        onOpenChange={(o) => setDialog(o ? "end" : null)}
        title={`End the ${type.noun} for everyone?`}
        description="Everyone is disconnected and attendance becomes final. You can still correct it afterwards."
        confirmLabel="End now"
        confirmVariant="destructive"
        submitting={end.isPending}
        onConfirm={() => end.mutate()}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        title="Delete this for good?"
        description="It disappears from everyone's list. This can't be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <ConfirmDialog
        open={dialog === "endSeries"}
        onOpenChange={(o) => setDialog(o ? "endSeries" : null)}
        title="End the whole series?"
        description="Every upcoming session is cancelled and everyone invited is told. Past sessions and their attendance are kept."
        confirmLabel="End series"
        confirmVariant="destructive"
        submitting={stopSeries.isPending}
        onConfirm={() => stopSeries.mutate()}
      />
    </div>
  );
}
