import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Loader2, Pencil, RotateCcw, Send, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { cn } from "@/utils/cn";
import { archiveTalent, deleteTalent, getMyTalents, restoreTalent, submitTalent } from "../api";
import { REACTION_CONFIG, REACTION_ORDER } from "../constants";
import { formatCount, useTalentRole } from "../hooks";
import { CreatorAvatar, EmptyState, StatTile } from "../components/Bits";
import { HeroDecor } from "../components/Decor";
import { TalentGrid } from "../components/TalentCard";
import type { TalentCard, TalentStatus } from "../types";

type Filter = "all" | "draft" | "pending_approval" | "approved" | "needs_changes" | "archived" | "school_only" | "public";

export default function MyTalentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userId } = useTalentRole();
  const [filter, setFilter] = useState<Filter>("all");
  const [toDelete, setToDelete] = useState<TalentCard | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["talents", "mine"], queryFn: getMyTalents });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["talents"] });
  const onError = (err: Error) => toast.error(err.message);
  const submit = useMutation({ mutationFn: submitTalent, onSuccess: () => (invalidate(), toast.success("Submitted for approval")), onError });
  const archive = useMutation({ mutationFn: archiveTalent, onSuccess: () => (invalidate(), toast.success("Archived")), onError });
  const restore = useMutation({ mutationFn: restoreTalent, onSuccess: () => (invalidate(), toast.success("Restored to drafts")), onError });
  const remove = useMutation({
    mutationFn: deleteTalent,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["talents", "detail", id] });
      invalidate();
      setToDelete(null);
      toast.success("Showcase deleted");
    },
    onError,
  });

  const stats = data?.stats;
  const needsAttention = data?.items.filter((t) => t.status === "needs_changes" || t.status === "rejected") ?? [];

  const tabs: Array<{ value: Filter; label: string; count?: number }> = [
    { value: "all", label: "All", count: stats?.total },
    { value: "draft", label: "Drafts", count: stats?.drafts },
    { value: "pending_approval", label: "Pending", count: stats?.pending },
    { value: "approved", label: "Published", count: stats?.published },
    { value: "needs_changes", label: "Needs changes", count: (stats?.needsChanges ?? 0) + (stats?.rejected ?? 0) },
    { value: "archived", label: "Archived", count: stats?.archived },
    { value: "school_only", label: "🏫 School only", count: stats?.schoolOnly },
    { value: "public", label: "🌍 Public", count: stats?.public },
  ];

  const matches = (t: TalentCard) => {
    if (filter === "all") return true;
    if (filter === "school_only" || filter === "public") return t.visibility === filter;
    if (filter === "needs_changes") return t.status === "needs_changes" || t.status === "rejected";
    return t.status === (filter as TalentStatus);
  };
  const items = data?.items.filter(matches);

  const actions = (t: TalentCard) => {
    const busy = submit.isPending || archive.isPending || restore.isPending || remove.isPending;
    const editable = t.status === "draft" || t.status === "needs_changes" || t.status === "rejected";
    return (
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
        {t.reviewerFeedback && (t.status === "needs_changes" || t.status === "rejected") && (
          <p className="w-full text-xs text-orange-700 dark:text-orange-300 bg-orange-500/10 rounded-lg px-2.5 py-1.5 mt-1.5 line-clamp-2">💬 {t.reviewerFeedback}</p>
        )}
        {editable && (
          <ActionChip onClick={() => navigate(`/talents/${t.id}/edit`)}>
            <Pencil className="w-3 h-3" /> Edit
          </ActionChip>
        )}
        {editable && (
          <ActionChip primary disabled={busy} onClick={() => submit.mutate(t.id)}>
            {submit.isPending && submit.variables === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {t.status === "draft" ? "Submit" : "Resubmit"}
          </ActionChip>
        )}
        {t.status === "archived" && (
          <ActionChip disabled={busy} onClick={() => restore.mutate(t.id)}>
            <RotateCcw className="w-3 h-3" /> Restore
          </ActionChip>
        )}
        {(t.status === "approved" || t.status === "pending_approval") && (
          <ActionChip disabled={busy} onClick={() => archive.mutate(t.id)}>
            <Archive className="w-3 h-3" /> Archive
          </ActionChip>
        )}
        <ActionChip danger disabled={busy} onClick={() => setToDelete(t)}>
          <Trash2 className="w-3 h-3" /> Delete
        </ActionChip>
        {t.status === "approved" && (
          <span className="ml-auto text-xs text-muted-foreground self-center tabular-nums">
            👁 {formatCount(t.viewCount)} · 💖 {formatCount(t.reactionCount)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-6">
      <section className="cc-hero rounded-[2rem] px-6 py-7 sm:px-8 sm:py-9">
        <HeroDecor />
        <div className="relative flex flex-wrap items-center gap-5">
          {user && <CreatorAvatar creator={{ name: user.name, avatarUrl: user.avatarUrl ?? undefined }} size={72} ring />}
          <div className="flex-1 min-w-[15rem]">
            <p className="text-xs uppercase tracking-widest text-white/60">My Talents</p>
            <h1 className="cc-display text-2xl sm:text-3xl font-extrabold">Hi {user?.name.split(" ")[0] ?? "there"} - your creative space ✨</h1>
            <p className="text-white/70 text-sm mt-1">Drafts, reviews and everything you've published, all in one place.</p>
          </div>
          <div className="flex gap-2">
            {userId && (
              <Link to={`/talents/creators/${userId}`} className="cc-glass rounded-full px-4 py-2 text-sm font-medium">
                View my profile
              </Link>
            )}
            <Link to="/talents/new" className="rounded-full bg-white text-[#1e1b4b] px-4 py-2 text-sm font-bold inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-600" /> New
            </Link>
          </div>
        </div>
      </section>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Showcases" value={stats.total} emoji="🎨" gradient="from-violet-500 to-fuchsia-500" />
          <StatTile label="Total views" value={stats.totalViews} emoji="👁" gradient="from-sky-500 to-teal-400" />
          <StatTile label="Appreciations" value={stats.totalReactions} emoji="💖" gradient="from-rose-400 to-amber-400" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-2">Reaction breakdown</p>
            <div className="grid grid-cols-5 gap-1 text-center">
              {REACTION_ORDER.map((r) => (
                <div key={r} title={REACTION_CONFIG[r].label}>
                  <div className="text-lg" aria-hidden="true">
                    {REACTION_CONFIG[r].emoji}
                  </div>
                  <div className="text-xs font-semibold tabular-nums text-foreground">{formatCount(stats.reactions[r] ?? 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {needsAttention.length > 0 && (
        <div className="rounded-3xl bg-orange-500/10 border border-orange-500/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            ✏️
          </span>
          <div className="flex-1">
            <p className="font-semibold text-orange-800 dark:text-orange-200">
              {needsAttention.length} showcase{needsAttention.length === 1 ? " needs" : "s need"} your attention
            </p>
            <p className="text-sm text-orange-700/90 dark:text-orange-300/90">A reviewer left feedback. Make a few tweaks and resubmit.</p>
          </div>
          <button type="button" onClick={() => setFilter("needs_changes")} className="rounded-full bg-orange-500 text-white px-4 py-2 text-sm font-semibold cursor-pointer">
            Review feedback
          </button>
        </div>
      )}

      <div className="cc-rail -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setFilter(t.value)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              filter === t.value ? "cc-gradient-bg text-white shadow-md" : "bg-secondary text-secondary-foreground hover:bg-muted",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cn("ml-1.5 tabular-nums text-xs", filter === t.value ? "text-white/80" : "opacity-60")}>{t.count}</span>}
          </button>
        ))}
      </div>

      {data && data.items.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="Your stage is waiting"
          body="Share a drawing, a song, a science project - anything you're proud of. A teacher reviews it before anyone else sees it."
          action={
            <Link to="/talents/new" className="inline-flex items-center gap-2 rounded-full cc-gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-md">
              <Sparkles className="w-4 h-4" /> Share your first talent
            </Link>
          }
        />
      ) : items && items.length === 0 ? (
        <EmptyState emoji="🗂️" title="Nothing here" body="No showcases match this filter." />
      ) : (
        <TalentGrid talents={items} loading={isLoading} showStatus renderFooter={actions} />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this showcase permanently?"
        description={`"${toDelete?.title ?? ""}" and all its photos, videos and recordings will be removed for good${toDelete?.status === "approved" ? ", along with its views and appreciations" : ""}. This can't be undone - archive it instead if you might want it back.`}
        confirmLabel="Delete permanently"
        confirmVariant="destructive"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
        }}
        submitting={remove.isPending}
      />
    </div>
  );
}

function ActionChip({ children, onClick, disabled, primary, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-50",
        primary ? "cc-gradient-bg text-white" : danger ? "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300" : "bg-secondary text-secondary-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
