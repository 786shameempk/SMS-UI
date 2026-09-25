import { useRef, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/utils/cn";
import { CATEGORY_CONFIG, VIEW_AFTER_PLAYBACK_SECONDS } from "../constants";
import { formatDuration } from "../hooks";
import type { TalentCategory, TalentMedia } from "../types";
import { MusicNote, Sparkle } from "./Decor";
import { waveform } from "../media";

const BARS = 56;

/**
 * Custom audio player for songs and voice recordings: a vinyl-style disc, a seekable waveform (click
 * anywhere on it) and live equalizer bars while playing. Fires `onMeaningfulPlay` once after real listening.
 */
export default function AudioPlayer({
  media,
  title,
  artist,
  category,
  onMeaningfulPlay,
}: {
  media: TalentMedia;
  title: string;
  artist: string;
  category: TalentCategory;
  onMeaningfulPlay?: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(media.durationSeconds ?? 0);
  const [rate, setRate] = useState(1);
  const listened = useRef(0);
  const lastTick = useRef<number | null>(null);
  const fired = useRef(false);
  const bars = waveform(media.id, BARS);
  const gradient = CATEGORY_CONFIG[category].gradient;
  const progress = duration ? time / duration : 0;

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const skip = (seconds: number) => {
    if (audio.current) audio.current.currentTime = Math.max(0, Math.min(duration, audio.current.currentTime + seconds));
  };

  const cycleRate = () => {
    const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : rate === 1.5 ? 0.75 : 1;
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  return (
    <div className="cc-hero rounded-3xl p-5 sm:p-6">
      <audio
        ref={audio}
        src={media.url}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          lastTick.current = performance.now();
        }}
        onPause={() => {
          setPlaying(false);
          lastTick.current = null;
        }}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setTime(a.currentTime);
          const now = performance.now();
          if (lastTick.current !== null && !a.paused) listened.current += Math.min(1, (now - lastTick.current) / 1000);
          lastTick.current = now;
          if (!fired.current && listened.current >= Math.min(VIEW_AFTER_PLAYBACK_SECONDS, (duration || Infinity) * 0.8)) {
            fired.current = true;
            onMeaningfulPlay?.();
          }
        }}
      />

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Disc */}
        <button type="button" onClick={toggle} className="relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 cursor-pointer" aria-label={playing ? "Pause" : "Play"}>
          <span
            className={cn("absolute inset-0 rounded-full bg-gradient-to-br shadow-2xl shadow-violet-950/60", gradient)}
            style={{ animation: playing ? "spin 6s linear infinite" : undefined }}
          >
            <span className="absolute inset-3 rounded-full border border-white/20" />
            <span className="absolute inset-6 rounded-full border border-white/15" />
            <MusicNote className="absolute top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-white/50" />
          </span>
          <span className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-[#0b1030] border-2 border-white/30 flex items-center justify-center">
            {playing ? <Pause className="w-5 h-5 text-white fill-white" /> : <Play className="w-5 h-5 text-white fill-white ml-0.5" />}
          </span>
          <Sparkle className="cc-sparkle absolute -top-1 -right-1 w-4 h-4 text-amber-300" />
        </button>

        <div className="flex-1 w-full min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="cc-display text-lg font-bold text-white truncate">{media.caption || title}</p>
              <p className="text-sm text-white/70 truncate">{artist}</p>
            </div>
            {playing && (
              <span className="flex items-end gap-[3px] h-5 shrink-0" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="cc-eq-bar w-1 h-full rounded-full bg-teal-300" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            )}
          </div>

          {/* Seekable waveform */}
          <div
            className="relative mt-4 h-14 flex items-center gap-[2px] cursor-pointer select-none"
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") skip(5);
              if (e.key === "ArrowLeft") skip(-5);
              if (e.key === " ") {
                e.preventDefault();
                toggle();
              }
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (audio.current && duration) audio.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
            }}
          >
            {bars.map((v, i) => {
              const played = i / BARS < progress;
              return (
                <span
                  key={i}
                  className={cn("flex-1 rounded-full transition-colors duration-150", played ? "bg-gradient-to-t from-violet-400 to-sky-300" : "bg-white/25")}
                  style={{ height: `${v * 100}%` }}
                />
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-white/75">
            <span className="tabular-nums">{formatDuration(time)}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => skip(-10)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer" aria-label="Back 10 seconds">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button type="button" onClick={toggle} className="w-10 h-10 rounded-full bg-white text-[#1e1b4b] flex items-center justify-center cursor-pointer shadow-lg" aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button type="button" onClick={() => skip(10)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer" aria-label="Forward 10 seconds">
                <RotateCw className="w-4 h-4" />
              </button>
              <button type="button" onClick={cycleRate} className="ml-1 rounded-full px-2 py-1 hover:bg-white/10 font-semibold tabular-nums cursor-pointer" aria-label="Playback speed">
                {rate}×
              </button>
            </div>
            <span className="tabular-nums">{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
