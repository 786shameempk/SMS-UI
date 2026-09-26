import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, ShieldCheck, ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";
import { getReviewQueue, getTalentSettings, listTalentReports, resolveTalentReport, updateTalentSettings } from "../api";
import { CATEGORY_CONFIG, CATEGORY_ORDER, REPORT_REASONS, VISIBILITY_CONFIG } from "../constants";
import { timeAgo, useTalentRole } from "../hooks";
import { CreatorAvatar, CreatorTypePill, EmptyState, StatTile, StatusBadge } from "../components/Bits";
import { HeroDecor } from "../components/Decor";
import MediaCover from "../components/MediaCover";
import ReviewPanel from "../components/ReviewPanel";
import type { TalentCard, TalentCategory, TalentCreatorType, TalentReport, TalentSchoolSettings, TalentStatus } from "../types";

type Tab = "queue" | "history" | "reports" | "settings";

export default function ReviewCenterPage() {
  const { isAdmin, isReviewer } = useTalentRole();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? "queue";
  const openId = params.get("showcase");

  const setTab = (t: Tab) => setParams(t === "queue" ? {} : { tab: t }, { replace: true });
  const openReview = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("showcase", id);
    else next.delete("showcase");
    setParams(next, { replace: true });
  };

  const { data: queue } = useQuery({ queryKey: ["talents", "review-queue", "badge"], queryFn: () => getReviewQueue(), enabled: isReviewer });

  if (!isReviewer) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-10">
        <EmptyState emoji="🔒" title="Reviewers only" body="The approval queue is for teachers and school admins." />
      </div>
    );
  }

  const tabs: Array<{ value: Tab; label: string; count?: number; admin?: boolean }> = [
    { value: "queue", label: "Approval queue", count: queue?.pending },
    { value: "history", label: "Reviewed" },
    { value: "reports", label: "Reports", count: queue?.openReports, admin: true },
    { value: "settings", label: "Settings", admin: true },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-6">
      <section className="cc-hero rounded-[2rem] px-6 py-7 sm:px-8">
        <HeroDecor />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-white/60">Review center</p>
          <h1 className="cc-display text-2xl sm:text-3xl font-extrabold">Help talents shine - safely ✨</h1>
          <p className="text-white/70 text-sm mt-1 max-w-2xl">Everything here is private until you approve it. Check the content, its description and the visibility the creator asked for.</p>
        </div>
      </section>

      {queue && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Waiting for review" value={queue.pending} emoji="⏳" gradient="from-amber-400 to-orange-500" />
          <StatTile label="From students" value={queue.studentPending} emoji="🎒" gradient="from-sky-400 to-indigo-500" />
          <StatTile label="From teachers & parents" value={queue.teacherPending + (queue.parentPending ?? 0)} emoji="🍎" gradient="from-rose-400 to-fuchsia-500" />
          <StatTile label="You reviewed this week" value={queue.reviewedThisWeek} emoji="✅" gradient="from-emerald-400 to-teal-500" />
        </div>
      )}

      <div className="cc-rail flex gap-1.5 overflow-x-auto border-b border-border">
        {tabs
          .filter((t) => !t.admin || isAdmin)
          .map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                tab === t.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {!!t.count && <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-amber-950">{t.count}</span>}
              {tab === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full cc-gradient-bg" />}
            </button>
          ))}
      </div>

      {tab === "queue" && <QueueList status="pending_approval" onOpen={openReview} />}
      {tab === "history" && <QueueList status="approved" onOpen={openReview} allowStatusSwitch />}
      {tab === "reports" && isAdmin && <ReportsList />}
      {tab === "settings" && isAdmin && <SettingsForm />}

      <ReviewPanel talentId={openId} onClose={() => openReview(null)} />
    </div>
  );
}

