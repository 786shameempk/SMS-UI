import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { cancelMeeting, rescheduleMeeting } from "../api";
import { DURATION_OPTIONS, MEETING_TYPES } from "../constants";
import { meetingKeys } from "../hooks";
import type { MeetingDetail, SeriesScope } from "../types";
import { toLocalInputValue } from "../utils";

/** "Only this one / This and following / All upcoming" - shown only for a session of a repeating series. */
function ScopePicker({ value, onChange, noun }: { value: SeriesScope; onChange: (v: SeriesScope) => void; noun: string }) {
  const options: Array<{ value: SeriesScope; label: string }> = [
    { value: "This", label: `Only this ${noun}` },
    { value: "Following", label: "This and following" },
    { value: "All", label: "All upcoming" },
  ];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-foreground">This {noun} repeats. Apply to</legend>
      <div className="grid gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              value === o.value ? "border-primary bg-accent" : "border-border hover:bg-secondary",
            )}
          >
            <input type="radio" name="series-scope" value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="accent-[var(--color-primary)]" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function RescheduleDialog({ meeting, open, onOpenChange }: { meeting: MeetingDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const s = meeting.summary;
  const noun = MEETING_TYPES[s.meetingType].noun;
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(s.durationMinutes);
  const [scope, setScope] = useState<SeriesScope>("This");

  useEffect(() => {
    if (!open) return;
    setStart(toLocalInputValue(new Date(s.startUtc)));
    setDuration(s.durationMinutes);
    setScope("This");
  }, [open, s.startUtc, s.durationMinutes]);

  const mutation = useMutation({
    mutationFn: () => rescheduleMeeting(s.id, new Date(start).toISOString(), duration, scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      toast.success("Rescheduled. Everyone invited has been told.");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const durations = DURATION_OPTIONS.includes(duration) ? DURATION_OPTIONS : [...DURATION_OPTIONS, duration].sort((a, b) => a - b);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule</DialogTitle>
          <DialogDescription>{s.title}. Everyone invited gets a notification with the new time.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!start || new Date(start).getTime() < Date.now()) {
              toast.error("Pick a time in the future.");
              return;
            }
            mutation.mutate();
          }}
          className="gap-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-start">New start</Label>
            <Input id="reschedule-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-duration">Length</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger id="reschedule-duration"><SelectValue /></SelectTrigger>
              <SelectContent>
                {durations.map((d) => <SelectItem key={d} value={String(d)}>{d < 60 ? `${d} min` : `${d / 60} h`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {s.isSeries && (
            <>
              <ScopePicker value={scope} onChange={setScope} noun={noun} />
              {scope !== "This" && <p className="text-xs text-muted-foreground">Every session keeps its own date and moves to the new time of day.</p>}
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Keep current time</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reschedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelMeetingDialog({ meeting, open, onOpenChange }: { meeting: MeetingDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const s = meeting.summary;
  const noun = MEETING_TYPES[s.meetingType].noun;
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<SeriesScope>("This");

  useEffect(() => {
    if (open) {
      setReason("");
      setScope("This");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => cancelMeeting(s.id, reason.trim(), scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      toast.success(scope === "This" ? `The ${noun} is cancelled` : "Sessions cancelled");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel {noun}?</DialogTitle>
          <DialogDescription>
            {s.status === "Live" ? `This ends the ${noun} for everyone in it. ` : ""}Everyone invited is told it's cancelled.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="gap-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason <span className="font-normal text-muted-foreground">(shown to everyone)</span></Label>
            <Textarea id="cancel-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Teacher on leave" />
          </div>
          {s.isSeries && <ScopePicker value={scope} onChange={setScope} noun={noun} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Keep it</Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel {scope === "This" ? noun : "sessions"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
