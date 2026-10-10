// Small per-browser conveniences: recently viewed articles and the "Was this helpful?" answers. Nothing here is sent anywhere,
// and the page works if the browser blocks storage.
const RECENT_KEY = "sms-help-recent";
const FEEDBACK_KEY = "sms-help-feedback";
const MAX_RECENT = 6;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the convenience simply does not persist */
  }
}

export const getRecentIds = (): string[] => {
  const ids = read<unknown>(RECENT_KEY, []);
  return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
};

export function rememberArticle(id: string): string[] {
  const next = [id, ...getRecentIds().filter((x) => x !== id)].slice(0, MAX_RECENT);
  write(RECENT_KEY, next);
  return next;
}

export type Helpful = "yes" | "no";

export const getFeedback = (id: string): Helpful | null => {
  const all = read<Record<string, Helpful>>(FEEDBACK_KEY, {});
  return all[id] === "yes" || all[id] === "no" ? all[id] : null;
};

export function saveFeedback(id: string, value: Helpful) {
  write(FEEDBACK_KEY, { ...read<Record<string, Helpful>>(FEEDBACK_KEY, {}), [id]: value });
}
