import { Film, Images, Mic, Play } from "lucide-react";
import { cn } from "@/utils/cn";
import { CATEGORY_CONFIG } from "../constants";
import type { TalentCard } from "../types";
import { waveform } from "../media";
import { MusicNote, Sparkle } from "./Decor";

/** Card artwork: the cover image, a video poster frame, designed audio art, or designed text art. */
/** `overlay` = the caller lays its own title over the cover, so text art drops its excerpt to avoid a clash. */
export default function MediaCover({ talent, className, showTypeBadge = true, overlay = false }: { talent: TalentCard; className?: string; showTypeBadge?: boolean; overlay?: boolean }) {
  const category = CATEGORY_CONFIG[talent.category];
  const cover = talent.cover;
  const hasVideo = talent.mediaTypes.includes("video");
  const hasAudio = talent.mediaTypes.includes("audio");

  return (
    <div className={cn("relative overflow-hidden bg-slate-900", className)}>
      {cover?.type === "image" && (
        <img src={cover.url} alt="" loading="lazy" decoding="async" className="cc-card-media absolute inset-0 w-full h-full object-cover" />
      )}
      {cover?.type === "video" && (
        // #t=0.5 asks the browser for a poster frame without autoplaying anything.
        <video src={`${cover.url}#t=0.5`} preload="metadata" muted playsInline className="cc-card-media absolute inset-0 w-full h-full object-cover" />
      )}
      {cover?.type === "audio" && <AudioArt talent={talent} />}
      {!cover && <TextArt talent={talent} overlay={overlay} />}

      {/* Legibility gradient for overlaid chips. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />

      {cover?.type === "video" && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </span>
        </span>
      )}

      {showTypeBadge && talent.mediaCount > 0 && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2 py-0.5 text-[11px] text-white">
          {hasVideo ? <Film className="w-3 h-3" /> : hasAudio && cover?.type === "audio" ? <Mic className="w-3 h-3" /> : <Images className="w-3 h-3" />}
          {talent.mediaCount > 1 ? talent.mediaCount : hasVideo ? "Video" : cover?.type === "audio" ? "Audio" : "Photo"}
        </span>
      )}
      <span className="sr-only">{category.label}</span>
    </div>
  );
}

function AudioArt({ talent }: { talent: TalentCard }) {
  const bars = waveform(talent.id, 28);
  const category = CATEGORY_CONFIG[talent.category];
  return (
    <div className={cn("absolute inset-0 bg-gradient-to-br flex items-center justify-center", category.gradient)}>
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
      <MusicNote className="absolute top-3 left-3 w-6 h-6 text-white/40" />
      <Sparkle className="absolute top-5 right-6 w-3 h-3 text-white/70" />
      <div className="flex items-end gap-[3px] h-1/2 px-6 w-full justify-center">
        {bars.map((v, i) => (
          <span key={i} className="w-[5px] rounded-full bg-white/85" style={{ height: `${v * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function TextArt({ talent, overlay }: { talent: TalentCard; overlay: boolean }) {
  const category = CATEGORY_CONFIG[talent.category];
  if (overlay) {
    return (
      <div className={cn("absolute inset-0 bg-gradient-to-br", category.gradient)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.35),transparent_45%)]" />
        <span className="absolute right-6 top-6 text-6xl opacity-80 drop-shadow-lg" aria-hidden="true">
          {category.emoji}
        </span>
      </div>
    );
  }
  return (
    <div className={cn("absolute inset-0 bg-gradient-to-br p-5 flex flex-col justify-center", category.gradient)}>
      <span className="text-3xl mb-2" aria-hidden="true">
        {category.emoji}
      </span>
      <p className="cc-display text-white text-sm sm:text-base leading-snug line-clamp-4 italic drop-shadow">
        {talent.description ? `“${talent.description}”` : talent.title}
      </p>
    </div>
  );
}
