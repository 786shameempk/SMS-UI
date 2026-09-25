import toast from "react-hot-toast";
import { MEDIA_LIMITS } from "./constants";
import type { TalentMediaType } from "./types";

/** Deterministic pseudo-waveform so an audio card always draws the same bars. */
export function waveform(seed: string, bars: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: bars }, (_, i) => {
    h = Math.imul(h ^ (i + 1), 2654435761);
    const noise = ((h >>> 0) % 1000) / 1000;
    const envelope = Math.sin((i / (bars - 1)) * Math.PI) * 0.6 + 0.4;
    return Math.max(0.15, noise * envelope);
  });
}

/** A media item in the composer: either already uploaded (server id) or staged locally awaiting upload. */
export interface ComposerMedia {
  key: string;
  type: TalentMediaType;
  previewUrl: string;
  name: string;
  sizeBytes: number;
  caption: string;
  durationSeconds?: number;
  /** Set once stored on the server. */
  serverId?: string;
  /** Set while only local. */
  file?: File;
}

export function classify(file: File): TalentMediaType | null {
  const type = file.type.split(";")[0]!.toLowerCase();
  if (MEDIA_LIMITS.image.accept.includes(type)) return "image";
  if (MEDIA_LIMITS.video.accept.includes(type)) return "video";
  if (MEDIA_LIMITS.audio.accept.includes(type) || /\.(m4a|mp3)$/i.test(file.name)) return "audio";
  return null;
}

/** Reads duration client-side so the player can show it before metadata loads. */
function probeDuration(url: string, type: TalentMediaType): Promise<number | undefined> {
  if (type === "image") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const el = document.createElement(type === "video" ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : undefined);
    el.onerror = () => resolve(undefined);
    el.src = url;
  });
}

export async function stageFiles(files: File[], existingCount: number): Promise<ComposerMedia[]> {
  const staged: ComposerMedia[] = [];
  for (const file of files) {
    if (existingCount + staged.length >= MEDIA_LIMITS.maxFiles) {
      toast.error(`A showcase can hold up to ${MEDIA_LIMITS.maxFiles} files.`);
      break;
    }
    const type = classify(file);
    if (!type) {
      toast.error(`"${file.name}" isn't a supported image, video or audio format.`);
      continue;
    }
    const maxMb = MEDIA_LIMITS[type].maxMb;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`"${file.name}" is over the ${maxMb} MB limit for ${type}.`);
      continue;
    }
    const previewUrl = URL.createObjectURL(file);
    staged.push({
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      type,
      previewUrl,
      name: file.name,
      sizeBytes: file.size,
      caption: "",
      durationSeconds: await probeDuration(previewUrl, type),
      file,
    });
  }
  return staged;
}
