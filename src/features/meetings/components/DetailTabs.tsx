import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ClipboardList, Download, ExternalLink, FileText, Film, History, Link2, Loader2, Pencil, Play, Plus, Trash2, Upload, UserMinus, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { cn } from "@/utils/cn";
import {
  absoluteFileUrl, addMaterialLink, addParticipants, deleteMaterial, deleteRecording, getActivity, getAttendance, getNotes, getRecordingUrl,
  listMaterials, listParticipants, listRecordings, overrideAttendance, removeParticipant, saveNotes, updateRecording, uploadMaterial,
} from "../api";
import { meetingKeys } from "../hooks";
import type { AttendanceRow, AttendanceStatus, MeetingDetail, MeetingNotes, RecordingVisibility } from "../types";
import { formatBytes, formatDayLabel, formatDuration, formatTime, initials } from "../utils";
import AudiencePicker, { type PickedAudience } from "./AudiencePicker";
import { AttendanceBadge } from "./Badges";

function EmptyState({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden />
      <p className="font-medium text-foreground">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── Participants

export function ParticipantsTab({ meeting }: { meeting: MeetingDetail }) {
  const queryClient = useQueryClient();
  const id = meeting.summary.id;
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<PickedAudience[]>([]);
  const [removing, setRemoving] = useState<{ userId: string; name: string } | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: meetingKeys.part(id, "participants"), queryFn: () => listParticipants(id) });

  const add = useMutation({
    mutationFn: () => addParticipants(id, picked.map(({ type, targetId }) => ({ type, targetId }))),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(id) });
      toast.success(r.added ? `${r.added} invited` : "Everyone picked was already invited");
      if (r.unlinkedCount) toast(`${r.unlinkedCount} without a login couldn't be invited.`);
      setAdding(false);
      setPicked([]);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeParticipant(id, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(id) });
      setRemoving(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {meeting.audiences.map((a) => (
            <span key={`${a.type}-${a.targetId}`} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {a.label ?? a.type}
            </span>
          ))}
        </div>
        {meeting.can.manageParticipants && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" /> Invite more
          </Button>
        )}
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {data.map((p) => (
          <li key={p.userId} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(p.displayName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{p.displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.detail ?? p.personType}</span>
            </span>
            {p.role !== "Attendee" && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">Host</span>}
            {meeting.can.manageParticipants && p.role === "Attendee" && (
              <Button size="icon" variant="ghost" aria-label={`Remove ${p.displayName}`} onClick={() => setRemoving({ userId: p.userId, name: p.displayName })}>
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite more people</DialogTitle>
            <DialogDescription>They'll get a notification straight away.</DialogDescription>
          </DialogHeader>
          <AudiencePicker
            meetingType={meeting.summary.meetingType}
            sectionId={meeting.summary.sectionId}
            sectionLabel={meeting.summary.classLabel}
            value={picked}
            onChange={setPicked}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Close</Button>
            <Button onClick={() => add.mutate()} disabled={picked.length === 0 || add.isPending}>
              {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? ""}?`}
        description="They won't be able to join, even if their class is invited."
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.userId);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── Attendance

export function AttendanceTab({ meeting }: { meeting: MeetingDetail }) {
  const id = meeting.summary.id;
  const live = meeting.summary.status === "Live";
  const { data, isLoading } = useQuery({
    queryKey: meetingKeys.part(id, "attendance"),
    queryFn: () => getAttendance(id),
    refetchInterval: live ? 10_000 : false,
  });
  const [editing, setEditing] = useState<AttendanceRow | null>(null);

  if (isLoading || !data) return <ListSkeleton />;
  if (data.rows.length === 0) return <EmptyState icon={ClipboardList} title="No one to take attendance for">Invite a class or people first.</EmptyState>;

  const upcoming = meeting.summary.status === "Scheduled" || meeting.summary.status === "Draft";
  const summary: Array<[string, number, AttendanceStatus]> = [["Present", data.present, "Present"], ["Late", data.late, "Late"], ["Partial", data.partial, "Partial"], ["Absent", data.absent, "Absent"]];

  return (
    <div className="space-y-3">
      {!upcoming && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summary.map(([label, n, status]) => (
            <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-2xl font-bold tabular-nums text-foreground">{n}</p>
              <AttendanceBadge status={status} />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {upcoming ? "Attendance is taken automatically once the class starts. " : live ? "Updating live. " : data.isFinalized ? "Final. " : ""}
        Late = joined more than {data.lateAfterMinutes} min after the start; Partial = stayed less than {data.presentMinPercent}% of the time.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">Joined</th>
              <th className="px-4 py-2 font-semibold">Left</th>
              <th className="px-4 py-2 font-semibold">Time in class</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              {meeting.can.editAttendance && <th className="px-2 py-2"><span className="sr-only">Correct</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.rows.map((r) => (
              <tr key={r.userId}>
                <td className="px-4 py-2.5">
                  <span className="block font-medium text-foreground">{r.name}</span>
                  <span className="block text-xs text-muted-foreground">{r.detail}</span>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{r.firstJoinUtc ? formatTime(r.firstJoinUtc) : "—"}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.inRoomNow ? <span className="font-medium text-green-600">In class</span> : r.lastLeaveUtc ? formatTime(r.lastLeaveUtc) : "—"}</td>
                <td className="px-4 py-2.5 tabular-nums">{formatDuration(r.durationMinutes)}</td>
                <td className="px-4 py-2.5">
                  {upcoming ? <span className="text-xs text-muted-foreground">Not started</span> : <AttendanceBadge status={r.status} overridden={r.isOverridden} />}
                  {r.isOverridden && r.overrideReason && <span className="mt-0.5 block text-[11px] text-muted-foreground">{r.overrideReason}</span>}
                </td>
                {meeting.can.editAttendance && (
                  <td className="px-2 py-2.5 text-right">
                    <Button size="icon" variant="ghost" aria-label={`Correct attendance for ${r.name}`} onClick={() => setEditing(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CorrectAttendanceDialog meetingId={id} row={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CorrectAttendanceDialog({ meetingId, row, onClose }: { meetingId: string; row: AttendanceRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (row) {
      setStatus(row.status);
      setReason(row.overrideReason ?? "");
    }
  }, [row]);
  const mutation = useMutation({
    mutationFn: () => overrideAttendance(meetingId, row!.userId, status, reason.trim()),
    onSuccess: (sheet) => {
      queryClient.setQueryData(meetingKeys.part(meetingId, "attendance"), sheet);
      toast.success("Attendance corrected");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>{row?.name}: recorded as {row?.computedStatus}. The change is logged with your reason.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(["Present", "Late", "Partial", "Absent"] as AttendanceStatus[]).map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
                className={cn("rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer", status === s ? "border-primary bg-accent" : "border-border hover:bg-secondary")}>
                {s}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendance-reason">Reason</Label>
            <Input id="attendance-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Network dropped, was present" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!reason.trim() || mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────── Materials

const MATERIAL_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mp3";

export function MaterialsTab({ meeting }: { meeting: MeetingDetail }) {
  const queryClient = useQueryClient();
  const id = meeting.summary.id;
  const fileInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: meetingKeys.part(id, "materials"), queryFn: () => listMaterials(id) });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: meetingKeys.part(id, "materials") });
    void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(id) });
  };

  const upload = useMutation({
    mutationFn: (file: File) => uploadMaterial(id, file),
    onSuccess: () => { refresh(); toast.success("Uploaded"); },
    onError: (err: Error) => toast.error(err.message),
  });
  const remove = useMutation({ mutationFn: (materialId: string) => deleteMaterial(id, materialId), onSuccess: refresh, onError: (err: Error) => toast.error(err.message) });

  return (
    <div className="space-y-3">
      {meeting.can.manageMaterials && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={MATERIAL_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 50 * 1024 * 1024) { toast.error("Files can be up to 50 MB."); return; }
              upload.mutate(file);
            }}
          />
          <Button size="sm" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload file
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
            <Plus className="h-4 w-4" /> Link or assignment
          </Button>
        </div>
      )}

      {isLoading ? <ListSkeleton /> : data.length === 0 ? (
        <EmptyState icon={FileText} title="No materials yet">
          {meeting.can.manageMaterials ? "Share slides, worksheets, links or an assignment with the class." : "Your teacher hasn't shared anything for this class yet."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {data.map((m) => {
            const Icon = m.kind === "Assignment" ? ClipboardList : m.kind === "Link" ? Link2 : m.contentType?.startsWith("video") ? Film : FileText;
            const href = m.downloadUrl ? absoluteFileUrl(m.downloadUrl) : m.url;
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Icon className="h-4 w-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{m.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.kind === "Assignment" ? (m.dueDate ? `Assignment · due ${new Date(m.dueDate).toLocaleDateString()}` : "Assignment") : m.kind === "Link" ? m.url : `${m.fileName} · ${formatBytes(m.sizeBytes)}`}
                  </span>
                </span>
                {href && (
                  <Button asChild size="sm" variant="outline">
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {m.kind === "File" ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                      <span className="hidden sm:inline">{m.kind === "File" ? "Open" : "Visit"}</span>
                    </a>
                  </Button>
                )}
                {meeting.can.manageMaterials && (
                  <Button size="icon" variant="ghost" aria-label={`Remove ${m.title}`} onClick={() => remove.mutate(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <AddLinkDialog meetingId={id} open={linkOpen} onOpenChange={setLinkOpen} onAdded={refresh} />
    </div>
  );
}

function AddLinkDialog({ meetingId, open, onOpenChange, onAdded }: { meetingId: string; open: boolean; onOpenChange: (o: boolean) => void; onAdded: () => void }) {
  const [kind, setKind] = useState<"Link" | "Assignment">("Link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [due, setDue] = useState("");
  useEffect(() => { if (open) { setKind("Link"); setTitle(""); setUrl(""); setDue(""); } }, [open]);
  const mutation = useMutation({
    mutationFn: () => addMaterialLink(meetingId, { kind, title: title.trim(), url: url.trim() || undefined, dueDate: due || null }),
    onSuccess: () => { onAdded(); onOpenChange(false); toast.success(kind === "Link" ? "Link added" : "Assignment added"); },
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a link or assignment</DialogTitle>
          <DialogDescription>Students see it on the class page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(["Link", "Assignment"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                className={cn("rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer", kind === k ? "border-primary bg-accent" : "border-border hover:bg-secondary")}>
                {k}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="material-title">Title</Label>
            <Input id="material-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "Link" ? "e.g. Fractions video" : "e.g. Exercise 4.2, questions 1–10"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="material-url">Link {kind === "Assignment" && <span className="font-normal text-muted-foreground">(optional)</span>}</Label>
            <Input id="material-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          {kind === "Assignment" && (
            <div className="space-y-1.5">
              <Label htmlFor="material-due">Due date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="material-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title.trim() || (kind === "Link" && !url.trim()) || mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────── Notes

const NOTE_FIELDS: Array<{ key: keyof Omit<MeetingNotes, "isVisibleToStudents" | "updatedAt">; label: string; placeholder: string }> = [
  { key: "topicsDiscussed", label: "Topic", placeholder: "Fractions" },
  { key: "summary", label: "Summary", placeholder: "Covered addition and subtraction of fractions." },
  { key: "homework", label: "Homework", placeholder: "Exercise 4.2" },
  { key: "actionItems", label: "Action items", placeholder: "Complete questions 1–10." },
  { key: "additionalNotes", label: "Additional notes", placeholder: "" },
];

export function NotesTab({ meeting }: { meeting: MeetingDetail }) {
  const queryClient = useQueryClient();
  const id = meeting.summary.id;
  const { data: notes, isLoading } = useQuery({ queryKey: meetingKeys.part(id, "notes"), queryFn: () => getNotes(id) });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Omit<MeetingNotes, "updatedAt">>({ summary: "", topicsDiscussed: "", actionItems: "", homework: "", additionalNotes: "", isVisibleToStudents: true });

  useEffect(() => {
    if (notes) setDraft({ ...notes });
  }, [notes]);

  const save = useMutation({
    mutationFn: () => saveNotes(id, draft),
    onSuccess: (saved) => {
      queryClient.setQueryData(meetingKeys.part(id, "notes"), saved);
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(id) });
      setEditing(false);
      toast.success("Notes saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <ListSkeleton />;

  if (editing) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4 rounded-xl border border-border bg-card p-4">
        {NOTE_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`notes-${f.key}`}>{f.label}</Label>
            {f.key === "topicsDiscussed" ? (
              <Input id={`notes-${f.key}`} value={draft[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            ) : (
              <Textarea id={`notes-${f.key}`} rows={f.key === "summary" ? 3 : 2} value={draft[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Students and parents can read these notes</span>
          <Switch id="notes-visible" checked={draft.isVisibleToStudents} onCheckedChange={(v) => setDraft({ ...draft, isVisibleToStudents: v })} />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save notes</Button>
        </div>
      </form>
    );
  }

  if (!notes) {
    return (
      <EmptyState icon={ClipboardList} title="No notes yet">
        {meeting.can.editNotes ? (
          <Button size="sm" className="mt-2" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Write notes</Button>
        ) : "Notes from your teacher will appear here after the class."}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {notes.topicsDiscussed && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic</p>}
          <h3 className="text-lg font-semibold text-foreground">{notes.topicsDiscussed ?? "Class notes"}</h3>
        </div>
        {meeting.can.editNotes && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
      </div>
      {NOTE_FIELDS.filter((f) => f.key !== "topicsDiscussed" && notes[f.key]).map((f) => (
        <div key={f.key}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-foreground">{notes[f.key]}</p>
        </div>
      ))}
      {!notes.isVisibleToStudents && <p className="text-xs text-muted-foreground">Only staff can see these notes.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── Recordings

const VISIBILITY_LABEL: Record<RecordingVisibility, string> = { Staff: "Staff only", Students: "Students", StudentsAndParents: "Students & parents" };

export function RecordingsTab({ meeting }: { meeting: MeetingDetail }) {
  const queryClient = useQueryClient();
  const id = meeting.summary.id;
  const { data = [], isLoading } = useQuery({ queryKey: meetingKeys.part(id, "recordings"), queryFn: () => listRecordings(id), refetchInterval: (q) => (q.state.data?.some((r) => !r.isReady) ? 10_000 : false) });
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);

  const play = useMutation({
    mutationFn: (recordingId: string) => getRecordingUrl(id, recordingId),
    onSuccess: (r, recordingId) => setPlaying({ id: recordingId, url: absoluteFileUrl(r.url) }),
    onError: (err: Error) => toast.error(err.message),
  });
  const setVisibility = useMutation({
    mutationFn: ({ recordingId, visibility }: { recordingId: string; visibility: RecordingVisibility }) => updateRecording(id, recordingId, visibility),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: meetingKeys.part(id, "recordings") }),
    onError: (err: Error) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: (recordingId: string) => deleteRecording(id, recordingId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(id) }); setPlaying(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <ListSkeleton />;
  if (data.length === 0) {
    return (
      <EmptyState icon={Film} title="No recordings">
        {meeting.recordingEnabled ? "When the host records the class, the recording appears here once it's processed." : "Recording wasn't turned on for this class."}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {playing && (
        <video key={playing.id} src={playing.url} controls autoPlay className="aspect-video w-full rounded-xl bg-black" />
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Film className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{formatDayLabel(r.recordedAt)} · {formatTime(r.recordedAt)}</span>
              <span className="block text-xs text-muted-foreground">{r.isReady ? `${formatDuration(Math.max(1, Math.round(r.durationSeconds / 60)))} · ${formatBytes(r.sizeBytes)}` : "Processing…"}</span>
            </span>
            {r.canDelete && (
              <Select value={r.visibility} onValueChange={(v) => setVisibility.mutate({ recordingId: r.id, visibility: v as RecordingVisibility })}>
                <SelectTrigger className="h-8 w-40 text-xs" aria-label="Who can watch"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(VISIBILITY_LABEL) as RecordingVisibility[]).map((v) => <SelectItem key={v} value={v}>{VISIBILITY_LABEL[v]}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {r.isReady && (
              <Button size="sm" variant="outline" onClick={() => play.mutate(r.id)} disabled={play.isPending}>
                <Play className="h-4 w-4" /> Watch
              </Button>
            )}
            {r.canDelete && (
              <Button size="icon" variant="ghost" aria-label="Delete recording" onClick={() => remove.mutate(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── Activity (audit trail)

/** Turns the audit row's JSON into a short, readable detail line. */
function describeActivity(data: string | null): string | null {
  if (!data) return null;
  try {
    const d = JSON.parse(data) as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof d.reason === "string" && d.reason) parts.push(`Reason: ${d.reason}`);
    if (typeof d.from === "string" && typeof d.to === "string") parts.push(`${d.from} → ${d.to}`);
    if (typeof d.newStartUtc === "string") parts.push(`Moved to ${formatDayLabel(d.newStartUtc)} ${formatTime(d.newStartUtc)}`);
    if (typeof d.sessions === "number" && d.sessions > 1) parts.push(`${d.sessions} sessions`);
    if (typeof d.added === "number") parts.push(`${d.added} added`);
    if (typeof d.name === "string") parts.push(d.name);
    if (typeof d.fileName === "string") parts.push(d.fileName);
    if (typeof d.relation === "string") parts.push(`as ${d.relation}`);
    return parts.join(" · ") || null;
  } catch {
    return null;
  }
}

export function ActivityTab({ meeting }: { meeting: MeetingDetail }) {
  const id = meeting.summary.id;
  const { data = [], isLoading } = useQuery({ queryKey: meetingKeys.part(id, "activity"), queryFn: () => getActivity(id) });
  if (isLoading) return <ListSkeleton />;
  if (data.length === 0) return <EmptyState icon={History} title="No activity yet" />;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {data.map((e) => {
        const detail = describeActivity(e.additionalData);
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-brand-500" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {e.action} <span className="font-normal text-muted-foreground">by {e.actorName ?? "a staff member"}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDayLabel(e.timestamp)} · {formatTime(e.timestamp)}
              {detail && <> · {detail}</>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