function QueueList({ status: initialStatus, onOpen, allowStatusSwitch }: { status: TalentStatus; onOpen: (id: string) => void; allowStatusSwitch?: boolean }) {
  const [status, setStatus] = useState<TalentStatus>(initialStatus);
  const [creatorType, setCreatorType] = useState<TalentCreatorType | undefined>();
  const [category, setCategory] = useState<TalentCategory | undefined>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["talents", "review-queue", { status, creatorType, category }],
    queryFn: () => getReviewQueue({ status, creatorType, category }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allowStatusSwitch && (
          <select value={status} onChange={(e) => setStatus(e.target.value as TalentStatus)} className="h-9 rounded-full border border-border bg-card px-3 text-sm cursor-pointer" aria-label="Status">
            <option value="approved">Approved</option>
            <option value="needs_changes">Changes requested</option>
            <option value="rejected">Declined</option>
            <option value="archived">Archived</option>
          </select>
        )}
        <select value={creatorType ?? ""} onChange={(e) => setCreatorType((e.target.value || undefined) as TalentCreatorType | undefined)} className="h-9 rounded-full border border-border bg-card px-3 text-sm cursor-pointer" aria-label="Creator">
          <option value="">Everyone</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="parent">Parents</option>
        </select>
        <select value={category ?? ""} onChange={(e) => setCategory((e.target.value || undefined) as TalentCategory | undefined)} className="h-9 rounded-full border border-border bg-card px-3 text-sm cursor-pointer" aria-label="Category">
          <option value="">All categories</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}
            </option>
          ))}
        </select>
      </div>

      {error && <EmptyState emoji="🔒" title="Can't open the queue" body={(error as Error).message} />}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-3xl cc-shimmer" />
          ))}
        </div>
      )}
      {data && data.items.length === 0 && (
        <EmptyState emoji={status === "pending_approval" ? "🎉" : "🗂️"} title={status === "pending_approval" ? "All caught up!" : "Nothing here yet"} body={status === "pending_approval" ? "No submissions are waiting. New ones will show up here and in your notifications." : undefined} />
      )}
      <div className="space-y-3">
        {data?.items.map((t) => (
          <QueueRow key={t.id} talent={t} onOpen={() => onOpen(t.id)} pending={status === "pending_approval"} />
        ))}
      </div>
    </div>
  );
}

function QueueRow({ talent, onOpen, pending }: { talent: TalentCard; onOpen: () => void; pending: boolean }) {
  const category = CATEGORY_CONFIG[talent.category];
  const waitingHours = talent.submittedAt ? (Date.now() - new Date(talent.submittedAt).getTime()) / 3_600_000 : 0;
  return (
    <button type="button" onClick={onOpen} className="cc-card w-full text-left flex gap-4 rounded-3xl border border-border bg-card p-3 cursor-pointer">
      <MediaCover talent={talent} className="w-28 h-24 sm:w-40 sm:h-28 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 py-0.5 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", category.tint)}>
            {category.emoji} {category.label}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
            {VISIBILITY_CONFIG[talent.visibility].emoji} {VISIBILITY_CONFIG[talent.visibility].label}
          </span>
          {!pending && <StatusBadge status={talent.status} />}
          {pending && waitingHours > 48 && <span className="rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2 py-0.5 font-medium">Waiting {Math.floor(waitingHours / 24)}d</span>}
        </div>
        <p className="font-semibold text-foreground line-clamp-1">{talent.title}</p>
        {talent.description && <p className="text-sm text-muted-foreground line-clamp-1 hidden sm:block">{talent.description}</p>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreatorAvatar creator={talent.creator} size={22} />
          <span className="font-medium text-foreground truncate">{talent.creator.name}</span>
          <CreatorTypePill type={talent.creator.type} />
          <span className="hidden sm:inline">· {timeAgo(talent.submittedAt ?? talent.createdAt)}</span>
        </div>
      </div>
      <span className="hidden md:flex self-center shrink-0 rounded-full cc-gradient-bg px-4 py-2 text-sm font-semibold text-white">{pending ? "Review" : "Open"}</span>
    </button>
  );
}

