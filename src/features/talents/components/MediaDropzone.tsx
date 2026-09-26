import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, CloudUpload, Film, ImageIcon, Mic, Music, Square, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { ACCEPT_ATTRIBUTE, MEDIA_LIMITS } from "../constants";
import type { ComposerMedia } from "../media";
import { formatDuration } from "../hooks";

const TYPE_ICON = { image: ImageIcon, video: Film, audio: Music } as const;

export default function MediaDropzone({
  items,
  onAdd,
  onRemove,
  onMove,
  onCaption,
  disabled,
}: {
  items: ComposerMedia[];
  onAdd: (files: File[]) => void;
  onRemove: (item: ComposerMedia) => void;
  onMove: (key: string, delta: -1 | 1) => void;
  onCaption: (key: string, caption: string) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) onAdd(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all",
          dragging ? "border-violet-500 bg-violet-500/10 scale-[1.01]" : "border-border bg-card",
          disabled && "opacity-60",
        )}
      >
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative">
          <div className="mx-auto w-14 h-14 rounded-2xl cc-gradient-bg flex items-center justify-center shadow-lg shadow-violet-900/25 cc-float">
            <CloudUpload className="w-7 h-7 text-white" />
          </div>
          <p className="cc-display mt-4 text-lg font-bold text-foreground">Drop your photos, videos or recordings</p>
          <p className="text-sm text-muted-foreground mt-1">
            Images up to {MEDIA_LIMITS.image.maxMb} MB · Videos up to {MEDIA_LIMITS.video.maxMb} MB · Audio up to {MEDIA_LIMITS.audio.maxMb} MB · Max {MEDIA_LIMITS.maxFiles} files
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => input.current?.click()}
              className="inline-flex items-center gap-2 rounded-full cc-gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <CloudUpload className="w-4 h-4" />
              Choose files
            </button>
            <VoiceRecorder disabled={disabled} onRecorded={(file) => onAdd([file])} />
          </div>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => {
              onAdd(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const Icon = TYPE_ICON[item.type];
          return (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5"
            >
              <div className="relative w-20 h-16 sm:w-24 sm:h-18 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                {item.type === "image" && <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />}
                {item.type === "video" && <video src={`${item.previewUrl}#t=0.5`} muted preload="metadata" className="w-full h-full object-cover" />}
                {item.type === "audio" && (
                  <div className="w-full h-full cc-gradient-bg flex items-center justify-center">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                )}
                {i === 0 && <span className="absolute top-1 left-1 rounded-md bg-black/55 px-1.5 text-[10px] font-semibold text-white">Cover</span>}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{item.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                  {item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ""}
                  {!item.serverId && <span className="ml-1.5 text-violet-600 dark:text-violet-300">· ready to upload</span>}
                </p>
                <input
                  value={item.caption}
                  onChange={(e) => onCaption(item.key, e.target.value)}
                  maxLength={300}
                  disabled={disabled}
                  placeholder="Add a caption (optional)"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 border-b border-transparent focus:border-violet-400 outline-none py-0.5"
                />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <IconBtn label="Move up" disabled={disabled || i === 0} onClick={() => onMove(item.key, -1)}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </IconBtn>
                <IconBtn label="Move down" disabled={disabled || i === items.length - 1} onClick={() => onMove(item.key, 1)}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </IconBtn>
              </div>
              <IconBtn label="Remove" disabled={disabled} onClick={() => onRemove(item)} danger>
                <Trash2 className="w-4 h-4" />
              </IconBtn>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
        danger ? "hover:bg-rose-500/10 hover:text-rose-600" : "hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Records a voice clip in the browser (MediaRecorder → audio/webm) and hands it over as a File. */
function VoiceRecorder({ onRecorded, disabled }: { onRecorded: (file: File) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const supported = typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;
  if (!supported) return null;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (rec.mimeType || "audio/webm").split(";")[0]!;
        const ext = type.includes("mp4") ? "m4a" : "webm";
        onRecorded(new File(chunks, `voice-recording-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${ext}`, { type }));
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setRecording(true);
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone access was blocked. Allow it in your browser to record.");
    }
  };

  const stop = () => {
    recorder.current?.stop();
    window.clearInterval(timer.current);
    setRecording(false);
  };

  return recording ? (
    <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md cursor-pointer">
      <span className="relative flex w-2.5 h-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-white" />
      </span>
      Recording {formatDuration(seconds)}
      <Square className="w-3.5 h-3.5 fill-current" />
    </button>
  ) : (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void start()}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary cursor-pointer disabled:cursor-not-allowed"
    >
      <Mic className="w-4 h-4 text-rose-500" />
      Record voice
    </button>
  );
}
