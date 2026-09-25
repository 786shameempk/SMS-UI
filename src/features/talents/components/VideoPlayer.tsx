import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/utils/cn";
import { VIEW_AFTER_PLAYBACK_SECONDS } from "../constants";
import { formatDuration } from "../hooks";
import type { TalentMedia } from "../types";

/**
 * Custom-chrome video player. `onMeaningfulPlay` fires once, after VIEW_AFTER_PLAYBACK_SECONDS of actual
 * playback (accumulated real time, so scrubbing to the end doesn't count as watching).
 */
export default function VideoPlayer({ media, onMeaningfulPlay, className }: { media: TalentMedia; onMeaningfulPlay?: () => void; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(media.durationSeconds ?? 0);
  const [fullscreen, setFullscreen] = useState(false);
  const [chrome, setChrome] = useState(true);
  const watched = useRef(0);
  const lastTick = useRef<number | null>(null);
  const fired = useRef(false);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const onTimeUpdate = () => {
    const v = video.current!;
    setTime(v.currentTime);
    const now = performance.now();
    if (lastTick.current !== null && !v.paused) watched.current += Math.min(1, (now - lastTick.current) / 1000);
    lastTick.current = now;
    if (!fired.current && watched.current >= Math.min(VIEW_AFTER_PLAYBACK_SECONDS, (duration || Infinity) * 0.8)) {
      fired.current = true;
      onMeaningfulPlay?.();
    }
  };

  const nudgeChrome = () => {
    setChrome(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChrome(false), 2500);
  };

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div
      ref={shell}
      className={cn("group relative overflow-hidden rounded-3xl bg-black aspect-video", fullscreen && "rounded-none", className)}
      onMouseMove={nudgeChrome}
      onMouseLeave={() => playing && setChrome(false)}
    >
      <video
        ref={video}
        src={media.url}
        playsInline
        preload="metadata"
        muted={muted}
        className="w-full h-full object-contain cursor-pointer"
        onClick={toggle}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
          lastTick.current = performance.now();
          nudgeChrome();
        }}
        onPause={() => {
          setPlaying(false);
          lastTick.current = null;
          setChrome(true);
        }}
        onEnded={() => {
          setEnded(true);
          setPlaying(false);
          setChrome(true);
        }}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {!playing && (
        <button type="button" onClick={toggle} className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 to-transparent cursor-pointer" aria-label={ended ? "Replay" : "Play video"}>
          <span className="relative w-20 h-20 rounded-full cc-gradient-bg flex items-center justify-center shadow-2xl shadow-violet-900/50">
            <span className="absolute inset-0 rounded-full animate-ping bg-violet-400/30" />
            {ended ? <RotateCcw className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white fill-white ml-1" />}
          </span>
        </button>
      )}

      <div className={cn("absolute inset-x-0 bottom-0 px-4 pb-3 pt-10 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300", chrome || !playing ? "opacity-100" : "opacity-0")}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={(e) => {
            if (video.current) video.current.currentTime = Number(e.target.value);
          }}
          className="cc-range w-full h-4"
          style={{ ["--cc-progress" as string]: `${progress}%` }}
          aria-label="Seek"
        />
        <div className="flex items-center justify-between text-white mt-1">
          <div className="flex items-center gap-2">
            <IconButton onClick={toggle} label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </IconButton>
            <IconButton onClick={() => setMuted((m) => !m)} label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </IconButton>
            <span className="text-xs tabular-nums text-white/85">
              {formatDuration(time)} / {formatDuration(duration)}
            </span>
          </div>
          <IconButton
            onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void shell.current?.requestFullscreen())}
            label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center cursor-pointer" aria-label={label} title={label}>
      {children}
    </button>
  );
}
