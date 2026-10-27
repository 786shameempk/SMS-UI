/** The limits the server enforces, repeated here so the form can say so before anything is sent. */
export const MIN_AUTO_CLOSE_SECONDS = 3;
export const MAX_AUTO_CLOSE_SECONDS = 120;
export const DEFAULT_AUTO_CLOSE_SECONDS = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** A link that is safe to open from an advertisement: absolute https with a host, no credentials and nothing a browser would treat as script. */
export function linkProblem(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value) return null;
  if (value.length > 2048) return "The link is longer than 2,048 characters.";
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return "The link cannot contain spaces or control characters.";
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Enter a full link, such as https://example.com/offer.";
  }
  if (parsed.protocol !== "https:") return "Only https:// links are allowed.";
  if (!parsed.hostname) return "The link needs a website address.";
  if (parsed.username || parsed.password) return "The link cannot contain a user name or password.";
  return null;
}

export const isSafeLink = (url: string | null | undefined): url is string => Boolean(url) && linkProblem(url) === null;

export function autoCloseProblem(seconds: number): string | null {
  return Number.isInteger(seconds) && seconds >= MIN_AUTO_CLOSE_SECONDS && seconds <= MAX_AUTO_CLOSE_SECONDS
    ? null
    : `Auto-close must be a whole number from ${MIN_AUTO_CLOSE_SECONDS} to ${MAX_AUTO_CLOSE_SECONDS} seconds.`;
}
