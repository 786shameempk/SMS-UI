import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Volume2, VolumeX } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { speak, transcribe } from "../../voice/api";

const MAX_SECONDS = 60;

/** The best recording format this browser supports (Safari records mp4, others webm/ogg). */
function recorderType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t));
}

/**
 * Hold-free voice input: tap to record (up to a minute), tap again to stop; the transcript is handed back for the user
 * to read and edit before sending. Nothing is sent automatically.
 */
export function VoiceInputButton({ onText, disabled }: { onText: (text: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);

  const cleanup = () => {
    if (timer.current) window.clearTimeout(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    recorder.current = null;
  };
  useEffect(() => () => cleanup(), []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = recorderType();
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = async () => {
        cleanup();
        const blob = new Blob(chunks, { type: (rec.mimeType || type || "audio/webm").split(";")[0] });
        if (blob.size === 0) return setState("idle");
        setState("transcribing");
        try {
          const { text } = await transcribe(blob);
          if (text.trim()) onText(text.trim());
          else toast.error("Couldn't hear anything. Try again closer to the microphone.");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't transcribe that.");
        } finally {
          setState("idle");
        }
      };
      recorder.current = rec;
      rec.start();
      setState("recording");
      timer.current = window.setTimeout(() => rec.state === "recording" && rec.stop(), MAX_SECONDS * 1000);
    } catch {
      toast.error("Microphone access was blocked. Allow it in the browser to use voice.");
      setState("idle");
    }
  };

  if (state === "transcribing") {
    return (
      <Button type="button" variant="outline" size="icon" disabled aria-label="Transcribing">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }
  return state === "recording" ? (
    <Button type="button" variant="outline" size="icon" onClick={() => recorder.current?.stop()} aria-label="Stop recording" className="border-destructive text-destructive">
      <Square className="h-4 w-4" />
    </Button>
  ) : (
    <Button type="button" variant="outline" size="icon" onClick={() => void start()} disabled={disabled} aria-label="Speak your question">
      <Mic className="h-4 w-4" />
    </Button>
  );
}

/** Reads one answer aloud; tap again to stop. */
export function ReadAloudButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  const stop = () => {
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setState("idle");
  };
  useEffect(() => () => stop(), []);

  const play = async () => {
    setState("loading");
    try {
      const blob = await speak(text.slice(0, 1500));
      url.current = URL.createObjectURL(blob);
      const a = new Audio(url.current);
      audio.current = a;
      a.onended = stop;
      await a.play();
      setState("playing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that aloud.");
      stop();
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-xs" onClick={() => (state === "idle" ? void play() : stop())} disabled={state === "loading"}>
      {state === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === "playing" ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      {state === "playing" ? "Stop" : "Read aloud"}
    </Button>
  );
}
