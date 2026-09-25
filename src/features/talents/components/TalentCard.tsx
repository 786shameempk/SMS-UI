import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { CATEGORY_CONFIG } from "../constants";
import { timeAgo } from "../hooks";
import type { TalentCard as TalentCardData } from "../types";
import { CardSkeleton, CreatorLine, FeaturedRibbon, SectionHeader, StatusBadge, ViewCount, VisibilityBadge } from "./Bits";
import MediaCover from "./MediaCover";
import { ReactionSummary } from "./ReactionBar";

interface TalentCardProps {
  talent: TalentCardData;
  variant?: "grid" | "feature" | "compact";
  /** Show workflow status (My Talents / review queue) instead of public engagement. */
  showStatus?: boolean;
  to?: string;
  className?: string;
  footer?: React.ReactNode;
}

export default function TalentCard({ talent, variant = "grid", showStatus = false, to, className, footer }: TalentCardProps) {
  const navigate = useNavigate();
  const href = to ?? `/talents/${talent.id}`;
  const category = CATEGORY_CONFIG[talent.category];
  const open = () => navigate(href);

  if (variant === "feature") {
    return (
      <article
        onClick={open}
        className={cn("cc-card group relative overflow-hidden rounded-3xl cursor-pointer shadow-lg shadow-indigo-950/10 aspect-[4/5] sm:aspect-[16/11]", className)}
      >
        <MediaCover talent={talent} className="absolute inset-0" showTypeBadge={false} overlay />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1030]/95 via-[#0b1030]/35 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          {talent.isFeatured ? <FeaturedRibbon /> : <span />}
          <VisibilityBadge visibility={talent.visibility} onDark />
        </div>
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 space-y-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white">
            {category.emoji} {category.label}
          </span>
          <Link to={href} onClick={(e) => e.stopPropagation()} className="block">
            <h3 className="cc-display text-xl sm:text-2xl font-bold text-white leading-tight line-clamp-2">{talent.title}</h3>
          </Link>
          <div className="flex items-center justify-between gap-3">
            <CreatorLine creator={talent.creator} schoolName={talent.schoolName} tenantId={talent.tenantId} onDark />
            <div className="flex items-center gap-3 text-xs text-white/80 shrink-0">
              <ReactionSummary reactions={talent.reactions} total={talent.reactionCount} className="[&_span.bg-card]:bg-white/20 [&_span.ring-card]:ring-transparent" />
              <ViewCount count={talent.viewCount} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={open}
      className={cn(
        "cc-card group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card cursor-pointer",
        variant === "compact" ? "w-[220px] sm:w-[240px] shrink-0" : "",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <MediaCover talent={talent} className="absolute inset-0" />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-white">
            <span aria-hidden="true">{category.emoji}</span>
            <span className="truncate max-w-[110px]">{category.label}</span>
          </span>
          {talent.isFeatured && !showStatus ? <FeaturedRibbon /> : <VisibilityBadge visibility={talent.visibility} onDark />}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <Link to={href} onClick={(e) => e.stopPropagation()} className="block">
          <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">{talent.title}</h3>
        </Link>
        <CreatorLine creator={talent.creator} schoolName={variant === "compact" ? undefined : talent.schoolName} tenantId={talent.tenantId} compact />
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          {showStatus ? (
            <>
              {talent.isHidden ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300" title="Hidden by school moderators after a report">
                  🛡️ Hidden
                </span>
              ) : (
                <StatusBadge status={talent.status} />
              )}
              <span>{timeAgo(talent.submittedAt ?? talent.createdAt)}</span>
            </>
          ) : (
            <>
              <ReactionSummary reactions={talent.reactions} total={talent.reactionCount} />
              <span className="flex items-center gap-2.5">
                <ViewCount count={talent.viewCount} />
                <span className="hidden sm:inline">{timeAgo(talent.publishedAt)}</span>
              </span>
            </>
          )}
        </div>
        {footer && <div onClick={(e) => e.stopPropagation()}>{footer}</div>}
      </div>
    </article>
  );
}

/** A titled horizontal rail with scroll buttons on desktop and snap-swipe on touch. */
export function TalentRail({
  emoji,
  title,
  subtitle,
  talents,
  loading,
  action,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
  talents: TalentCardData[] | undefined;
  loading?: boolean;
  action?: React.ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.85, behavior: "smooth" });

  if (!loading && (!talents || talents.length === 0)) return null;

  return (
    <section>
      <SectionHeader
        emoji={emoji}
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex items-center gap-1.5 shrink-0">
            {action}
            <button type="button" onClick={() => scroll(-1)} className="hidden sm:flex w-8 h-8 rounded-full border border-border bg-card items-center justify-center hover:bg-secondary cursor-pointer" aria-label="Scroll left">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => scroll(1)} className="hidden sm:flex w-8 h-8 rounded-full border border-border bg-card items-center justify-center hover:bg-secondary cursor-pointer" aria-label="Scroll right">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />
      <div ref={rail} className="cc-rail -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3.5 overflow-x-auto pb-3 pt-1">
        {loading
          ? Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} className="w-[220px] sm:w-[240px] shrink-0" />)
          : talents!.map((t) => <TalentCard key={t.id} talent={t} variant="compact" />)}
      </div>
    </section>
  );
}

export function TalentGrid({ talents, loading, showStatus, renderFooter }: { talents: TalentCardData[] | undefined; loading?: boolean; showStatus?: boolean; renderFooter?: (t: TalentCardData) => React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {loading
        ? Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)
        : talents?.map((t) => <TalentCard key={t.id} talent={t} showStatus={showStatus} footer={renderFooter?.(t)} />)}
    </div>
  );
}
