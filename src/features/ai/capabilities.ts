import { useQuery } from "@tanstack/react-query";
import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { AI_MOCK_ENABLED } from "./assistant/api";

/** AiService feature ids (AiFeatures on the backend). */
export type AiFeatureKey =
  | "chat"
  | "parent-assistant"
  | "study-assistant"
  | "generate-questions"
  | "generate-exam"
  | "generate-worksheet"
  | "generate-lesson-plan"
  | "generate-homework"
  | "report-card-comment"
  | "analyze-exam"
  | "analyze-performance"
  | "upload-document"
  | "view-usage"
  | "analytics"
  | "generate-notification"
  | "translate"
  | "explain-insight"
  | "learning-profile"
  | "voice"
  | "author-content"
  | "review-content"
  | "publish-content";

export interface AiCapabilities {
  chat: boolean;
  streaming: boolean;
  generation: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
  embeddings: boolean;
  semanticSearch: boolean;
  translation: boolean;
  vision: boolean;
  voice: boolean;
  speechToText: boolean;
  textToSpeech: boolean;
}

/** allowed = the role may use it here; available = allowed and the configured AI providers support it. */
export interface FeatureAvailability {
  allowed: boolean;
  available: boolean;
}

export interface CapabilitiesResponse {
  provider: string;
  embeddingsProvider: string;
  capabilities: AiCapabilities;
  features: Partial<Record<AiFeatureKey, FeatureAvailability>>;
  /** Languages offered for drafting and translation. */
  languages: string[];
}

const NONE: AiCapabilities = {
  chat: false, streaming: false, generation: false, structuredOutput: false, toolCalling: false, embeddings: false,
  semanticSearch: false, translation: false, vision: false, voice: false, speechToText: false, textToSpeech: false,
};

/** Demo mode (no AiService): only the labelled demo chat works. */
const DEMO: CapabilitiesResponse = {
  provider: "Demo",
  embeddingsProvider: "Demo",
  capabilities: { ...NONE, chat: true, streaming: true },
  features: { chat: { allowed: true, available: true } },
  languages: ["English"],
};

/**
 * Anything that isn't a capabilities object (an older AiService, a proxy's HTML error page) reads as "no AI" instead
 * of crashing: the launcher using this sits in the app shell, so a bad answer must never take down every page.
 */
export function normalizeCapabilities(raw: unknown): CapabilitiesResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { provider: "", embeddingsProvider: "", capabilities: NONE, features: {}, languages: ["English"] };
  const r = raw as Partial<CapabilitiesResponse>;
  return {
    provider: typeof r.provider === "string" ? r.provider : "",
    embeddingsProvider: typeof r.embeddingsProvider === "string" ? r.embeddingsProvider : "",
    capabilities: { ...NONE, ...(r.capabilities && typeof r.capabilities === "object" ? r.capabilities : {}) },
    features: r.features && typeof r.features === "object" && !Array.isArray(r.features) ? r.features : {},
    languages: Array.isArray(r.languages) && r.languages.length > 0 ? r.languages : ["English"],
  };
}

export async function getAiCapabilities(): Promise<CapabilitiesResponse> {
  if (AI_MOCK_ENABLED) return DEMO;
  try {
    return normalizeCapabilities((await aiHttpClient.get<unknown>("api/ai/capabilities")).data);
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export const AI_CAPABILITIES_KEY = ["ai", "capabilities"] as const;

/**
 * The backend's answer to "what AI can this user use here?". While it loads, or if AiService is unreachable, every
 * feature reads as unavailable: features are offered only when the backend has confirmed them.
 */
export function useAiCapabilities() {
  const signedIn = useAuthStore((s) => Boolean(s.token));
  const tenant = useAuthStore((s) => s.activeTenantId);
  // What AI a login may use depends on who it is, so the answer is cached per user, not just per school.
  const userId = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: [...AI_CAPABILITIES_KEY, tenant, userId],
    queryFn: getAiCapabilities,
    enabled: signedIn,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const data = query.data;
  return {
    ...query,
    capabilities: data?.capabilities ?? NONE,
    languages: data?.languages ?? ["English"],
    /** Offer the feature: role allows it and the provider supports it. */
    can: (feature: AiFeatureKey) => Boolean(data?.features?.[feature]?.available),
    /** The role may use it, whatever the provider supports (for parts of a feature that need no model). */
    allowed: (feature: AiFeatureKey) => Boolean(data?.features?.[feature]?.allowed),
    /** The role allows it but the AI provider does not support it (show a "not available" state, not nothing). */
    unsupported: (feature: AiFeatureKey) => Boolean(data?.features?.[feature]?.allowed && !data.features[feature]?.available),
  };
}
