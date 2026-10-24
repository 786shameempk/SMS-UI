/** What a visitor badge or invitation QR code carries. The prefix only tells a scanner what it is looking at; the server reads the token. */
export const VISITOR_PASS_PREFIX = "SSV:";

export function visitorPassValue(token: string): string {
  return `${VISITOR_PASS_PREFIX}${token}`;
}
