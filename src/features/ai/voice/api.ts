import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

/** Speech to text: the text comes back for the user to check before sending. The recording isn't stored. */
export function transcribe(audio: Blob, language?: string): Promise<{ text: string; language: string | null }> {
  const form = new FormData();
  const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  form.append("audio", audio, `recording.${ext}`);
  if (language) form.append("language", language);
  return call(aiHttpClient.post("api/ai/voice/transcribe", form));
}

/** Text to speech (MP3). */
export const speak = (text: string) => call(aiHttpClient.post<Blob>("api/ai/voice/speak", { text }, { responseType: "blob" }));
