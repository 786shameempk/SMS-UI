import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, CalendarDays, ClipboardCheck, Flag, Loader2, Pencil, RotateCcw, Send, Share2, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils/format";
import { archiveTalent, deleteTalent, featureTalent, getTalent, restoreTalent, searchTalents, submitTalent } from "../api";
import { CATEGORY_CONFIG, STATUS_CONFIG, VIEW_AFTER_DWELL_MS } from "../constants";
import { formatCount, timeAgo, useMeaningfulView } from "../hooks";
import { CategoryChip, CreatorAvatar, CreatorTypePill, EmptyState, FeaturedRibbon, StatusBadge, VisibilityBadge } from "../components/Bits";
import MediaShowcase from "../components/MediaShowcase";
import ReactionBar from "../components/ReactionBar";
import ReportDialog from "../components/ReportDialog";
import ReviewTimeline from "../components/ReviewTimeline";
import { TalentRail } from "../components/TalentCard";

export default function TalentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);

  const { data: talent, isLoading, isError, error } = useQuery({ queryKey: ["talents", "detail", id], queryFn: () => getTalent(id!), enabled: !!id });
  const published = talent?.status === "approved" && !talent.isHidden;
  const hasPlayable = !!talent?.media.some((m) => m.type !== "image");

  // Views count only after meaningful engagement: real playback for video/audio, or reading dwell otherwise.
  const triggerView = useMeaningfulView(talent?.id, published && !talent?.permissions.isOwner, hasPlayable ? null : VIEW_AFTER_DWELL_MS);

  const { data: more } = useQuery({
    queryKey: ["talents", "search", { creator: talent?.creator.userId, category: talent?.category }],
    queryFn: () => searchTalents({ category: talent!.category, sort: "trending", pageSize: 12 }),
    enabled: published,
  });

  const refresh = (next?: Awaited<ReturnType<typeof getTalent>>) => {
    if (next) queryClient.setQueryData(["talents", "detail", id], next);
    void queryClient.invalidateQueries({ queryKey: ["talents"] });
  };
  const onError = (err: Error) => toast.error(err.message);

  const submit = useMutation({ mutationFn: () => submitTalent(id!), onSuccess: (t) => (refresh(t), toast.success("Submitted! A reviewer will take a look soon.")), onError });
  const archive = useMutation({ mutationFn: () => archiveTalent(id!), onSuccess: (t) => (refresh(t), setConfirm(null), toast.success("Archived")), onError });
  const restore = useMutation({ mutationFn: () => restoreTalent(id!), onSuccess: (t) => (refresh(t), toast.success("Restored to your drafts")), onError });
  const remove = useMutation({
    mutationFn: () => deleteTalent(id!),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["talents", "detail", id] });
      refresh();
      toast.success("Showcase deleted");
      navigate("/talents/mine", { replace: true });
    },
    onError,
  });
  const feature = useMutation({ mutationFn: (on: boolean) => featureTalent(id!, on), onSuccess: (t) => (refresh(t), toast.success(t.isFeatured ? "🌟 Featured!" : "Removed from featured")), onError });

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 space-y-4">
        <div className="h-6 w-40 rounded cc-shimmer" />
        <div className="aspect-video rounded-3xl cc-shimmer" />
        <div className="h-8 w-2/3 rounded cc-shimmer" />
      </div>
    );
  }
  if (isError || !talent) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-10">
        <EmptyState emoji="🔒" title="This showcase isn't available" body={(error as Error | null)?.message ?? "It may be private, still under review, or no longer shared."} action={<Button onClick={() => navigate("/talents")}>Back to Discover</Button>} />
      </div>
    );
  }

  const category = CATEGORY_CONFIG[talent.category];
  const p = talent.permissions;
  const moreFromCategory = more?.items.filter((t) => t.id !== talent.id) ?? [];

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: talent.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      // share sheet dismissed
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-5 space-y-8">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Status banner for the creator / reviewers when not simply published */}
      {!published && <StatusBanner talent={talent} onEdit={() => navigate(`/talents/${talent.id}/edit`)} />}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
        {/* Media + story */}
        <div className="space-y-6 min-w-0">
          <MediaShowcase talent={talent} onMeaningfulPlay={triggerView} />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={talent.category} size="sm" />
              <VisibilityBadge visibility={talent.visibility} />
              {talent.isFeatured && <FeaturedRibbon />}
              {!published && <StatusBadge status={talent.status} />}
            </div>
            <h1 className="cc-display text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">{talent.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                <span aria-hidden="true">👁</span>
                {talent.viewCount.toLocaleString()} view{talent.viewCount === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {talent.publishedAt ? `Published ${timeAgo(talent.publishedAt)}` : `Created ${timeAgo(talent.createdAt)}`}
              </span>
            </div>
            {talent.media.length > 0 && talent.description && <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{talent.description}</p>}
            {talent.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {talent.tags.map((tag) => (
                  <Link key={tag} to={`/talents/explore?q=${encodeURIComponent(tag)}`} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-muted">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Appreciation */}
          <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-foreground">{p.isOwner ? "How people are cheering you on" : `Cheer on ${talent.creator.name.split(" ")[0]}`}</p>
              <span className="text-xs text-muted-foreground">{talent.reactionCount > 0 ? `${formatCount(talent.reactionCount)} appreciation${talent.reactionCount === 1 ? "" : "s"}` : "Be the first to appreciate"}</span>
            </div>
            <ReactionBar talent={talent} disabled={!p.canReact} />
            {p.isOwner && published && <p className="mt-2 text-xs text-muted-foreground">You can't react to your own work - but everyone else can. 💜</p>}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
            <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${category.gradient} opacity-90`} />
            <div className="relative pt-8">
              <Link to={`/talents/creators/${talent.creator.userId}`}>
                <CreatorAvatar creator={talent.creator} size={64} ring className="ring-4 ring-card rounded-full" />
              </Link>
              <Link to={`/talents/creators/${talent.creator.userId}`} className="block mt-2 cc-display text-lg font-bold text-foreground hover:underline">
                {talent.creator.name}
              </Link>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <CreatorTypePill type={talent.creator.type} />
                {talent.creator.subtitle && <span className="truncate">{talent.creator.subtitle}</span>}
              </div>
              <Link to={`/talents/schools/${encodeURIComponent(talent.tenantId)}`} className="block text-sm text-violet-600 dark:text-violet-300 mt-1 hover:underline truncate">
                🏫 {talent.schoolName}
              </Link>
              <Link to={`/talents/creators/${talent.creator.userId}`} className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                View talent profile
              </Link>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-3xl border border-border bg-card p-4 space-y-2">
            {p.canReview && (
              <Button className="w-full cc-gradient-bg text-white" onClick={() => navigate(`/talents/review?showcase=${talent.id}`)}>
                <ClipboardCheck className="w-4 h-4" /> Review this submission
              </Button>
            )}
            {p.canEdit && (
              <Button variant="outline" className="w-full" onClick={() => navigate(`/talents/${talent.id}/edit`)}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
            {p.canSubmit && (
              <Button className="w-full cc-gradient-bg text-white" disabled={submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {talent.status === "draft" ? "Submit for approval" : "Resubmit for approval"}
              </Button>
            )}
            {p.canRestore && (
              <Button variant="outline" className="w-full" disabled={restore.isPending} onClick={() => restore.mutate()}>
                <RotateCcw className="w-4 h-4" /> Restore to drafts
              </Button>
            )}
            {p.canFeature && (
              <Button variant="outline" className="w-full" disabled={feature.isPending} onClick={() => feature.mutate(!talent.isFeatured)}>
                <Star className={talent.isFeatured ? "w-4 h-4 fill-amber-400 text-amber-400" : "w-4 h-4"} />
                {talent.isFeatured ? "Remove from featured" : "Feature this talent"}
              </Button>
            )}
            {published && (
              <Button variant="ghost" className="w-full" onClick={() => void share()}>
                <Share2 className="w-4 h-4" /> Share link
              </Button>
            )}
            {p.canArchive && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setConfirm("archive")}>
                <Archive className="w-4 h-4" /> Archive
              </Button>
            )}
            {p.canDelete && (
              <Button variant="ghost" className="w-full text-rose-600 hover:bg-rose-500/10" onClick={() => setConfirm("delete")}>
                <Trash2 className="w-4 h-4" /> Delete permanently
              </Button>
            )}
            {p.canReport &&
              (talent.hasReportedByMe ? (
                <p className="text-center text-xs text-muted-foreground py-1">You've reported this. Thanks for keeping Creative Campus safe.</p>
              ) : (
                <button type="button" onClick={() => setReportOpen(true)} className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-rose-600 cursor-pointer">
                  <Flag className="w-3.5 h-3.5" /> Report content
                </button>
              ))}
            {talent.openReportCount > 0 && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">⚠️ {talent.openReportCount} open report{talent.openReportCount === 1 ? "" : "s"} on this showcase.</p>}
          </div>

          {talent.reviews.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Approval history</h2>
              <ReviewTimeline entries={talent.reviews} />
            </div>
          )}
        </aside>
      </div>

      {moreFromCategory.length > 0 && <TalentRail emoji={category.emoji} title={`More ${category.label.toLowerCase()}`} talents={moreFromCategory} />}

      <ReportDialog talentId={talent.id} title={talent.title} open={reportOpen} onOpenChange={setReportOpen} />
      <ConfirmDialog
        open={confirm === "archive"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Archive this showcase?"
        description={p.isOwner ? "It will be hidden from everyone. You can restore it to your drafts later and resubmit." : "It will be hidden from everyone and the creator will be notified."}
        confirmLabel="Archive"
        onConfirm={() => archive.mutate()}
        submitting={archive.isPending}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete this showcase permanently?"
        description={
          talent.status === "approved"
            ? "It will disappear for everyone, along with its photos, videos, recordings, views and appreciations. This can't be undone - archive it instead if you might want it back."
            : "The showcase and all its uploaded media will be removed for good. This can't be undone."
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => remove.mutate()}
        submitting={remove.isPending}
      />
    </div>
  );
}

function StatusBanner({ talent, onEdit }: { talent: Awaited<ReturnType<typeof getTalent>>; onEdit: () => void }) {
  const config = STATUS_CONFIG[talent.status];
  const messages: Partial<Record<typeof talent.status, { emoji: string; title: string; body: string }>> = {
    draft: { emoji: "📝", title: "This is a draft", body: "Only you can see it. Submit it when you're ready for a teacher to review." },
    pending_approval: {
      emoji: "⏳",
      title: "Waiting for approval",
      body: `Submitted ${talent.submittedAt ? formatDateTime(talent.submittedAt) : ""}. It's private until a reviewer approves it.`,
    },
    needs_changes: { emoji: "✏️", title: "A reviewer asked for a few changes", body: "Update your showcase and resubmit - you're almost there!" },
    rejected: { emoji: "💬", title: "Not approved this time", body: "Read the feedback below. You can edit and resubmit." },
    archived: { emoji: "🗄️", title: "Archived", body: "Hidden from everyone. Restore it to drafts to rework and resubmit." },
  };
  const m = talent.isHidden ? { emoji: "🛡️", title: "Hidden by moderators", body: "This showcase was hidden after a report and isn't visible to others." } : messages[talent.status];
  if (!m) return null;

  return (
    <div className={`rounded-3xl p-4 sm:p-5 ${config.className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          {m.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{m.title}</p>
          <p className="text-sm opacity-90">{m.body}</p>
          {talent.reviewerFeedback && (talent.status === "needs_changes" || talent.status === "rejected") && (
            <blockquote className="mt-2 rounded-xl bg-card/80 text-foreground px-3.5 py-2.5 text-sm border-l-4 border-current">“{talent.reviewerFeedback}”</blockquote>
          )}
        </div>
        {talent.permissions.canEdit && talent.status !== "draft" && (
          <Button size="sm" onClick={onEdit} className="shrink-0">
            <Pencil className="w-3.5 h-3.5" /> Edit & resubmit
          </Button>
        )}
      </div>
    </div>
  );
}