function ReportsList() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"open" | "all">("open");
  const { data, isLoading } = useQuery({ queryKey: ["talents", "reports", status], queryFn: () => listTalentReports(status === "open" ? "open" : undefined) });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const resolve = useMutation({
    mutationFn: ({ report, resolution }: { report: TalentReport; resolution: "dismiss" | "hide_content" }) => resolveTalentReport(report.id, resolution, notes[report.id]),
    onSuccess: (_, v) => {
      toast.success(v.resolution === "dismiss" ? "Report dismissed" : "Content hidden");
      void queryClient.invalidateQueries({ queryKey: ["talents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reasonLabel = (r: TalentReport["reason"]) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["open", "all"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium cursor-pointer", status === s ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground")}>
            {s === "open" ? "Open" : "All reports"}
          </button>
        ))}
      </div>
      {isLoading && <div className="h-24 rounded-3xl cc-shimmer" />}
      {data && data.length === 0 && <EmptyState emoji="🛡️" title="No reports" body="Nothing has been flagged. Creative Campus is looking good." />}
      {data?.map((r) => (
        <div key={r.id} className="rounded-3xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/talents/${r.showcaseId}`} className="font-semibold text-foreground hover:underline">
                {r.showcaseTitle}
              </Link>
              <p className="text-xs text-muted-foreground">
                by {r.creatorName} · reported {formatDateTime(r.createdAt)}
                {r.fromAnotherSchool && " · from another school"}
              </p>
            </div>
            <div className="flex gap-1.5">
              <span className="rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 text-xs font-medium">{reasonLabel(r.reason)}</span>
              {r.showcaseHidden && <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Hidden</span>}
            </div>
          </div>
          {r.details && <p className="rounded-2xl bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground">“{r.details}”</p>}
          {r.status === "open" ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Resolution note (optional)" value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} className="flex-1" />
              <Button variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate({ report: r, resolution: "dismiss" })}>
                <ThumbsUp className="w-4 h-4" /> Dismiss
              </Button>
              <Button variant="destructive" disabled={resolve.isPending} onClick={() => resolve.mutate({ report: r, resolution: "hide_content" })}>
                <EyeOff className="w-4 h-4" /> Hide content
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {r.status === "dismissed" ? "Dismissed" : "Content hidden"} by {r.resolvedByName} {r.resolvedAt && `· ${formatDateTime(r.resolvedAt)}`}
              {r.resolutionNote && ` - “${r.resolutionNote}”`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function SettingsForm() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["talents", "settings"], queryFn: getTalentSettings });
  const [form, setForm] = useState<Omit<TalentSchoolSettings, "tenantId"> | null>(null);
  useEffect(() => {
    if (data) setForm({ displayName: data.displayName, tagline: data.tagline, studentReviewScope: data.studentReviewScope, allowStudentPublic: data.allowStudentPublic, allowTeacherPublic: data.allowTeacherPublic, autoHideReportThreshold: data.autoHideReportThreshold });
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateTalentSettings(form!),
    onSuccess: (s) => {
      queryClient.setQueryData(["talents", "settings"], s);
      void queryClient.invalidateQueries({ queryKey: ["talents"] });
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!form) return <div className="h-64 rounded-3xl cc-shimmer" />;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="grid lg:grid-cols-2 gap-5"
    >
      <section className="rounded-3xl border border-border bg-card p-5 space-y-4">
        <h2 className="cc-display text-lg font-bold text-foreground">🏫 School showcase page</h2>
        <div className="space-y-1.5">
          <Label htmlFor="cc-name">Display name</Label>
          <Input id="cc-name" value={form.displayName ?? ""} maxLength={200} onChange={(e) => set("displayName", e.target.value)} placeholder="ABC International School" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cc-tagline">Tagline</Label>
          <Input id="cc-tagline" value={form.tagline ?? ""} maxLength={300} onChange={(e) => set("tagline", e.target.value)} placeholder="Celebrating the creativity of our students and teachers." />
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 space-y-4">
        <h2 className="cc-display text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-500" /> Approval rules
        </h2>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground mb-1.5">Who reviews student submissions?</legend>
          {(
            [
              { value: "teachers_and_admins", label: "Teachers & school admins", hint: "Any teacher (typically the class teacher) or an admin can approve student work." },
              { value: "admins_only", label: "School admins only", hint: "Only admins and the principal can approve student work." },
            ] as const
          ).map((o) => (
            <label key={o.value} className={cn("flex items-start gap-3 rounded-2xl border px-3.5 py-3 cursor-pointer", form.studentReviewScope === o.value ? "border-violet-500 bg-violet-500/5" : "border-border")}>
              <input type="radio" name="scope" checked={form.studentReviewScope === o.value} onChange={() => set("studentReviewScope", o.value)} className="mt-1 accent-violet-600" />
              <span>
                <span className="block text-sm font-medium text-foreground">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Teacher submissions are always reviewed by a school admin. Nobody can approve their own work.</p>
        </fieldset>
        <ToggleRow label="Students may request Public visibility" hint="Off = student work can only be shared School Only." checked={form.allowStudentPublic} onChange={(v) => set("allowStudentPublic", v)} />
        <ToggleRow label="Teachers may request Public visibility" checked={form.allowTeacherPublic} onChange={(v) => set("allowTeacherPublic", v)} />
        <div className="space-y-1.5">
          <Label htmlFor="cc-threshold">Auto-hide after this many open reports</Label>
          <Input id="cc-threshold" type="number" min={0} max={50} value={form.autoHideReportThreshold} onChange={(e) => set("autoHideReportThreshold", Math.max(0, Math.min(50, Number(e.target.value) || 0)))} className="w-28" />
          <p className="text-xs text-muted-foreground">Content is hidden pending your review once it reaches this many reports. 0 turns auto-hide off.</p>
        </div>
      </section>

      <div className="lg:col-span-2 flex justify-end">
        <Button type="submit" className="cc-gradient-bg text-white" loading={save.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
