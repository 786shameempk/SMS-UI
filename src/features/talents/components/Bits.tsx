import { Link } from "react-router-dom";
import { Eye, Globe2, School, Star } from "lucide-react";
import { cn } from "@/utils/cn";
import { CATEGORY_CONFIG, STATUS_CONFIG, VISIBILITY_CONFIG } from "../constants";
import { formatCount } from "../hooks";
import type { TalentCategory, TalentCreator, TalentStatus, TalentVisibility } from "../types";
import { Sparkle } from "./Decor";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-sky-400",
  "from-fuchsia-500 to-amber-400",
  "from-teal-400 to-indigo-500",
  "from-rose-400 to-purple-500",
  "from-sky-400 to-emerald-400",
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function CreatorAvatar({ creator, size = 36, ring = false, className }: { creator: Pick<TalentCreator, "name" | "avatarUrl">; size?: number; ring?: boolean; className?: string }) {
  const gradient = AVATAR_GRADIENTS[hash(creator.name) % AVATAR_GRADIENTS.length];
  return (
    <span
      className={cn("relative inline-flex shrink-0 rounded-full", ring && "cc-ring-gradient p-[2px]", className)}
      style={{ width: size, height: size }}
    >
      {creator.avatarUrl ? (
        <img src={creator.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <span
          className={cn("w-full h-full rounded-full bg-gradient-to-br text-white font-semibold flex items-center justify-center", gradient)}
          style={{ fontSize: Math.max(10, size * 0.36) }}
        >
          {initials(creator.name)}
        </span>
      )}
    </span>
  );
}

export function CreatorLine({ creator, schoolName, tenantId, compact = false, onDark = false }: { creator: TalentCreator; schoolName?: string; tenantId?: string; compact?: boolean; onDark?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Link to={`/talents/creators/${creator.userId}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
        <CreatorAvatar creator={creator} size={compact ? 26 : 34} />
      </Link>
      <div className="min-w-0 leading-tight">
        <Link
          to={`/talents/creators/${creator.userId}`}
          onClick={(e) => e.stopPropagation()}
          className={cn("block truncate font-medium hover:underline", compact ? "text-xs" : "text-sm", onDark ? "text-white" : "text-foreground")}
        >
          {creator.name}
        </Link>
        <span className={cn("flex items-center gap-1 truncate text-[11px]", onDark ? "text-white/70" : "text-muted-foreground")}>
          <CreatorTypePill type={creator.type} onDark={onDark} />
          {schoolName && tenantId ? (
            <Link to={`/talents/schools/${encodeURIComponent(tenantId)}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline">
              {schoolName}
            </Link>
          ) : (
            schoolName && <span className="truncate">{schoolName}</span>
          )}
        </span>
      </div>
    </div>
  );
}

const CREATOR_TYPE_PILL: Record<TalentCreator["type"], { label: string; light: string; dark: string }> = {
  student: { label: "Student", light: "bg-sky-500/12 text-sky-700 dark:text-sky-300", dark: "bg-sky-300/20 text-sky-200" },
  teacher: { label: "Teacher", light: "bg-amber-500/12 text-amber-700 dark:text-amber-300", dark: "bg-amber-300/20 text-amber-200" },
  parent: { label: "Parent", light: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", dark: "bg-emerald-300/20 text-emerald-200" },
};

export function CreatorTypePill({ type, onDark = false }: { type: TalentCreator["type"]; onDark?: boolean }) {
  const config = CREATOR_TYPE_PILL[type] ?? CREATOR_TYPE_PILL.student;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide shrink-0",
        onDark ? config.dark : config.light,
      )}
    >
      {config.label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TalentStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", config.className, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot, status === "pending_approval" && "animate-pulse")} />
      {config.label}
    </span>
  );
}

export function VisibilityBadge({ visibility, onDark = false, className }: { visibility: TalentVisibility; onDark?: boolean; className?: string }) {
  const Icon = visibility === "public" ? Globe2 : School;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        onDark ? "bg-black/35 text-white backdrop-blur-md" : visibility === "public" ? "bg-teal-500/12 text-teal-700 dark:text-teal-300" : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
        className,
      )}
      title={VISIBILITY_CONFIG[visibility].description}
    >
      <Icon className="w-3 h-3" />
      {VISIBILITY_CONFIG[visibility].label}
    </span>
  );
}

export function CategoryChip({ category, active, onClick, count, size = "md" }: { category: TalentCategory; active?: boolean; onClick?: () => void; count?: number; size?: "sm" | "md" }) {
  const config = CATEGORY_CONFIG[category];
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-all",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-sm",
        onClick && "cursor-pointer hover:-translate-y-0.5",
        active ? cn("bg-gradient-to-r text-white shadow-md", config.gradient) : cn(config.tint, onClick && "hover:shadow-sm"),
      )}
    >
      <span aria-hidden="true">{config.emoji}</span>
      {config.label}
      {count !== undefined && <span className={cn("text-[11px] tabular-nums", active ? "text-white/80" : "opacity-60")}>{count}</span>}
    </Comp>
  );
}

export function ViewCount({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", className)} title={`${count.toLocaleString()} views`}>
      <Eye className="w-3.5 h-3.5" />
      {formatCount(count)}
      <span className="sr-only">views</span>
    </span>
  );
}

export function FeaturedRibbon({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full cc-warm-bg px-2 py-0.5 text-[11px] font-semibold text-white shadow-md", className)}>
      <Star className="w-3 h-3 fill-current" />
      Featured
    </span>
  );
}

export function SectionHeader({ emoji, title, subtitle, action }: { emoji?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="cc-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          {emoji && <span aria-hidden="true">{emoji}</span>}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ emoji = "✨", title, body, action }: { emoji?: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Sparkle className="cc-sparkle absolute top-6 left-[20%] w-4 h-4 text-violet-400" />
      <Sparkle className="cc-sparkle absolute bottom-8 right-[18%] w-3 h-3 text-sky-400 [animation-delay:1s]" />
      <div className="text-4xl mb-3" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="cc-display text-lg font-bold text-foreground">{title}</h3>
      {body && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function StatTile({ label, value, emoji, gradient }: { label: string; value: number | string; emoji: string; gradient: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className={cn("absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br opacity-20 blur-xl", gradient)} />
      <div className="text-xl" aria-hidden="true">
        {emoji}
      </div>
      <div className="cc-display text-2xl font-bold text-foreground tabular-nums mt-1">{typeof value === "number" ? formatCount(value) : value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
      <div className="aspect-[4/3] cc-shimmer" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 w-3/4 rounded cc-shimmer" />
        <div className="h-3 w-1/2 rounded cc-shimmer" />
      </div>
    </div>
  );
}
