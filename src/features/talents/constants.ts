import type { LucideIcon } from "lucide-react";
import {
  Atom,
  Camera,
  Cpu,
  Feather,
  Footprints,
  GraduationCap,
  Mic,
  Music2,
  Palette,
  Scissors,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type {
  TalentCategory,
  TalentReactionType,
  TalentReportReason,
  TalentReviewAction,
  TalentSort,
  TalentStatus,
  TalentVisibility,
} from "./types";

export const MODULE_NAME = "Creative Campus";
export const MODULE_TAGLINE = "Every Talent Deserves to Be Seen.";
export const MODULE_MOTTO = "Discover. Celebrate. Inspire.";

/** Each category owns a gradient (cover art for audio/text-only work, chips, headers) and an emoji. */
export const CATEGORY_CONFIG: Record<TalentCategory, { label: string; emoji: string; icon: LucideIcon; gradient: string; tint: string }> = {
  art: { label: "Art & Painting", emoji: "🎨", icon: Palette, gradient: "from-fuchsia-500 via-purple-500 to-indigo-500", tint: "text-fuchsia-600 bg-fuchsia-500/10" },
  music: { label: "Music & Singing", emoji: "🎵", icon: Music2, gradient: "from-violet-600 via-indigo-500 to-sky-400", tint: "text-violet-600 bg-violet-500/10" },
  dance: { label: "Dance & Performance", emoji: "💃", icon: Footprints, gradient: "from-rose-500 via-pink-500 to-orange-400", tint: "text-rose-600 bg-rose-500/10" },
  voice: { label: "Voice & Spoken Word", emoji: "🎙️", icon: Mic, gradient: "from-indigo-600 via-blue-500 to-cyan-400", tint: "text-indigo-600 bg-indigo-500/10" },
  photography: { label: "Photography", emoji: "📸", icon: Camera, gradient: "from-slate-700 via-indigo-600 to-sky-500", tint: "text-sky-700 bg-sky-500/10" },
  writing: { label: "Poems & Writing", emoji: "✍️", icon: Feather, gradient: "from-amber-400 via-orange-400 to-rose-400", tint: "text-amber-700 bg-amber-500/10" },
  sports: { label: "Sports", emoji: "🏅", icon: Trophy, gradient: "from-emerald-500 via-teal-500 to-sky-500", tint: "text-emerald-700 bg-emerald-500/10" },
  science: { label: "Science Projects", emoji: "🔬", icon: Atom, gradient: "from-teal-500 via-cyan-500 to-blue-500", tint: "text-teal-700 bg-teal-500/10" },
  technology: { label: "Technology", emoji: "💡", icon: Cpu, gradient: "from-blue-600 via-indigo-600 to-violet-600", tint: "text-blue-700 bg-blue-500/10" },
  crafts: { label: "Crafts", emoji: "🧶", icon: Scissors, gradient: "from-orange-400 via-rose-400 to-fuchsia-500", tint: "text-orange-700 bg-orange-500/10" },
  academic: { label: "Academic Achievement", emoji: "🎓", icon: GraduationCap, gradient: "from-indigo-700 via-purple-600 to-amber-400", tint: "text-purple-700 bg-purple-500/10" },
  school_activity: { label: "School Activities", emoji: "🏫", icon: Users, gradient: "from-sky-500 via-teal-400 to-emerald-400", tint: "text-sky-700 bg-sky-500/10" },
  other: { label: "Other Talents", emoji: "✨", icon: Sparkles, gradient: "from-purple-600 via-fuchsia-500 to-amber-400", tint: "text-purple-700 bg-purple-500/10" },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_CONFIG) as TalentCategory[];

/** Positive-only reactions - there's deliberately no dislike, and counts stay secondary in the UI. */
export const REACTION_CONFIG: Record<TalentReactionType, { label: string; emoji: string; color: string }> = {
  like: { label: "Like", emoji: "❤️", color: "text-rose-500" },
  love: { label: "Love", emoji: "💖", color: "text-pink-500" },
  appreciate: { label: "Appreciate", emoji: "👏", color: "text-amber-500" },
  amazing: { label: "Amazing", emoji: "🌟", color: "text-yellow-500" },
  congrats: { label: "Congratulations", emoji: "🎉", color: "text-violet-500" },
};

export const REACTION_ORDER = Object.keys(REACTION_CONFIG) as TalentReactionType[];

export const STATUS_CONFIG: Record<TalentStatus, { label: string; className: string; dot: string }> = {
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-500/12 text-amber-700 dark:text-amber-300", dot: "bg-amber-400" },
  approved: { label: "Published", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  needs_changes: { label: "Needs Changes", className: "bg-orange-500/12 text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  rejected: { label: "Not Approved", className: "bg-rose-500/12 text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  archived: { label: "Archived", className: "bg-slate-500/10 text-slate-500 dark:text-slate-400", dot: "bg-slate-300" },
};

export const VISIBILITY_CONFIG: Record<TalentVisibility, { label: string; short: string; emoji: string; description: string }> = {
  school_only: {
    label: "School Only",
    short: "School",
    emoji: "🏫",
    description: "Only students, teachers and parents at your school can see it.",
  },
  public: {
    label: "Public",
    short: "Public",
    emoji: "🌍",
    description: "Anyone across the platform can discover it - other schools included.",
  },
};

export const SORT_OPTIONS: Array<{ value: TalentSort; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recently added" },
  { value: "most_viewed", label: "Most viewed" },
  { value: "most_appreciated", label: "Most appreciated" },
];

export const REVIEW_ACTION_CONFIG: Record<TalentReviewAction, { label: string; emoji: string; tone: string }> = {
  submitted: { label: "Submitted for review", emoji: "📤", tone: "bg-sky-500" },
  resubmitted: { label: "Resubmitted", emoji: "🔁", tone: "bg-sky-500" },
  approved: { label: "Approved & published", emoji: "✅", tone: "bg-emerald-500" },
  changes_requested: { label: "Changes requested", emoji: "✏️", tone: "bg-orange-500" },
  rejected: { label: "Not approved", emoji: "⛔", tone: "bg-rose-500" },
  archived: { label: "Archived", emoji: "🗄️", tone: "bg-slate-400" },
  featured: { label: "Featured", emoji: "🌟", tone: "bg-amber-400" },
  unfeatured: { label: "Removed from featured", emoji: "☆", tone: "bg-slate-400" },
  hidden: { label: "Hidden after a report", emoji: "🛡️", tone: "bg-rose-500" },
  restored: { label: "Restored", emoji: "♻️", tone: "bg-teal-500" },
};

export const REPORT_REASONS: Array<{ value: TalentReportReason; label: string; hint: string }> = [
  { value: "inappropriate", label: "Inappropriate content", hint: "Not suitable for a school community" },
  { value: "bullying", label: "Bullying or harassment", hint: "Targets or mocks someone" },
  { value: "privacy", label: "Privacy concern", hint: "Shows personal info or someone without consent" },
  { value: "copyright", label: "Not their own work", hint: "Copied or uses someone else's work" },
  { value: "spam", label: "Spam or misleading", hint: "Irrelevant, repeated or misleading" },
  { value: "other", label: "Something else", hint: "Tell us more below" },
];

/** Must match the backend's TalentMediaRules. */
export const MEDIA_LIMITS = {
  maxFiles: 10,
  image: { maxMb: 10, accept: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  video: { maxMb: 100, accept: ["video/mp4", "video/webm", "video/quicktime"] },
  audio: { maxMb: 25, accept: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"] },
};

export const ACCEPT_ATTRIBUTE = [...MEDIA_LIMITS.image.accept, ...MEDIA_LIMITS.video.accept, ...MEDIA_LIMITS.audio.accept, ".m4a", ".mp3"].join(",");

/** Seconds of real playback before a video/audio play counts as a view, and detail-page dwell for others. */
export const VIEW_AFTER_PLAYBACK_SECONDS = 5;
export const VIEW_AFTER_DWELL_MS = 4000;

export const REVIEWER_ROLES = new Set(["superAdmin", "admin", "principal", "teacher"]);
export const ADMIN_ROLES = new Set(["superAdmin", "admin", "principal"]);
export const CREATOR_BLOCKED_ROLES = new Set<string>();
