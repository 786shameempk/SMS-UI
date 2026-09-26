import { CATEGORY_CONFIG } from "../constants";
import type { TalentDetail } from "../types";
import AudioPlayer from "./AudioPlayer";
import { Sparkle } from "./Decor";
import ImageGallery from "./ImageGallery";
import VideoPlayer from "./VideoPlayer";

/** Lays out a showcase's media by kind: videos first (the performance), then the gallery, then recordings.
 *  Text-only work (poems, essays) gets a designed reading card instead. */
export default function MediaShowcase({ talent, onMeaningfulPlay }: { talent: TalentDetail; onMeaningfulPlay: () => void }) {
  const videos = talent.media.filter((m) => m.type === "video");
  const images = talent.media.filter((m) => m.type === "image");
  const audio = talent.media.filter((m) => m.type === "audio");

  if (talent.media.length === 0) {
    const category = CATEGORY_CONFIG[talent.category];
    return (
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${category.gradient} p-8 sm:p-12 min-h-[260px] flex items-center`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.35),transparent_45%)]" />
        <Sparkle className="cc-sparkle absolute top-6 right-8 w-5 h-5 text-white/80" />
        <Sparkle className="cc-sparkle absolute bottom-8 left-10 w-3 h-3 text-white/70 [animation-delay:1.2s]" />
        <blockquote className="relative cc-display text-white text-xl sm:text-2xl leading-relaxed whitespace-pre-line drop-shadow-sm max-w-2xl">
          {talent.description ?? talent.title}
        </blockquote>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {videos.map((v) => (
        <div key={v.id} className="space-y-1.5">
          <VideoPlayer media={v} onMeaningfulPlay={onMeaningfulPlay} />
          {v.caption && <p className="text-sm text-muted-foreground px-1">{v.caption}</p>}
        </div>
      ))}
      {images.length > 0 && <ImageGallery images={images} title={talent.title} />}
      {audio.map((a) => (
        <AudioPlayer key={a.id} media={a} title={talent.title} artist={talent.creator.name} category={talent.category} onMeaningfulPlay={onMeaningfulPlay} />
      ))}
    </div>
  );
}
